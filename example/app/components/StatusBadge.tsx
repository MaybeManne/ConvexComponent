"use client";

import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Ban,
} from "lucide-react";

type TaskStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";

interface StatusBadgeProps {
  status: TaskStatus;
  size?: "sm" | "md";
}

const statusConfig: Record<
  TaskStatus,
  {
    label: string;
    icon: typeof Clock;
    className: string;
  }
> = {
  queued: {
    label: "Queued",
    icon: Clock,
    className: "bg-neutral-800 text-neutral-400 border-neutral-700",
  },
  running: {
    label: "Running",
    icon: Loader2,
    className: "bg-sky-950/50 text-sky-400 border-sky-800/50",
  },
  succeeded: {
    label: "Succeeded",
    icon: CheckCircle2,
    className: "bg-emerald-950/50 text-emerald-400 border-emerald-800/50",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-rose-950/50 text-rose-400 border-rose-800/50",
  },
  canceled: {
    label: "Canceled",
    icon: Ban,
    className: "bg-amber-950/50 text-amber-400 border-amber-800/50",
  },
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-sm gap-1.5",
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium border
        ${sizeClasses[size]}
        ${config.className}
      `}
    >
      <Icon
        className={`
          ${size === "sm" ? "w-3 h-3" : "w-4 h-4"}
          ${status === "running" ? "animate-spin" : ""}
        `}
      />
      <span>{config.label}</span>
    </span>
  );
}
