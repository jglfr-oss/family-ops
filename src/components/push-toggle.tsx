"use client";

import { useEffect, useState } from "react";
import { savePushSubscription, removePushSubscription } from "@/lib/actions-push";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) view[i] = raw.charCodeAt(i);
  return view;
}

type Status = "loading" | "unsupported" | "needs-install" | "off" | "on" | "blocked";

export function PushToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      if (typeof window === "undefined") return;
      const supported = "serviceWorker" in navigator && "PushManager" in window;
      if (!supported) {
        // On iOS, push only works from the home-screen-installed app.
        const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
        const standalone =
          window.matchMedia("(display-mode: standalone)").matches ||
          (window.navigator as unknown as { standalone?: boolean }).standalone === true;
        setStatus(isIos && !standalone ? "needs-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("blocked");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    }
    check();
  }, []);

  async function enable() {
    setBusy(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "off");
        setBusy(false);
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setMessage("Notifications are not configured yet.");
        setBusy(false);
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const result = await savePushSubscription(
        json.endpoint ?? "",
        json.keys?.p256dh ?? "",
        json.keys?.auth ?? "",
        navigator.userAgent
      );
      if (result.error) setMessage(result.error);
      else {
        setStatus("on");
        setMessage("Notifications are on for this device.");
      }
    } catch {
      setMessage("Could not turn on notifications on this device.");
    }
    setBusy(false);
  }

  async function disable() {
    setBusy(true);
    setMessage(null);
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await removePushSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
    setStatus("off");
    setMessage("Notifications are off for this device.");
    setBusy(false);
  }

  if (status === "loading") return null;

  if (status === "needs-install")
    return (
      <p className="text-ink-muted rounded-card border-line bg-card border p-3 text-xs">
        To get chore notifications on your phone: tap the Share button, choose{" "}
        <strong>Add to Home Screen</strong>, then open Choreo from your home screen and turn
        notifications on here.
      </p>
    );

  if (status === "unsupported") return null;

  if (status === "blocked")
    return (
      <p className="text-ink-muted rounded-card border-line bg-card border p-3 text-xs">
        Notifications are blocked for Choreo. Turn them back on in your device settings, then
        reload.
      </p>
    );

  return (
    <div className="rounded-card border-line bg-card flex flex-wrap items-center gap-3 border p-3">
      <div className="flex-1">
        <p className="text-sm font-medium">Chore notifications</p>
        <p className="text-ink-muted text-xs">
          {status === "on"
            ? "This device gets a reminder when chores are due."
            : "Get a reminder on this device when chores are due."}
        </p>
        {message && <p className="text-ink-muted mt-1 text-xs">{message}</p>}
      </div>
      <button
        disabled={busy}
        onClick={status === "on" ? disable : enable}
        className={
          status === "on"
            ? "border-line rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-60"
            : "bg-spruce rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        }
      >
        {busy ? "…" : status === "on" ? "Turn off" : "Turn on"}
      </button>
    </div>
  );
}
