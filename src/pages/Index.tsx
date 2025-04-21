import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { SettingsDrawer } from "@/components/layout/SettingsDrawer";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { MessageInput } from "@/components/chat/MessageInput";
import { ConversationProvider } from "@/context/ConversationContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { usePwaInstallPrompt, isStandaloneMode } from "@/hooks/usePwaInstallPrompt";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { IosPwaInstallBanner } from "@/components/IosPwaInstallBanner";
import { useIsIos, useIsSafari } from "@/hooks/use-device";

const REMIND_KEY = "pwa-disable-install-reminder";
const NOT_THIS_SESSION_KEY = "pwa-dont-remind-this-session";

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // --- Device detection for iOS PWA banner
  const isIos = useIsIos();
  const isSafari = useIsSafari();

  // --- Local state for iOS install banner
  const [showIosBanner, setShowIosBanner] = useState(false);

  // --- PWA (Android/other) prompt logic
  const {
    showPrompt,
    maybeShowPrompt,
    doInstall,
    dismiss,
  } = usePwaInstallPrompt();

  // Show iOS add-to-home-screen banner logic
  useEffect(() => {
    if (!isIos || !isSafari) {
      setShowIosBanner(false);
      return;
    }
    if (isStandaloneMode()) {
      setShowIosBanner(false);
      return;
    }
    if (localStorage.getItem(REMIND_KEY) === "1") {
      setShowIosBanner(false);
      return;
    }
    if (sessionStorage.getItem(NOT_THIS_SESSION_KEY) === "1") {
      setShowIosBanner(false);
      return;
    }
    setShowIosBanner(true);
  }, [isIos, isSafari]);

  // Simulate "login": show install prompt after "login"
  useEffect(() => {
    if (isIos && isSafari) {
      setShowIosBanner(true);
    } else {
      maybeShowPrompt();
    }
  }, [maybeShowPrompt, isIos, isSafari]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false); // Reset for when returning to mobile
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Register the app as a PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('ServiceWorker registration successful with scope: ',
              registration.scope);
          },
          (err) => {
            console.log('ServiceWorker registration failed: ', err);
          }
        );
      });
    }
  }, []);

  return (
    <ConversationProvider>
      <SettingsProvider>
        <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
          <Header 
            onOpenSettings={() => setSettingsOpen(true)} 
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
          />
          
          <div className="flex flex-1 pt-14">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            
            <main className="flex-1 flex flex-col min-h-0 relative md:ml-64">
              <ChatContainer />
              <MessageInput />
            </main>
          </div>
          
          <SettingsDrawer 
            isOpen={settingsOpen} 
            onClose={() => setSettingsOpen(false)} 
          />
        </div>

        {/* PWA prompt (Android/Supported) – only if not iOS Safari */}
        <PwaInstallPrompt
          open={showPrompt && !(isIos && isSafari)}
          onInstall={doInstall}
          onCancel={dismiss}
        />

        {/* iOS Banner */}
        <IosPwaInstallBanner
          open={showIosBanner}
          onClose={(dontRemindAgain) => {
            setShowIosBanner(false);
            sessionStorage.setItem(NOT_THIS_SESSION_KEY, "1");
            if (dontRemindAgain) localStorage.setItem(REMIND_KEY, "1");
          }}
        />
      </SettingsProvider>
    </ConversationProvider>
  );
};

export default Index;
