
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
    
    // Remove this check so it shows each time a user logs in unless disabled permanently
    // if (sessionStorage.getItem(NOT_THIS_SESSION_KEY) === "1") return;

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
      localStorage.getItem(REMIND_KEY) === "1"
      // Removed the session storage check
      // sessionStorage.getItem(NOT_THIS_SESSION_KEY) === "1"
    ) {
      setShowPrompt(false);
      return;
    }
    if (deferredPrompt) setShowPrompt(true);
  }, [deferredPrompt]);

  const doInstall = async () => {
    if (!deferredPrompt) return;
    // @ts-ignore
    if (deferredPrompt.prompt) await (deferredPrompt as any).prompt();
    setShowPrompt(false);
    setDeferredPrompt(null);
    
    // Only store in sessionStorage if user completed installation
    sessionStorage.setItem(NOT_THIS_SESSION_KEY, "1");
  };

  const dismiss = (dontRemind: boolean) => {
    setShowPrompt(false);
    
    // Only save don't remind preference if checkbox was ticked
    if (dontRemind) {
      localStorage.setItem(REMIND_KEY, "1");
    }
    
    // No longer setting session storage here for "Maybe later" option
  };

  return {
    showPrompt,
    maybeShowPrompt,
    doInstall,
    dismiss,
  };
}
