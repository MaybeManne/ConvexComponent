"use client";

import { StatusBadge } from "./StatusBadge";
import { Timeline } from "./Timeline";
import { JsonViewer } from "./JsonViewer";
import { Screenshots } from "./Screenshots";
import { formatDistanceToNow, formatDuration } from "../lib/utils";
import { StopCircle, Clock, CheckCircle2, AlertTriangle, FileText } from "lucide-react";

interface ProgressEvent {
  id: string;
  ts: number;
  level: "info" | "warn" | "error";
  kind: "system" | "browser" | "action" | "thought" | "result";
  message: string;
  data?: Record<string, unknown>;
}

interface Task {
  _id: string;
  prompt: string;
  status: "queued" | "running" | "succeeded" | "failed" | "canceled";
  progress: unknown[];
  screenshots: unknown[];
  result?: unknown;
  error?: unknown;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
}

interface TaskDetailProps {
  task: Task;
  onCancel: () => Promise<void>;
  isRunning?: boolean;
}

/**
 * Render the task result safely.
 *
 * Result can be:
 * - string: Render as a text block
 * - object: Render as JSON
 * - null/undefined: Don't render
 */
function ResultDisplay({ result }: { result: unknown }) {
  // Handle null/undefined
  if (result === null || result === undefined) {
    return null;
  }

  // Handle string results - render as text block
  if (typeof result === "string") {
    return (
      <div className="p-4 bg-neutral-800 border border-neutral-700 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-neutral-400" />
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
            Summary
          </span>
        </div>
        <p className="text-neutral-200 whitespace-pre-wrap leading-relaxed">
          {result}
        </p>
      </div>
    );
  }

  // Handle object/array results - render as JSON
  if (typeof result === "object") {
    return <JsonViewer data={result} />;
  }

  // Handle other types - convert to string and display
  return (
    <div className="p-4 bg-neutral-800 border border-neutral-700 rounded-lg">
      <p className="text-neutral-200 font-mono text-sm">
        {String(result)}
      </p>
    </div>
  );
}

export function TaskDetail({ task, onCancel, isRunning }: TaskDetailProps) {
  const taskIsRunning = isRunning ?? (task.status === "running" || task.status === "queued");

  // Type-safe accessors for fields that come from Convex as unknown
  const screenshots: string[] = Array.isArray(task.screenshots)
    ? task.screenshots.filter((s): s is string => typeof s === "string")
    : [];
  const taskError = task.error as { message: string; details?: unknown } | undefined;
  const progress: ProgressEvent[] = Array.isArray(task.progress)
    ? (task.progress as ProgressEvent[])
    : [];

  const duration =
    task.startedAt && task.finishedAt
      ? task.finishedAt - task.startedAt
      : task.startedAt
        ? Date.now() - task.startedAt
        : null;

  // Determine current phase from latest progress event
  const currentPhase =
    progress.length > 0
      ? progress[progress.length - 1].message
      : task.status === "queued"
        ? "Waiting to start..."
        : "Initializing...";

  // Check if result exists and is not null/undefined
  const hasResult = task.result !== null && task.result !== undefined;

  return (
    <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-neutral-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <StatusBadge status={task.status} />
              {duration !== null && (
                <span className="text-sm text-neutral-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(duration)}
                </span>
              )}
            </div>
            <p className="text-lg font-medium text-neutral-100">{task.prompt}</p>
            <p className="text-sm text-neutral-500 mt-1">
              Started {formatDistanceToNow(task.createdAt)}
            </p>
          </div>
          {taskIsRunning && (
            <button
              onClick={onCancel}
              className="
                flex items-center gap-2 px-4 py-2
                bg-rose-950/50 text-rose-400 border border-rose-800/50
                rounded-lg font-medium
                hover:bg-rose-900/50 hover:border-rose-700/50
                transition-all duration-150
              "
            >
              <StopCircle className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>

        {/* Current Phase */}
        {taskIsRunning && (
          <div className="mt-4 p-4 bg-sky-950/30 border border-sky-800/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-sky-300">
                {currentPhase}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-neutral-800">
        {/* Timeline */}
        <div className="p-6">
          <h3 className="font-semibold text-neutral-200 mb-4">Timeline</h3>
          <Timeline events={progress} isRunning={taskIsRunning} />
        </div>

        {/* Screenshots + Result */}
        <div className="p-6 space-y-6">
          {/* Screenshots */}
          {screenshots.length > 0 ? (
            <div>
              <h3 className="font-semibold text-neutral-200 mb-4">Screenshots</h3>
              <Screenshots urls={screenshots} />
            </div>
          ) : null}

          {/* Result - handles both string and object results */}
          {task.status === "succeeded" && hasResult ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-neutral-200">Result</h3>
              </div>
              <ResultDisplay result={task.result} />
            </div>
          ) : null}

          {/* Error */}
          {task.status === "failed" && taskError ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 className="font-semibold text-neutral-200">Error</h3>
              </div>
              <div className="p-4 bg-rose-950/30 border border-rose-800/30 rounded-lg">
                <p className="text-rose-400 font-medium">{taskError.message}</p>
                {taskError.details != null ? (
                  <div className="mt-3">
                    <JsonViewer data={taskError.details} />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Empty state for screenshots/result */}
          {screenshots.length === 0 && !hasResult && !taskError && (
            <div className="text-center py-8 text-neutral-600">
              <p className="text-sm">
                {taskIsRunning
                  ? "Screenshots and results will appear here..."
                  : "No additional data available"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
