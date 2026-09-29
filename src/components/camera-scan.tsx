"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { cn } from "@/lib/format";
import { Button } from "@/components/ui";

type Result = { ok: boolean; message: string } | null;

/**
 * Scan box labels with the phone or tablet camera. Keeps scanning so a whole pallet can be
 * received without closing it; a label already read is ignored so it never counts twice.
 */
export function CameraScan({ onScan, last }: { onScan: (code: string) => void; last: Result }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" className="h-11" onClick={() => setOpen(true)} aria-label="Scan with camera">
        <Camera size={18} /> <span className="hidden sm:inline">Camera</span>
      </Button>
      {open && <Scanner onScan={onScan} last={last} onClose={() => setOpen(false)} />}
    </>
  );
}

function Scanner({ onScan, last, onClose }: { onScan: (code: string) => void; last: Result; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const scanRef = useRef(onScan);
  useEffect(() => {
    scanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    const seen = new Set<string>();
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser can't open the camera here. Open Stem Haul on your phone or tablet (stemhaul.vercel.app) in Chrome or Safari.");
        return;
      }
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } },
          video.current!,
          (result) => {
            if (!result) return;
            const code = result.getText().trim().toUpperCase();
            // Each label counts once per camera session, even if it stays in view.
            if (seen.has(code)) return;
            seen.add(code);
            navigator.vibrate?.(80);
            setFlash(true);
            setTimeout(() => setFlash(false), 250);
            setCount((n) => n + 1);
            scanRef.current(code);
          },
        );
        if (cancelled) controls.stop();
        else stop = () => controls.stop();
      } catch (e) {
        const name = (e as Error).name;
        setError(
          name === "NotAllowedError"
            ? "Camera permission was denied. Allow the camera for this site in the browser settings and try again."
            : name === "NotFoundError"
              ? "No camera found on this device. Use a scanner gun or type the label."
              : "Could not start the camera. Open Stem Haul on your phone or tablet (stemhaul.vercel.app) and try again.",
        );
      }
    })();
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-label="Camera scanner">
      <div className="flex items-center justify-between px-4 py-3" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
        <div className="font-medium">Point the camera at the box label</div>
        <button className="grid size-10 place-items-center rounded-full bg-white/15" onClick={onClose} aria-label="Close camera"><X size={20} /></button>
      </div>
      <div className="relative min-h-0 flex-1">
        <video ref={video} className="absolute inset-0 size-full object-cover" muted playsInline />
        {/* Aim box: wide and short, like a 1D barcode. */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className={cn("h-32 w-[85%] max-w-lg rounded-xl border-4 shadow-[0_0_0_100vmax_rgba(0,0,0,0.45)] transition-colors", flash ? "border-good bg-good/20" : "border-white/80")} />
        </div>
        {error && <div className="absolute inset-x-4 top-4 rounded-lg bg-bad px-3 py-2 text-sm">{error}</div>}
      </div>
      <div className="grid gap-2 px-4 py-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        {last && count > 0 && <div className={cn("rounded-lg px-3 py-2 text-sm", last.ok ? "bg-good text-white" : "bg-bad text-white")}>{last.message}</div>}
        <div className="flex items-center justify-between gap-3 text-sm text-white/80">
          <span>{count} scanned · keeps scanning until you close it</span>
          <Button variant="secondary" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}
