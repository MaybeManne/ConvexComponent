"use client";

import { useEffect, useRef } from "react";
import {
  Monitor,
  MousePointer2,
  Brain,
  CheckCircle,
  AlertCircle,
  Settings,
  Loader2,
} from "lucide-react";

interface ProgressEvent {
  id: string;
  ts: number;
  level: "info" | "warn" | "error";
  kind: "system" | "browser" | "action" | "thought" | "result";
  message: string;
  data?: Record<string, unknown>;
}

interface TimelineProps {
  events: ProgressEvent[];
  isRunning: boolean;
}

const kindConfig: Record<
  ProgressEvent["kind"],
  {
    icon: typeof Monitor;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  system: {
    icon: Settings,
    color: "text-neutral-400",
    bgColor: "bg-neutral-800",
    label: "System",
  },
  browser: {
    icon: Monitor,
    color: "text-sky-400",
    bgColor: "bg-sky-950/50",
    label: "Browser",
  },
  action: {
    icon: MousePointer2,
    color: "text-violet-400",
    bgColor: "bg-violet-950/50",
    label: "Action",
  },
  thought: {
    icon: Brain,
    color: "text-amber-400",
    bgColor: "bg-amber-950/50",
    label: "Thinking",
  },
  result: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bgColor: "bg-emerald-950/50",
    label: "Result",
  },
};

const levelStyles: Record<ProgressEvent["level"], string> = {
  info: "text-neutral-300",
  warn: "text-amber-400",
  error: "text-rose-400",
};

/**
 * Format timestamp to human-readable time
 */
function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;

  if (diff < 1000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return formatTime(ts);
}

export function Timeline({ events, isRunning }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive while running
  useEffect(() => {
    if (isRunning && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [events.length, isRunning]);

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-neutral-600">
        {isRunning ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
            <span className="text-sm">Waiting for events...</span>
          </div>
        ) : (
          <span className="text-sm">No events recorded</span>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative max-h-96 overflow-y-auto pr-2">
      {/* Connector line */}
      <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-neutral-800" />

      {/* Events */}
      <div className="space-y-4">
        {events.map((event, index) => {
          const config = kindConfig[event.kind] ?? kindConfig.action;
          const Icon = event.level === "error" ? AlertCircle : config.icon;
          const isLast = index === events.length - 1;

          return (
            <div
              key={event.id}
              className={`
                relative pl-10 animate-slide-in
                ${isLast && isRunning ? "opacity-100" : ""}
              `}
            >
              {/* Icon */}
              <div
                className={`
                  absolute left-1.5 w-5 h-5 rounded-full
                  flex items-center justify-center
                  border-2 border-neutral-950
                  ${event.level === "error" ? "bg-rose-950/50" : config.bgColor}
                `}
              >
                <Icon
                  className={`w-3 h-3 ${event.level === "error" ? "text-rose-400" : config.color}`}
                />
              </div>

              {/* Content */}
              <div className="min-w-0">
                {/* Kind label for non-system events */}
                {event.kind !== "system" && (
                  <span
                    className={`
                      text-xs font-medium px-1.5 py-0.5 rounded
                      ${config.bgColor} ${config.color}
                    `}
                  >
                    {config.label}
                  </span>
                )}
                <p
                  className={`text-sm mt-1 ${levelStyles[event.level]}`}
                >
                  {event.message}
                </p>
                <p className="text-xs text-neutral-600 mt-0.5">
                  {formatTime(event.ts)}
                  {isLast && isRunning && (
                    <span className="ml-2 text-sky-400">
                      ({formatRelativeTime(event.ts)})
                    </span>
                  )}
                </p>
              </div>

              {/* Running indicator for last event */}
              {isLast && isRunning && (
                <div className="absolute left-1.5 -bottom-4 w-5 h-5 flex items-center justify-center">
                  <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
