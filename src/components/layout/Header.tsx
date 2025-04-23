
import React from "react";
import { Plus, Settings, Menu } from "lucide-react";
import { useConversation } from "@/context/ConversationContext";
import { useSettings } from "@/context/useSettings";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenSettings, 
  onToggleSidebar 
}) => {
  const { createNewConversation } = useConversation();
  const { selectedModel, systemMessage, webSearchConfig } = useSettings();

  const handleNewChat = () => {
    createNewConversation(
      selectedModel.id,
      {
        temperature: selectedModel.defaultTemperature,
        maxTokens: selectedModel.maxTokens,
      },
      systemMessage,
      webSearchConfig
    );
  };

  return (
    <header className="safe-area-header fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-30 flex items-center px-4 md:px-6">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onToggleSidebar}
            className="md:hidden mr-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <span className="text-xl font-semibold text-streamwise-500">
              StreamWise
            </span>
            <span className="text-xl font-semibold ml-1">AI</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewChat}
            className="hidden sm:flex"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Chat
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            className="sm:hidden"
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            className="ml-2"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
