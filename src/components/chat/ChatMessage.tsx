import React, { useState } from "react";
import { Message } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConversation } from "@/context/ConversationContext";
import type { MessageContentPart } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  const { deleteMessage, updateMessage } = useConversation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(typeof message.content === "string" ? message.content : "");
  const isUser = message.role === "user";
  const contentArr = Array.isArray(message.content) ? message.content : null;
  const blobUrls = useBase64ToBlobUrls(message.content);

  const handleDelete = async () => {
    await deleteMessage(message.id);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(typeof message.content === "string" ? message.content : "");
  };

  const handleSaveEdit = async () => {
    await updateMessage({
      ...message,
      content: editedContent,
    });
    setIsEditing(false);
  };

  function renderContent(content: string | MessageContentPart[]): React.ReactNode {
    if (typeof content === "string") {
      if (isEditing) {
        return (
          <div className="flex flex-col gap-2">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={4}
              className="min-w-[200px] text-black"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save</Button>
            </div>
          </div>
        );
      }
      
      return (
        <div className="markdown">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
          >
            {content}
          </ReactMarkdown>
        </div>
      );
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
        "flex w-full mb-4 animate-fade-in group",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "flex max-w-[95vw] sm:max-w-[80%]",
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

        <div className="relative group">
          {/* Mini bubble for action buttons */}
          <div
            className={cn(
              "absolute left-1/2 z-20 flex items-center justify-center",
              "transition-all duration-200",
              "pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 opacity-0",
              "action-mini-bubble"
            )}
            style={{
              transform: "translateX(-50%)",
              top: "auto",
              bottom: "100%",
              marginBottom: "0.5rem"
            }}
            tabIndex={-1}
            // Dynamic pop direction based on viewport position
            onMouseEnter={e => {
              const bubble = e.currentTarget;
              const rect = bubble.getBoundingClientRect();
              if (rect.top < 60) {
                bubble.style.top = "100%";
                bubble.style.bottom = "auto";
                bubble.style.marginTop = "0.5rem";
                bubble.style.marginBottom = "0";
              } else {
                bubble.style.top = "auto";
                bubble.style.bottom = "100%";
                bubble.style.marginTop = "0";
                bubble.style.marginBottom = "0.5rem";
              }
            }}
          >
            <div
              className={cn(
                "rounded-full bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700 px-2 py-1 flex gap-1",
                "minibubble-compact"
              )}
              style={{
                minHeight: "36px",
                minWidth: "auto",
                alignItems: "center"
              }}
            >
              {/* Edit Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEdit}
                className="h-7 w-7"
                aria-label="Edit message"
                tabIndex={0}
              >
                <Edit className="h-4 w-4" />
              </Button>
              {/* Delete Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="h-7 w-7 text-destructive hover:text-destructive"
                aria-label="Delete message"
                tabIndex={0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              {/* Copy Raw Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (typeof message.content === "string") {
                    navigator.clipboard.writeText(message.content);
                  } else if (Array.isArray(message.content)) {
                    // Join all text parts for raw copy
                    const raw = message.content
                      .map((part) =>
                        part.type === "input_text" || part.type === "output_text"
                          ? part.text
                          : part.type === "input_image"
                          ? "[image]"
                          : ""
                      )
                      .join("\n");
                    navigator.clipboard.writeText(raw);
                  }
                }}
                className="h-7 w-7"
                aria-label="Copy raw text"
                title="Copy raw text"
                tabIndex={0}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </Button>
            </div>
          </div>
          <div
            className={cn(
              "px-4 py-2 rounded-lg transition-shadow duration-200",
              "bubble-action-highlight",
              isUser
                ? "bg-streamwise-500 text-white"
                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
            )}
            tabIndex={0}
          >
            <div className={cn(
              "prose prose-sm max-w-none break-words",
              isUser
                ? "prose-invert"
                : "prose-gray dark:prose-invert"
            )}>
              {renderContent(message.content)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
