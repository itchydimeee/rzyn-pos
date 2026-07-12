# Thermal Receipt Printing — Android Tablet Plan

**Printer model:** XPrinter XP-58IIH (USB + RS-232 only, no Bluetooth, no WiFi)

## The Problem

`window.print()` on an Android tablet opens the Android system print dialog, which only talks to IPP (Internet Printing Protocol) printers — not thermal receipt printers. Thermal receipt printers use ESC/POS commands sent over a serial link. The browser can't send ESC/POS through the standard print dialog.

## Connectivity Overview

The XP-58IIH has no Bluetooth, no WiFi. The only consumer-accessible port is USB-B (the printer end) → USB-C (tablet end via OTG adapter). Two real paths exist:

| Path | Viability | Complexity |
|---|---|---|
| **A: Web USB API** | Promising, needs verification | Low-Medium |
| **B: Print server relay** | Reliable, extra hardware | Medium |

## Option A: Web USB API (Primary)

### How It Works

Chrome on Android supports the [Web USB API](https://developer.chrome.com/docs/capabilities/usb/). Most Chinese thermal printers (XPrinter included) use a USB-to-serial chip (CH340, CP2102, etc.) and present themselves as a **vendor-specific** USB device — not as a standard printer class device. This is key: if the printer showed up as a printer class device (interface class 7), the OS would claim it and Web USB couldn't touch it. But as a vendor-specific device, Web USB can claim the interface and do raw bulk transfers.

The flow:

1. Tablet connects to printer via USB-C OTG adapter
2. User grants permission in the browser prompt (once)
3. Web USB API opens the device and claims the interface
4. ESC/POS bytes are written to the bulk OUT endpoint
5. Printer prints immediately

### Unknown (Must Verify)

The XP-58IIH's USB descriptor determines whether Web USB can claim it:
- **If it's vendor-specific (class 0xFF)** — Web USB can claim it. This is common on Chinese thermal printers.
- **If it's printer class (class 7)** — Chrome may block it because the OS claims printer-class devices. This would block Web USB.

**This must be tested with the actual printer + tablet before committing to this path.** The test takes 5 minutes: plug it in, open `chrome://device-log`, look at the USB descriptor, or try a minimal Web USB claim of the first available interface. If the `claimInterface()` call succeeds, this path works.

### Implementation

```ts
// 1. Request the USB device
const device = await navigator.usb.requestDevice({
  filters: [], // Show all USB devices
});

// 2. Open connection and select configuration
await device.open();
await device.selectConfiguration(1);

// 3. Claim the interface (usually interface 0)
await device.claimInterface(0);

// 4. Find the bulk OUT endpoint
const endpoint = device.configuration.interfaces[0]
  .alternate.endpoints.find(e => e.direction === "out" && e.type === "bulk");

// 5. Send ESC/POS bytes as a bulk transfer
await device.transferOut(endpoint.endpointNumber, escposCommandBytes);

// 6. Disconnect when done
await device.close();
```

### Connection Persistence

- Chrome remembers the granted USB device via `navigator.usb.getDevices()`
- Subsequent prints reconnect automatically — no permission prompt after the first time
- User must keep the printer physically connected (USB is always-on, no pairing needed)

### Printer Discovery / Setup

A one-time setup step:
1. Open printer settings in the POS
2. Tap "Connect Printer"
3. Browser shows the Web USB device chooser
4. User picks the XPrinter from the list
5. App tests the connection by printing a small test line
6. Device is saved to persistent state (via `getDevices()` on next load)

### Architecture

```
┌───────────────────────────────────────────────┐
│  Cashier Page (React)                          │
│                                                 │
│  ┌──────────────┐    ┌────────────────────────┐│
│  │ Complete &    │    │  useUsbPrinter()        ││
│  │ Print button  │───▶│  - connect()            ││
│  └──────────────┘    │  - print(receiptData)    ││
│                       │  - disconnect()          ││
│  ┌──────────────┐    │  - isConnected           ││
│  │ Credit auto-  │    │  - isSupported           ││
│  │ print         │───▶│  - isSetup               ││
│  └──────────────┘    └────────┬───────────────┘│
│                                │                 │
│                     ┌──────────▼───────────────┐│
│                     │  escpos.ts (pure utils)   ││
│                     │  - buildReceiptBytes()    ││
│                     │  - bold(), center(), etc.  ││
│                     └──────────────────────────┘│
└───────────────────────────────────────────────┘
```

### New Files

```
src/
├── hooks/
│   └── useUsbPrinter.ts          # Web USB connection + print
├── lib/
│   └── escpos.ts                  # ESC/POS command builders
└── components/
    └── PrinterSettings.tsx        # Connect printer button + status
```

### Files to Modify

- `src/app/cashier/page.tsx` — Replace `window.print()` flow with USB hook
- `src/app/globals.css` — Remove `@media print` receipt rules

## Option B: Print Server Relay (Fallback)

If Web USB doesn't work (printer presents as class 7 / OS claims it), the reliable fallback is a hardware relay:

### Setup

A tiny device sits between the tablet and the printer:
- **Raspberry Pi Zero W** ($15) or an **old Android phone**
- Runs a minimal Node.js HTTP server
- Connected to the XPrinter via USB
- Connected to the store WiFi

The POS app sends `POST /print` with the receipt data as JSON. The relay converts it to ESC/POS and writes to the USB serial port. This is the same pattern as a network printer but the relay handles the USB driver part.

### Why This Works

A Linux device (Pi) or Android device with XPrinter's SDK can actually talk to the USB printer because they have the kernel-level USB serial driver. The browser can 't, but the relay can. The browser just sends HTTP — which it does fine.

### Trade-offs

- Extra hardware to set up and maintain
- Requires the relay to stay powered and on the same WiFi
- Adds a small amount of latency (negligible for POS use)
- No offline printing (requires WiFi between tablet and relay)

## ESC/POS Command Reference

| Command | Bytes (hex) | Purpose |
|---|---|---|
| Init | `1B 40` | Reset printer to defaults |
| Align center | `1B 61 01` | Center text |
| Align left | `1B 61 00` | Left-align text |
| Bold on | `1B 45 01` | Bold text |
| Bold off | `1B 45 00` | Normal text |
| Feed lines | `1B 64 N` | Feed N lines |
| Cut paper | `1D 56 01` | Partial cut |
| Double height | `1D 21 01` | Tall characters |
| Double width | `1D 21 10` | Wide characters |
| Normal size | `1D 21 00` | Reset size |

A receipt is just plain text mixed with these commands — no complex library or driver needed. The ESC/POS library (`src/lib/escpos.ts`) generates the byte array from the `ReceiptData` object.

## Fallback Strategy

| Scenario | Behavior |
|---|---|
| Web USB not supported (Firefox, Safari) | Fall back to `window.print()` — opens Android print dialog |
| Web USB supported but printer not connected | Show toast: "Printer not connected. Check USB cable." |
| Printer prints garbled text (wrong encoding/buad rate) | The ESC/POS library needs to handle this — but most XPrinters auto-detect, so this is unlikely |
| User hasn't granted USB permission yet | Prompt to connect via Printer Settings |
| Offline mode (no internet) | USB printing still works (device-to-device, no network needed) |

## Implementation Phases

### Phase 1: ESC/POS Library
- Build `src/lib/escpos.ts` with all command builders
- Generate correct receipt bytes from `ReceiptData`
- Test with unit tests comparing expected byte sequences

### Phase 2: Web USB Hook
- Build `src/hooks/useUsbPrinter.ts`
- Handle device request, connection, disconnection, transfer errors
- Test with the actual XP-58IIH on Chrome for Android

### Phase 3: Printer Settings UI
- Build `src/components/PrinterSettings.tsx`
- "Connect Printer" button (opens Web USB device chooser)
- Connection status indicator
- Test print button

### Phase 4: Wire Into Checkout
- Modify `src/app/cashier/page.tsx` to call `useUsbPrinter()` for printing
- Remove `@media print` CSS receipt rules
- Remove the hidden auto-print receipt layer
- "Complete & Print" and credit auto-print now go through USB

### Phase 5: Testing on Tablet
- Physically connect XP-58IIH via USB-C OTG
- Run the Web USB claim test first to verify compatibility
- If Web USB works: proceed with Phase 2-4
- If Web USB fails: switch to Option B (print server relay)
- Test all payment types + print
- Test printer disconnect/reconnect
- Test after tablet sleep/wake

## Dependencies

No new npm packages. Both Web USB API and the ESC/POS command protocol are standard web platform features — nothing to install.

## Immediate Next Step (Pre-Tablet)

What I can build right now without the printer hardware:
- **`src/lib/escpos.ts`** — The entire ESC/POS command builder. Testable with unit tests since it just produces byte arrays.
- **`src/hooks/useUsbPrinter.ts`** — The hook structure and error handling. The actual `navigator.usb` calls won't work on a desktop without the printer plugged in, but the interface and flow can be fully implemented.
- **`src/components/PrinterSettings.tsx`** — The settings UI is pure React.
- **Wire the hook into checkout** — The hook returns a `print()` function; the cashier page just calls it.

The only thing that needs the physical hardware is the USB descriptor check and end-to-end print test. Everything else can be built and tested ahead of time.
