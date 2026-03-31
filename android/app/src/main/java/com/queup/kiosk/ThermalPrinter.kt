package com.queup.kiosk

import android.content.Context
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.util.Log
import java.io.OutputStream

/**
 * ThermalPrinter — USB-OTG ESC/POS thermal printer driver.
 *
 * Connects via USB-OTG to a standard ESC/POS thermal receipt printer
 * (e.g. Epson TM-T20, GP-80250) to print QueUp tickets.
 *
 * Protocol: ESC/POS over USB bulk transfer
 * Target: Android 10+ with USB OTG support
 */
class ThermalPrinter(private val context: Context) {

    companion object {
        private const val TAG = "ThermalPrinter"

        // ESC/POS commands
        private val ESC_INIT = byteArrayOf(0x1B, 0x40)               // Initialize
        private val ESC_ALIGN_CENTER = byteArrayOf(0x1B, 0x61, 0x01) // Center align
        private val ESC_ALIGN_LEFT = byteArrayOf(0x1B, 0x61, 0x00)   // Left align
        private val ESC_BOLD_ON = byteArrayOf(0x1B, 0x45, 0x01)      // Bold on
        private val ESC_BOLD_OFF = byteArrayOf(0x1B, 0x45, 0x00)     // Bold off
        private val ESC_DOUBLE_HEIGHT = byteArrayOf(0x1B, 0x21, 0x10)// Double height
        private val ESC_NORMAL_SIZE = byteArrayOf(0x1B, 0x21, 0x00)  // Normal size
        private val ESC_CUT = byteArrayOf(0x1D, 0x56, 0x41, 0x10)    // Partial cut
        private val LF = byteArrayOf(0x0A)                            // Line feed
        private val SEPARATOR = "================================\n".toByteArray()
    }

    private var outputStream: OutputStream? = null
    private var usbDevice: UsbDevice? = null

    // ── Connect to USB thermal printer ───────────────────────────────────────
    fun connect(): Boolean {
        val usbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
        val deviceList = usbManager.deviceList

        // Find first printer-class USB device
        val printer = deviceList.values.firstOrNull { device ->
            // USB class 7 = Printer
            (0 until device.interfaceCount).any { i ->
                device.getInterface(i).interfaceClass == 7
            }
        }

        if (printer == null) {
            Log.w(TAG, "No USB thermal printer found")
            return false
        }

        return try {
            val connection = usbManager.openDevice(printer)
            if (connection == null) {
                Log.e(TAG, "Cannot open USB device — check USB permission")
                return false
            }

            val iface = printer.getInterface(0)
            connection.claimInterface(iface, true)

            val endpoint = (0 until iface.endpointCount)
                .map { iface.getEndpoint(it) }
                .firstOrNull { it.direction == android.hardware.usb.UsbConstants.USB_DIR_OUT }
                ?: return false

            // Wrap in an OutputStream using bulk transfer
            outputStream = object : OutputStream() {
                override fun write(b: Int) = write(byteArrayOf(b.toByte()))
                override fun write(b: ByteArray, off: Int, len: Int) {
                    connection.bulkTransfer(endpoint, b.copyOfRange(off, off + len), len, 3000)
                }
            }

            usbDevice = printer
            Log.i(TAG, "Connected to thermal printer: ${printer.productName}")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Printer connect error: ${e.message}")
            false
        }
    }

    // ── Print a QueUp ticket ─────────────────────────────────────────────────
    fun printTicket(ticket: PrintableTicket): Boolean {
        val os = outputStream ?: run {
            Log.w(TAG, "Printer not connected")
            return false
        }

        return try {
            os.write(ESC_INIT)

            // Header
            os.write(ESC_ALIGN_CENTER)
            os.write(ESC_BOLD_ON)
            os.write(ESC_DOUBLE_HEIGHT)
            os.write("QueUp\n".toByteArray())
            os.write(ESC_NORMAL_SIZE)
            os.write(ESC_BOLD_OFF)
            os.write("Digital Queue System\n".toByteArray())
            os.write(SEPARATOR)

            // Ticket number (large)
            os.write(ESC_ALIGN_CENTER)
            os.write(ESC_BOLD_ON)
            os.write(ESC_DOUBLE_HEIGHT)
            os.write("${ticket.ticketNumber}\n\n".toByteArray())
            os.write(ESC_NORMAL_SIZE)

            // Branch + service
            os.write("${ticket.branchName}\n".toByteArray())
            os.write(ESC_BOLD_OFF)
            os.write("${ticket.serviceLabel}\n".toByteArray())
            os.write(SEPARATOR)

            // Details left-aligned
            os.write(ESC_ALIGN_LEFT)
            os.write("Issued : ${ticket.issuedTime}\n".toByteArray())
            os.write("Est. wait: ${ticket.estimatedWaitMinutes} min\n".toByteArray())
            os.write("Queue pos: ${ticket.position}\n".toByteArray())
            os.write(SEPARATOR)

            // Citizen
            os.write("Name : ${ticket.citizenName}\n".toByteArray())
            os.write("Phone: ${ticket.citizenPhone}\n".toByteArray())
            os.write(SEPARATOR)

            // Footer
            os.write(ESC_ALIGN_CENTER)
            os.write("\nTrack live at queup.co.za\n".toByteArray())
            os.write("or scan QR code\n\n".toByteArray())
            os.write("Powered by TFLite Edge AI\n\n".toByteArray())

            // Cut
            os.write(ESC_CUT)
            os.flush()

            Log.i(TAG, "Ticket printed: ${ticket.ticketNumber}")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Print error: ${e.message}")
            false
        }
    }

    fun disconnect() {
        outputStream?.close()
        outputStream = null
        usbDevice = null
    }

    fun isConnected() = outputStream != null

    data class PrintableTicket(
        val ticketNumber: String,
        val branchName: String,
        val serviceLabel: String,
        val citizenName: String,
        val citizenPhone: String,
        val position: Int,
        val estimatedWaitMinutes: Int,
        val issuedTime: String,
    )
}
