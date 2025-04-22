
import React, { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { useConversation } from "@/context/ConversationContext";

export const ChatContainer: React.FC = () => {
  const { currentConversation } = useConversation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages]);

  if (!currentConversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          Select or create a conversation to start chatting
        </p>
      </div>
    );
  }

  if (currentConversation.messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 text-center">
        <div className="max-w-sm">
          <h3 className="text-xl font-semibold mb-2 text-streamwise-500">Welcome to StreamWise AI</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Start a conversation with the AI assistant. You can ask questions, request information, or just chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {/*
        Pass bubbleIndex and totalBubbles to each ChatMessage for position-aware UI logic.
        This enables accurate detection of first, last, and intermediate bubbles, and is extensible for future features.
      */}
      {currentConversation.messages.map((message, idx) => (
        <ChatMessage
          key={message.id}
          message={message}
          bubbleIndex={idx}
          totalBubbles={currentConversation.messages.length}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
