
import React from "react";
import { Message } from "@/types";
import ReactMarkdown from "react-markdown";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full mb-4 animate-fade-in",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "flex max-w-[80%]",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        <Avatar className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium",
          isUser 
            ? "bg-streamwise-500 text-white ml-2" 
            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 mr-2"
        )}>
          <span>{isUser ? "You" : "AI"}</span>
        </Avatar>

        <div
          className={cn(
            "px-4 py-2 rounded-lg",
            isUser
              ? "bg-streamwise-500 text-white"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
          )}
        >
          {message.mediaUrl && message.mediaType === "image" && (
            <div className="mb-2">
              <img
                src={message.mediaUrl}
                alt="User uploaded image"
                className="max-w-full rounded-md"
              />
            </div>
          )}

          {message.mediaUrl && message.mediaType === "audio" && (
            <div className="mb-2">
              <audio
                src={message.mediaUrl}
                controls
                className="max-w-full"
              />
            </div>
          )}

          <div className={cn(
            "prose prose-sm max-w-none",
            isUser 
              ? "prose-invert" 
              : "prose-gray dark:prose-invert"
          )}>
            <ReactMarkdown>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};
