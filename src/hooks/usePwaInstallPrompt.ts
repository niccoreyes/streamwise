
import { useEffect, useState, useCallback } from "react";
import { useIsIos, useIsSafari } from "./use-device"; // import for platform detection

const REMIND_KEY = "pwa-disable-install-reminder";
const NOT_THIS_SESSION_KEY = "pwa-dont-remind-this-session";

export function isStandaloneMode(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

// Given prompt event and user settings, manages install prompt lifecycle
export function usePwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  const isIos = useIsIos();
  const isSafari = useIsSafari();

  useEffect(() => {
    // Do not run on iOS Safari
    if (isIos && isSafari) return;
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
  }, [isIos, isSafari]);

  // To check and manually show if allowed (e.g. after login)
  const maybeShowPrompt = useCallback(() => {
    if (
      isStandaloneMode() ||
      localStorage.getItem(REMIND_KEY) === "1" ||
      sessionStorage.getItem(NOT_THIS_SESSION_KEY) === "1" ||
      (isIos && isSafari)
    ) {
      setShowPrompt(false);
      return;
    }
    if (deferredPrompt) setShowPrompt(true);
  }, [deferredPrompt, isIos, isSafari]);

  const doInstall = async () => {
    if (!deferredPrompt) return;
    // @ts-ignore
    if (deferredPrompt.prompt) await (deferredPrompt as any).prompt();
    setShowPrompt(false);
    setDeferredPrompt(null);
    sessionStorage.setItem(NOT_THIS_SESSION_KEY, "1");
  };

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
