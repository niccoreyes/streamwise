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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * ChatMessageProps now accepts bubbleIndex and totalBubbles for flexible, future-proof UI logic.
 * - bubbleIndex: The zero-based index of this bubble in the chat sequence.
 * - totalBubbles: The total number of bubbles in the conversation.
 * This allows the component to determine if it's the first, last, or any position, and is extensible for future features.
 */
interface ChatMessageProps {
  message: Message;
  bubbleIndex: number;
  totalBubbles: number;
}

function isInputImage(
  part: MessageContentPart
): part is MessageContentPart & { image_data: string } {
  return (
    part.type === "input_image" &&
    "image_data" in part &&
    typeof (part as { image_data?: unknown }).image_data === "string"
  );
}

// Custom hook to convert base64 to blob URL
function useBase64ToBlobUrls(
  content: MessageContentPart[] | string
): (string | undefined)[] {
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

/**
 * ChatMessage renders a single chat bubble.
 * It uses bubbleIndex and totalBubbles to determine its position in the conversation for UI logic (e.g., bridge placement).
 */
export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  bubbleIndex,
  totalBubbles,
}) => {
  const { deleteMessage, updateMessage } = useConversation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(
    typeof message.content === "string" ? message.content : ""
  );
  const isUser = message.role === "user";
  const contentArr = Array.isArray(message.content) ? message.content : null;
  const blobUrls = useBase64ToBlobUrls(message.content);

  const handleDelete = async () => {
    await deleteMessage(message.id);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(
      typeof message.content === "string" ? message.content : ""
    );
  };

  const handleSaveEdit = async () => {
    await updateMessage({
      ...message,
      content: editedContent,
    });
    setIsEditing(false);
  };

  function renderContent(
    content: string | MessageContentPart[]
  ): React.ReactNode {
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
              <Button variant="ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>Save</Button>
            </div>
          </div>
        );
      }

      return (
        <div className="prose prose-sm markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      );
    }
    return content.map((part, idx) => {
      if (part.type === "input_text" || part.type === "output_text") {
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
              className="max-w-full max-h-80 rounded-lg block my-2"
            />
          );
        }
        return (
          <span key={idx} className="text-red-500">
            Image unavailable
          </span>
        );
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
        <Avatar
          className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium",
            isUser
              ? "bg-streamwise-500 text-white ml-2"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 mr-2"
          )}
        >
          <span>{isUser ? "You" : "AI"}</span>
        </Avatar>

        <div className="relative group">
          {/* Mini bubble for action buttons */}
          <div className="relative group">
            {/*
              Bridge logic:
              - If this is the first bubble (bubbleIndex === 0), render a bottom bridge with high z-index (mini bubble pops downward).
              - For all other bubbles, render a top bridge (mini bubble pops upward).
              This ensures correct pop direction and hover bridging based on bubble position.
            */}
            {bubbleIndex === 0 ? (
              <div
                className="absolute left-1/2 w-[80px] h-[24px] -translate-x-1/2 top-full bottom-auto z-50 pointer-events-auto"
                tabIndex={-1}
                aria-hidden="true"
              />
            ) : (
              <div
                className="absolute left-1/2 z-10 w-[60px] h-[16px] -translate-x-1/2 bottom-full pointer-events-auto"
                tabIndex={-1}
                aria-hidden="true"
              />
            )}
            {/* Mini bubble for action buttons, pop direction based on bubble index */}
            {(() => {
              // Deduplicated: single render, pop direction logic inside
              const popDirection = bubbleIndex === 0 ? "down" : "up";
              return (
                <div
                  className={cn(
                    "absolute left-1/2 z-20 flex items-center justify-center",
                    "transition-all duration-200",
                    "pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 opacity-0",
                    "action-mini-bubble",
                    "transform -translate-x-1/2",
                    popDirection === "down" 
                      ? "top-full bottom-auto mt-2 mb-0" 
                      : "top-auto bottom-full mt-0 mb-2"
                  )}
                  tabIndex={-1}
                >
                  {/* Bubble tail: only outline the outer two lines, match mini bubble border */}
                  <svg
                    className={`absolute left-1/2 ${bubbleIndex !== 0 ? "top-[calc(100%-1px)]" : "bottom-[calc(100%-1px)]"} -translate-x-1/2 z-50 pointer-events-none`}
                    width="28" height="14" viewBox="0 0 28 14" fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d={bubbleIndex !== 0
                        ? "M4,0 L14,14 L24,0"
                        : "M4,14 L14,0 L24,14"}
                      fill="white"
                      stroke="#e5e7eb"
                      strokeWidth="1"
                      strokeLinejoin="round"
                      className="dark:stroke-gray-700"
                    />
                  </svg>
                  <div
                    className={cn(
                      "rounded-full bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700 px-2 py-1 flex gap-1 items-center min-h-[36px] min-w-auto",
                      "minibubble-compact"
                    )}
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
                          const raw = message.content
                            .map((part) =>
                              part.type === "input_text" ||
                              part.type === "output_text"
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
                      <svg
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                      >
                        <rect
                          x="9"
                          y="9"
                          width="13"
                          height="13"
                          rx="2"
                          ry="2"
                        />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </Button>
                  </div>
                </div>
              );
            })()}

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
              {/* Show status indicator if present (only for assistant messages with no content yet) */}
              {!isUser && message.status && !message.content && (
                <div className="flex items-center gap-2 text-sm opacity-70 italic">
                  <div className="animate-pulse">●</div>
                  <span>
                    {message.status === "thinking" 
                      ? "Thinking..." 
                      : message.status === "searching"
                      ? message.statusDetails 
                        ? `Searching: ${message.statusDetails}`
                        : "Searching the web..."
                      : message.status === "processing"
                      ? "Processing results..."
                      : ""}
                  </span>
                </div>
              )}
              
              <div
                className={cn(
                  "prose prose-sm max-w-none break-words",
                  isUser ? "prose-user" : "prose-invert"
                )}
              >
                {renderContent(message.content)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
