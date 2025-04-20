import React from "react";
import { Message } from "@/types";
import ReactMarkdown from "react-markdown";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { MessageContentPart } from "@/types";

interface ChatMessageProps {
  message: Message;
}

function isInputImage(part: MessageContentPart): part is MessageContentPart & { image_data: string } {
  return part.type === "input_image" && "image_data" in part && typeof (part as { image_data?: unknown }).image_data === "string";
}

// Custom hook to convert base64 to blob URL
function useBase64ToBlobUrls(content: MessageContentPart[] | string): (string | undefined)[] {
  const [blobUrls, setBlobUrls] = React.useState<(string | undefined)[]>([]);
  React.useEffect(() => {
    if (typeof content === "string") {
      setBlobUrls([]);
      return;
    }
    const urls: (string | undefined)[] = [];
    content.forEach((part) => {
      if (isInputImage(part)) {
        try {
          const base64 = part.image_data;
          const arr = base64.split(",");
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) u8arr[n] = bstr.charCodeAt(n);
          const blob = new Blob([u8arr], { type: mime });
          const url = URL.createObjectURL(blob);
          urls.push(url);
        } catch {
          urls.push(undefined);
        }
      } else {
        urls.push(undefined);
      }
    });
    setBlobUrls(urls);
    return () => {
      urls.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [content]);
  return blobUrls;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === "user";
  const contentArr = Array.isArray(message.content) ? message.content : null;
  const blobUrls = useBase64ToBlobUrls(message.content);

  function renderContent(content: string | MessageContentPart[]): React.ReactNode {
    if (typeof content === "string") {
      return <ReactMarkdown>{content}</ReactMarkdown>;
    }
    return content.map((part, idx) => {
      if (
        part.type === "input_text" ||
        part.type === "output_text"
      ) {
        return <span key={idx}>{part.text}</span>;
      }
      if (isInputImage(part)) {
        const blobUrl = blobUrls[idx];
        if (blobUrl) {
          return (
            <img
              key={idx}
              src={blobUrl}
              alt="User uploaded"
              style={{ maxWidth: "100%", maxHeight: 320, borderRadius: 8, display: "block", margin: "8px 0" }}
            />
          );
        }
        return <span key={idx} style={{ color: "red" }}>Image unavailable</span>;
      }
      return null;
    });
  }

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
          <div className={cn(
            "prose prose-sm max-w-none",
            isUser 
              ? "prose-invert" 
              : "prose-gray dark:prose-invert"
          )}>
            {renderContent(message.content)}
          </div>
        </div>
      </div>
    </div>
  );
};
