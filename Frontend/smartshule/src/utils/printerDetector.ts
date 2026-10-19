/**
 * Grace Seeds School Receipt Printer Detection & Management Utility
 * Detects connected thermal POS receipt printers (WebUSB, WebSerial)
 * and manages workstation receipt printer auto-print configuration.
 */

export interface PrinterDetectionResult {
  hasReceiptPrinter: boolean;
  printerType: 'USB_THERMAL' | 'SERIAL_POS' | 'CONFIGURED_TERMINAL' | 'SYSTEM_DEFAULT';
  printerName: string;
  autoPrintEnabled: boolean;
}

const PRINTER_MODE_STORAGE_KEY = 'smartshule_receipt_printer_mode';
const AUTO_PRINT_STORAGE_KEY = 'smartshule_auto_print_receipt';

// Known POS / Thermal Receipt Printer USB Vendor IDs
const THERMAL_PRINTER_VENDOR_IDS = [
  0x04b8, // Epson
  0x0519, // Star Micronics
  0x1fc9, // Rongta
  0x0416, // Winbond / Xprinter
  0x0483, // STMicroelectronics / Custom POS
  0x0fe6, // ICS / POS Printer
  0x6868, // Citizen
  0x1504, // Bixolon
  0x20d1, // Munbyn / Zebra
];

export async function detectReceiptPrinter(): Promise<PrinterDetectionResult> {
  // 1. Check if user configured this terminal as having a dedicated receipt printer
  const manuallyConfigured = localStorage.getItem(PRINTER_MODE_STORAGE_KEY) === 'true';
  const autoPrintPref = localStorage.getItem(AUTO_PRINT_STORAGE_KEY);
  const autoPrintEnabled = autoPrintPref !== null ? autoPrintPref === 'true' : true; // Default to ON for receipt printers

  // 2. Check WebUSB API for connected USB thermal receipt printers
  if (typeof navigator !== 'undefined' && 'usb' in navigator) {
    try {
      const usbDevices = await (navigator as any).usb.getDevices();
      const detectedThermalUsb = usbDevices.find((device: any) => {
        const isPrinterClass = device.deviceClass === 7;
        const isKnownVendor = THERMAL_PRINTER_VENDOR_IDS.includes(device.vendorId);
        const nameMatches = (device.productName || '').toLowerCase().match(/pos|thermal|receipt|printer|epson|xprinter|munbyn/i);
        return isPrinterClass || isKnownVendor || nameMatches;
      });

      if (detectedThermalUsb) {
        return {
          hasReceiptPrinter: true,
          printerType: 'USB_THERMAL',
          printerName: detectedThermalUsb.productName || 'USB Thermal Receipt Printer (80mm/58mm)',
          autoPrintEnabled,
        };
      }
    } catch {
      // WebUSB permission or query error - fallback to configured check
    }
  }

  // 3. Check WebSerial API for connected COM / Virtual Serial Port receipt printers
  if (typeof navigator !== 'undefined' && 'serial' in navigator) {
    try {
      const serialPorts = await (navigator as any).serial.getPorts();
      if (serialPorts && serialPorts.length > 0) {
        return {
          hasReceiptPrinter: true,
          printerType: 'SERIAL_POS',
          printerName: 'COM / Serial POS Thermal Printer',
          autoPrintEnabled,
        };
      }
    } catch {
      // Ignore serial error
    }
  }

  // 4. Check if workstation flag was saved
  if (manuallyConfigured) {
    return {
      hasReceiptPrinter: true,
      printerType: 'CONFIGURED_TERMINAL',
      printerName: 'Active POS Receipt Printer (Workstation Mode)',
      autoPrintEnabled,
    };
  }

  // 5. Default fallback: System printer available
  return {
    hasReceiptPrinter: false,
    printerType: 'SYSTEM_DEFAULT',
    printerName: 'Standard System Printer',
    autoPrintEnabled: false,
  };
}

export function setReceiptPrinterWorkstationMode(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PRINTER_MODE_STORAGE_KEY, enabled ? 'true' : 'false');
  }
}

export function setReceiptAutoPrint(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTO_PRINT_STORAGE_KEY, enabled ? 'true' : 'false');
  }
}

/**
 * Triggers printing of the receipt element with print-specific layout.
 */
export function triggerReceiptPrint(): void {
  if (typeof window !== 'undefined') {
    window.print();
  }
}
