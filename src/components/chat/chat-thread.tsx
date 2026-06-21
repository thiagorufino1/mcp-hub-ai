"use client";

import { useEffect, useRef } from "react";

import { MessageBubble } from "@/components/chat/message-bubble";
import { ToolActivityCard } from "@/components/chat/tool-activity-card";
import type { Message, ToolEvent } from "@/types/chat";

type ThreadItem =
  | { id: string; type: "message"; value: Message }
  | { id: string; type: "tool"; value: ToolEvent };

type Props = {
  isStreaming?: boolean;
  items: ThreadItem[];
  onFeedback: (messageId: string, value: "up" | "down") => void;
  scrollRequest?: number;
};

export function ChatThread({ isStreaming, items, onFeedback, scrollRequest = 0 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) {
      return undefined;
    }
    const container = currentContainer;

    function updateStickiness() {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      stickToBottomRef.current = distanceFromBottom < 120;
    }

    updateStickiness();
    container.addEventListener("scroll", updateStickiness, { passive: true });
    return () => container.removeEventListener("scroll", updateStickiness);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !stickToBottomRef.current) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: isStreaming ? "auto" : "smooth",
    });
  }, [isStreaming, items]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    stickToBottomRef.current = true;
    const scrollToBottom = () => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    };

    scrollToBottom();
    const frame = window.requestAnimationFrame(scrollToBottom);

    return () => window.cancelAnimationFrame(frame);
  }, [scrollRequest]);

  return (
    <div className="app-scroll min-h-0 flex-1 overflow-y-auto" ref={containerRef}>
      <div className="flex min-h-full w-full flex-col px-4 pb-8 pt-6 sm:px-10 sm:pt-8">
        <div className="mx-auto w-full max-w-[860px] space-y-4 sm:space-y-5 lg:max-w-[min(100%,940px)] xl:max-w-[min(100%,980px)] 2xl:max-w-[1020px]">
          {items.map((item) =>
            item.type === "message" ? (
              <MessageBubble key={item.id} message={item.value} onFeedback={onFeedback} />
            ) : (
              <ToolActivityCard event={item.value} key={item.id} />
            ),
          )}
        </div>
      </div>
    </div>
  );
}
