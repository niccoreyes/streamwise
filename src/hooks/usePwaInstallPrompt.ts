
import { useEffect, useState, useCallback } from "react";

// Util for localStorage
const REMIND_KEY = "pwa-disable-install-reminder";
const NOT_THIS_SESSION_KEY = "pwa-dont-remind-this-session";

// Checks if app is in standalone (PWA) mode
export function isStandaloneMode(): boolean {
  // Covers Android/iOS/PWAs on desktop
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

// Given prompt event and user settings, manages install prompt lifecycle
export function usePwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (isStandaloneMode()) return;
    if (localStorage.getItem(REMIND_KEY) === "1") return;
    if (sessionStorage.getItem(NOT_THIS_SESSION_KEY) === "1") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handler as EventListener);

    return () =>
      window.removeEventListener("beforeinstallprompt", handler as EventListener);
  }, []);

  // After login (or whenever you want to check!), call this to manually show if allowed
  const maybeShowPrompt = useCallback(() => {
    if (
      isStandaloneMode() ||
      localStorage.getItem(REMIND_KEY) === "1" ||
      sessionStorage.getItem(NOT_THIS_SESSION_KEY) === "1"
    ) {
      setShowPrompt(false);
      return;
    }
    if (deferredPrompt) setShowPrompt(true);
  }, [deferredPrompt]);

  // When user says "Install", attempt the prompt
  const doInstall = async () => {
    if (!deferredPrompt) return;
    // Older Chrome: deferredPrompt is a BeforeInstallPromptEvent
    // @ts-ignore
    if (deferredPrompt.prompt) await (deferredPrompt as any).prompt();
    setShowPrompt(false);
    setDeferredPrompt(null);
    sessionStorage.setItem(NOT_THIS_SESSION_KEY, "1");
  };

  // When user cancels/dismisses
  const dismiss = (dontRemind: boolean) => {
    setShowPrompt(false);
    sessionStorage.setItem(NOT_THIS_SESSION_KEY, "1");
    if (dontRemind) localStorage.setItem(REMIND_KEY, "1");
  };

  return {
    showPrompt,
    maybeShowPrompt,
    doInstall,
    dismiss,
  };
}
