
import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { SettingsDrawer } from "@/components/layout/SettingsDrawer";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { MessageInput } from "@/components/chat/MessageInput";
import { ConversationProvider } from "@/context/ConversationContext";
import { SettingsProvider } from "@/context/SettingsContext";

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        // On medium screens and larger, sidebar is always visible
        setSidebarOpen(false); // Reset the state for when returning to mobile
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
            
            <main className="flex-1 flex flex-col md:ml-64">
              <ChatContainer />
              <MessageInput />
            </main>
          </div>
          
          <SettingsDrawer 
            isOpen={settingsOpen} 
            onClose={() => setSettingsOpen(false)} 
          />
        </div>
      </SettingsProvider>
    </ConversationProvider>
  );
};

export default Index;
