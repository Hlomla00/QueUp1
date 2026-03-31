package com.queup.kiosk

import android.content.Context
import android.util.Log
import androidx.room.*
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreSettings
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.*
import java.util.UUID

/**
 * FirestoreSync — Offline-first queue sync with Room DB cache.
 *
 * Architecture:
 *  • Room DB acts as local cache (tickets survive offline)
 *  • When online: syncs pending tickets to Firestore
 *  • When offline: stores to Room, marks as PENDING_SYNC
 *  • Background coroutine retries sync every 30 seconds
 */

// ── Room Entity ───────────────────────────────────────────────────────────────
@Entity(tableName = "pending_tickets")
data class PendingTicket(
    @PrimaryKey val localId: String = UUID.randomUUID().toString(),
    val branchId: String,
    val branchName: String,
    val ticketNumber: String,
    val citizenName: String,
    val citizenPhone: String,
    val serviceType: String,
    val serviceLabel: String,
    val estimatedWaitMinutes: Int,
    val tfliteWaitPrediction: Float,
    val position: Int,
    val issuedAt: Long = System.currentTimeMillis(),
    val syncStatus: String = "PENDING", // PENDING | SYNCED | FAILED
    val firestoreId: String? = null,
)

// ── Room DAO ──────────────────────────────────────────────────────────────────
@Dao
interface PendingTicketDao {
    @Query("SELECT * FROM pending_tickets WHERE syncStatus = 'PENDING' ORDER BY issuedAt ASC")
    suspend fun getPending(): List<PendingTicket>

    @Query("SELECT * FROM pending_tickets ORDER BY issuedAt DESC LIMIT 50")
    suspend fun getRecent(): List<PendingTicket>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(ticket: PendingTicket)

    @Query("UPDATE pending_tickets SET syncStatus = :status, firestoreId = :firestoreId WHERE localId = :localId")
    suspend fun updateSyncStatus(localId: String, status: String, firestoreId: String?)

    @Query("DELETE FROM pending_tickets WHERE syncStatus = 'SYNCED' AND issuedAt < :before")
    suspend fun deleteOldSynced(before: Long)
}

// ── Room Database ─────────────────────────────────────────────────────────────
@Database(entities = [PendingTicket::class], version = 1, exportSchema = false)
abstract class QueUpDatabase : RoomDatabase() {
    abstract fun pendingTicketDao(): PendingTicketDao

    companion object {
        @Volatile private var INSTANCE: QueUpDatabase? = null

        fun getInstance(context: Context): QueUpDatabase =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    QueUpDatabase::class.java,
                    "queup_kiosk_db"
                ).build().also { INSTANCE = it }
            }
    }
}

// ── FirestoreSync ─────────────────────────────────────────────────────────────
class FirestoreSync(context: Context) {

    companion object {
        private const val TAG = "FirestoreSync"
        private const val SYNC_INTERVAL_MS = 30_000L
        private const val COLLECTION_TICKETS = "queueTickets"
        private const val COLLECTION_BRANCHES = "branches"
    }

    private val db = QueUpDatabase.getInstance(context)
    private val dao = db.pendingTicketDao()
    private val firestore: FirebaseFirestore
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    init {
        // Enable Firestore offline persistence
        val settings = FirebaseFirestoreSettings.Builder()
            .setPersistenceEnabled(true)
            .build()
        firestore = FirebaseFirestore.getInstance().apply {
            firestoreSettings = settings
        }
    }

    // ── Issue ticket (offline-first) ─────────────────────────────────────────
    suspend fun issueTicket(ticket: PendingTicket): String {
        // Always save locally first
        dao.insert(ticket)
        Log.d(TAG, "Ticket saved locally: ${ticket.ticketNumber}")

        // Attempt immediate Firestore sync
        return try {
            val firestoreId = syncTicketToFirestore(ticket)
            dao.updateSyncStatus(ticket.localId, "SYNCED", firestoreId)
            Log.i(TAG, "Ticket synced to Firestore: $firestoreId")
            firestoreId
        } catch (e: Exception) {
            Log.w(TAG, "Offline — will retry later: ${e.message}")
            ticket.localId // Return local ID as fallback
        }
    }

    // ── Sync a single ticket to Firestore ────────────────────────────────────
    private suspend fun syncTicketToFirestore(ticket: PendingTicket): String =
        suspendCancellableCoroutine { cont ->
            val data = hashMapOf(
                "branchId" to ticket.branchId,
                "branchName" to ticket.branchName,
                "ticketNumber" to ticket.ticketNumber,
                "citizenName" to ticket.citizenName,
                "citizenPhone" to ticket.citizenPhone,
                "serviceType" to ticket.serviceType,
                "serviceLabel" to ticket.serviceLabel,
                "status" to "WAITING",
                "position" to ticket.position,
                "estimatedWaitMinutes" to ticket.estimatedWaitMinutes,
                "tfliteWaitPrediction" to ticket.tfliteWaitPrediction,
                "issuedAt" to com.google.firebase.Timestamp(ticket.issuedAt / 1000, 0),
                "calledAt" to null,
                "completedAt" to null,
                "source" to "android",
                "redirectedTo" to null,
                "notified" to false,
            )

            firestore.collection(COLLECTION_TICKETS)
                .add(data)
                .addOnSuccessListener { ref -> cont.resume(ref.id) {} }
                .addOnFailureListener { e -> cont.resumeWithException(e) }
        }

    // ── Update branch queue counter ───────────────────────────────────────────
    fun incrementBranchQueue(branchId: String) {
        firestore.collection(COLLECTION_BRANCHES).document(branchId)
            .update("currentQueue", com.google.firebase.firestore.FieldValue.increment(1))
            .addOnFailureListener { Log.w(TAG, "Branch queue increment failed: ${it.message}") }
    }

    // ── Background sync loop ─────────────────────────────────────────────────
    fun startSyncLoop() {
        scope.launch {
            while (isActive) {
                retryPendingTickets()
                cleanupOldRecords()
                delay(SYNC_INTERVAL_MS)
            }
        }
        Log.i(TAG, "Background sync loop started")
    }

    private suspend fun retryPendingTickets() {
        val pending = dao.getPending()
        if (pending.isEmpty()) return
        Log.d(TAG, "Retrying ${pending.size} pending tickets")
        for (ticket in pending) {
            try {
                val id = syncTicketToFirestore(ticket)
                dao.updateSyncStatus(ticket.localId, "SYNCED", id)
                Log.i(TAG, "Retry succeeded: ${ticket.ticketNumber}")
            } catch (e: Exception) {
                Log.w(TAG, "Retry failed for ${ticket.ticketNumber}: ${e.message}")
            }
        }
    }

    private suspend fun cleanupOldRecords() {
        val oneDayAgo = System.currentTimeMillis() - 86_400_000L
        dao.deleteOldSynced(oneDayAgo)
    }

    fun stopSyncLoop() {
        scope.cancel()
    }
}
