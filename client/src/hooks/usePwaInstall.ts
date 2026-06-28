import { useState, useEffect, useCallback } from "react";

const DISMISSED_KEY = "pwa_install_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  // Detect if already running as installed PWA
  const isInstalled = window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;

  // Detect iOS Safari (no beforeinstallprompt support)
  const isIosSafari = /iphone|ipad|ipod/i.test(navigator.userAgent)
    && /safari/i.test(navigator.userAgent)
    && !/(crios|fxios|opios|mercury)/i.test(navigator.userAgent);

  useEffect(() => {
    if (isInstalled) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isInstalled]);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  }, []);

  return {
    showBanner,
    isIosSafari: isIosSafari && !isInstalled && !localStorage.getItem(DISMISSED_KEY),
    install,
    dismiss,
    canInstall: !!deferredPrompt,
  };
}
