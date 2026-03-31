package com.queup.kiosk

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

// ── QueUp Brand colours ────────────────────────────────────────────────────────
val QueUpBlack = Color(0xFF0A0A0A)
val QueUpLime = Color(0xFFC4F135)
val QueUpCard = Color(0xFF1A1A1A)
val QueUpBorder = Color(0xFF2A2A2A)

// ── Service category model ────────────────────────────────────────────────────
data class ServiceCategory(
    val id: String,
    val label: String,
    val icon: @Composable () -> Unit,
    val docs: List<String>,
)

val SERVICE_CATEGORIES = listOf(
    ServiceCategory("smart_id", "Smart ID Card", { Icon(Icons.Default.CreditCard, null) },
        listOf("Birth Certificate", "2x ID Photos", "R140 fee (replacement)")),
    ServiceCategory("passport", "Passport", { Icon(Icons.Default.AirplanemodeActive, null) },
        listOf("Birth Certificate", "Current Passport", "4x Photos", "R400 fee")),
    ServiceCategory("birth_cert", "Birth Certificate", { Icon(Icons.Default.ChildCare, null) },
        listOf("Parent IDs", "Marriage Certificate")),
    ServiceCategory("marriage_cert", "Marriage Certificate", { Icon(Icons.Default.Favorite, null) },
        listOf("Both IDs", "Lobola letter (if applicable)")),
    ServiceCategory("drivers_license", "Driver's Licence", { Icon(Icons.Default.DirectionsCar, null) },
        listOf("Current Licence", "ID", "Eye test")),
    ServiceCategory("grant_application", "SASSA Grant", { Icon(Icons.Default.AccountBalance, null) },
        listOf("ID", "Bank Statement", "Medical (disability)")),
)

/**
 * KioskActivity — Full-screen kiosk UI for QueUp Android tablet.
 *
 * Flow:
 *  STEP 1: Service category selection grid
 *  STEP 2: Phone number entry (for digital ticket delivery)
 *  STEP 3: TFLite inference → ticket issuance → thermal print
 *  STEP 4: Success screen with ticket details
 *
 * Features:
 *  • Full-screen kiosk mode (no status/nav bar)
 *  • TFLite offline wait prediction
 *  • Thermal printer via USB-OTG (ESC/POS)
 *  • Firestore sync with Room DB offline cache
 */
@SuppressLint("CustomSplashScreen")
class KioskActivity : ComponentActivity() {

    private lateinit var waitPredictor: WaitPredictor
    private lateinit var thermalPrinter: ThermalPrinter
    private lateinit var firestoreSync: FirestoreSync

    // Branch configuration — set via intent or build config
    private val branchId = "home_affairs_bellville"
    private val branchName = "Home Affairs Bellville"
    private val department = "Home Affairs"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        enableKioskMode()

        waitPredictor = WaitPredictor(this)
        thermalPrinter = ThermalPrinter(this)
        firestoreSync = FirestoreSync(this)

