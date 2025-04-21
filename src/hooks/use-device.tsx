
import { useEffect, useState } from "react";

// Checks if user is on iOS
export function useIsIos(): boolean {
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = window.navigator.userAgent;
    const isIosDevice =
      /iPad|iPhone|iPod/.test(ua) ||
      (ua.includes("Macintosh") && "ontouchend" in document);
    setIsIos(isIosDevice);
  }, []);

  return isIos;
}

// Checks if browser is Safari (on iOS)
export function useIsSafari(): boolean {
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = window.navigator.userAgent;
    // Must not be Chrome or Firefox or Edge, but includes Safari
    const isSafari =
      /iPad|iPhone|iPod|Macintosh/.test(ua) &&
      !window.navigator.userAgent.includes("CriOS") && // Chrome on iOS
      !window.navigator.userAgent.includes("FxiOS") && // Firefox on iOS
      window.navigator.userAgent.includes("Safari");
    setIsSafari(isSafari);
  }, []);

  return isSafari;
}

