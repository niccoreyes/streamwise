
import React, { useState } from "react";
import { ChevronLeft, Plus, Trash, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useConversation } from "@/context/ConversationContext";
import { useSettings } from "@/context/SettingsContext";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { conversations, currentConversation, createNewConversation, setCurrentConversationById, updateConversation, deleteConversation } = useConversation();
  const { selectedModel } = useSettings();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");

  const handleNewChat = () => {
    createNewConversation(selectedModel.id, {
      temperature: selectedModel.defaultTemperature,
      maxTokens: selectedModel.maxTokens,
    });
  };

  const startEditing = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const saveTitle = async (id: string) => {
    const conversation = conversations.find(c => c.id === id);
    if (conversation && editTitle.trim()) {
      await updateConversation({
        ...conversation,
        title: editTitle.trim()
      });
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      saveTitle(id);
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  return (
    <div
      className={cn(
        "fixed top-0 left-0 z-40 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 pt-14 transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 flex flex-col">
          <Button
            variant="default"
            className="w-full mb-4 bg-streamwise-500 hover:bg-streamwise-600"
            onClick={handleNewChat}
          >
            <Plus className="h-4 w-4 mr-2" /> New Chat
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute top-16 -right-3 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm h-6 w-6 md:hidden"
            onClick={onClose}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-grow overflow-y-auto pb-4 px-2">
          {conversations.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              No conversations yet
            </div>
          ) : (
            <div className="space-y-1">
              {conversations
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      "flex items-center justify-between py-2 px-3 rounded-md group transition-colors",
                      currentConversation?.id === conversation.id
                        ? "bg-streamwise-100 dark:bg-streamwise-900/20 text-streamwise-700 dark:text-streamwise-300"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    {editingId === conversation.id ? (
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => saveTitle(conversation.id)}
                        onKeyDown={(e) => handleKeyDown(e, conversation.id)}
                        className="flex-grow mr-1 h-8"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => setCurrentConversationById(conversation.id)}
                        className="flex-grow text-left truncate py-1 focus:outline-none"
                      >
                        <div className="font-medium truncate">
                          {conversation.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(conversation.updatedAt), "MMM d, yyyy")}
                        </div>
                      </button>
                    )}

                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(conversation.id, conversation.title);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conversation.id);
                        }}
                      >
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
        <div className="p-4 text-xs text-center text-gray-500 dark:text-gray-400">
          StreamWise AI Chat
          <div className="mt-1">© 2023</div>
        </div>
      </div>
    </div>
  );
};