        // Load TFLite model in background
        waitPredictor.load()
        thermalPrinter.connect()
        firestoreSync.startSyncLoop()

        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(
                    background = QueUpBlack,
                    surface = QueUpCard,
                    primary = QueUpLime,
                    onPrimary = QueUpBlack,
                )
            ) {
                KioskScreen(
                    branchName = branchName,
                    waitPredictor = waitPredictor,
                    thermalPrinter = thermalPrinter,
                    firestoreSync = firestoreSync,
                    branchId = branchId,
                )
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        waitPredictor.close()
        thermalPrinter.disconnect()
        firestoreSync.stopSyncLoop()
    }

    private fun enableKioskMode() {
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        )
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Composable UI
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun KioskScreen(
    branchName: String,
    waitPredictor: WaitPredictor,
    thermalPrinter: ThermalPrinter,
    firestoreSync: FirestoreSync,
    branchId: String,
) {
    val scope = rememberCoroutineScope()
    var step by remember { mutableIntStateOf(1) }
    var selectedService by remember { mutableStateOf<ServiceCategory?>(null) }
    var phoneNumber by remember { mutableStateOf("") }
    var citizenName by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var issuedTicket by remember { mutableStateOf<PendingTicket?>(null) }
    var tflitePrediction by remember { mutableStateOf<Float?>(null) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(QueUpBlack)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Header
            KioskHeader(branchName = branchName)

            // Content area
            AnimatedContent(targetState = step, label = "kiosk_step") { currentStep ->
                when (currentStep) {
                    1 -> ServiceSelectionStep(
                        onServiceSelected = { service ->
                            selectedService = service
                            step = 2
                        }
                    )
                    2 -> PhoneEntryStep(
                        selectedService = selectedService,
                        citizenName = citizenName,
                        phoneNumber = phoneNumber,
                        onNameChange = { citizenName = it },
                        onPhoneChange = { phoneNumber = it },
                        onBack = { step = 1 },
                        onSubmit = {
                            scope.launch {
                                isLoading = true
                                // TFLite inference
                                val cal = Calendar.getInstance()
                                val hour = cal.get(Calendar.HOUR_OF_DAY)
                                val dow = cal.get(Calendar.DAY_OF_WEEK) - 1
                                val queueSize = 15 // fetch real value in prod
                                tflitePrediction = waitPredictor.predict(hour, dow, queueSize)

                                // Issue ticket
                                val ticket = PendingTicket(
                                    branchId = branchId,
                                    branchName = branchName,
                                    ticketNumber = generateTicketNumber(),
                                    citizenName = citizenName.ifBlank { "Citizen" },
                                    citizenPhone = phoneNumber,
                                    serviceType = selectedService!!.id,
                                    serviceLabel = selectedService!!.label,
                                    estimatedWaitMinutes = tflitePrediction!!.toInt(),
                                    tfliteWaitPrediction = tflitePrediction!!,
                                    position = queueSize + 1,
                                )

                                firestoreSync.issueTicket(ticket)

                                // Print thermal ticket
                                thermalPrinter.printTicket(
                                    ThermalPrinter.PrintableTicket(
                                        ticketNumber = ticket.ticketNumber,
                                        branchName = branchName,
                                        serviceLabel = selectedService!!.label,
                                        citizenName = ticket.citizenName,
                                        citizenPhone = phoneNumber,
                                        position = ticket.position,
                                        estimatedWaitMinutes = ticket.estimatedWaitMinutes,
                                        issuedTime = SimpleDateFormat("HH:mm", Locale.getDefault())
                                            .format(Date()),
                                    )
                                )

                                issuedTicket = ticket
                                isLoading = false
                                step = 3
                            }
                        }
                    )
                    3 -> SuccessStep(
                        ticket = issuedTicket,
                        tflitePrediction = tflitePrediction,
                        onNewTicket = {
                            selectedService = null
                            phoneNumber = ""
                            citizenName = ""
                            issuedTicket = null
                            tflitePrediction = null
                            step = 1
                        }
                    )
                }
            }
        }

        // Loading overlay
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.7f)),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    CircularProgressIndicator(color = QueUpLime, strokeWidth = 3.dp)
                    Text("Processing with TFLite AI...", color = Color.White.copy(alpha = 0.7f))
                }
            }
        }
    }
}

@Composable
fun KioskHeader(branchName: String) {
    val time = remember { mutableStateOf(currentTime()) }
    LaunchedEffect(Unit) {
        while (true) {
            kotlinx.coroutines.delay(60_000)
            time.value = currentTime()
        }
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF111111))
            .padding(horizontal = 32.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Que", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
            Text("Up", color = QueUpLime, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
        }
        Text(branchName, color = Color.White.copy(alpha = 0.6f), fontSize = 14.sp)
        Text(time.value, color = QueUpLime, fontSize = 14.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun ServiceSelectionStep(onServiceSelected: (ServiceCategory) -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        Text(
            "Select Your Service",
            color = Color.White,
            fontSize = 32.sp,
            fontWeight = FontWeight.ExtraBold
        )
        Text(
            "Touch a service to get your queue ticket",
            color = Color.White.copy(alpha = 0.5f),
            fontSize = 16.sp
        )

        LazyVerticalGrid(
            columns = GridCells.Fixed(3),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(SERVICE_CATEGORIES) { service ->
                ServiceCard(service = service, onClick = { onServiceSelected(service) })
            }
        }
    }
}

@Composable
fun ServiceCard(service: ServiceCategory, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1.2f)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = QueUpCard),
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(20.dp),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(QueUpLime.copy(alpha = 0.15f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                CompositionLocalProvider(LocalContentColor provides QueUpLime) {
                    service.icon()
                }
            }
            Text(service.label, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
        }
    }
}

@Composable
fun PhoneEntryStep(
    selectedService: ServiceCategory?,
    citizenName: String,
    phoneNumber: String,
    onNameChange: (String) -> Unit,
    onPhoneChange: (String) -> Unit,
    onBack: () -> Unit,
    onSubmit: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(64.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(selectedService?.label ?: "", color = QueUpLime, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        Text("Enter Your Details", color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.ExtraBold)

        Spacer(Modifier.height(8.dp))

        OutlinedTextField(
            value = citizenName,
            onValueChange = onNameChange,
            label = { Text("Full Name (optional)") },
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = QueUpLime,
                focusedLabelColor = QueUpLime,
            )
        )

        OutlinedTextField(
            value = phoneNumber,
            onValueChange = onPhoneChange,
            label = { Text("Phone Number (+27...)") },
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = QueUpLime,
                focusedLabelColor = QueUpLime,
            )
        )

        Spacer(Modifier.height(16.dp))

        Button(
            onClick = onSubmit,
            enabled = phoneNumber.length >= 10,
            modifier = Modifier.fillMaxWidth().height(60.dp),
            shape = RoundedCornerShape(30.dp),
            colors = ButtonDefaults.buttonColors(containerColor = QueUpLime, contentColor = QueUpBlack),
        ) {
            Text("Get My Ticket", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
        }

        TextButton(onClick = onBack) {
            Text("Back", color = Color.White.copy(alpha = 0.4f))
        }
    }
}

@Composable
fun SuccessStep(ticket: PendingTicket?, tflitePrediction: Float?, onNewTicket: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(64.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(Icons.Default.CheckCircle, null, tint = QueUpLime, modifier = Modifier.size(64.dp))
        Text("Ticket Issued!", color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.ExtraBold)

        ticket?.let {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = QueUpCard),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(it.ticketNumber, color = QueUpLime, fontSize = 56.sp, fontWeight = FontWeight.ExtraBold, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                    Divider(color = QueUpBorder)
                    InfoRow("Service", it.serviceLabel)
                    InfoRow("Position", "#${it.position}")
                    InfoRow("TFLite Est. Wait", "${tflitePrediction?.toInt() ?: it.estimatedWaitMinutes} min")
                    InfoRow("Phone", it.citizenPhone)
                }
            }
        }

        Text(
            "Your paper ticket is printing.\nTrack your position at queup.co.za",
            color = Color.White.copy(alpha = 0.5f),
            fontSize = 14.sp,
            textAlign = TextAlign.Center
        )

        Spacer(Modifier.height(16.dp))

        Button(
            onClick = onNewTicket,
            modifier = Modifier.fillMaxWidth().height(60.dp),
            shape = RoundedCornerShape(30.dp),
            colors = ButtonDefaults.buttonColors(containerColor = QueUpLime, contentColor = QueUpBlack),
        ) {
            Text("Issue New Ticket", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
        }
    }
}

@Composable
fun InfoRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = Color.White.copy(alpha = 0.4f), fontSize = 13.sp)
        Text(value, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
    }
}

private fun generateTicketNumber(): String {
    val prefix = "HA"
    val num = (1..999).random()
    return "$prefix-${num.toString().padStart(3, '0')}"
}

private fun currentTime(): String =
    SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
