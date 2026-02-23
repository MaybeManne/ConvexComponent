"use client";

import { StatusBadge } from "./StatusBadge";
import { formatDistanceToNow } from "../lib/utils";

interface TaskSummary {
  _id: string;
  prompt: string;
  status: string;
  createdAt: number;
  finishedAt?: number;
}

interface TaskListProps {
  tasks: TaskSummary[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}

export function TaskList({ tasks, selectedTaskId, onSelectTask }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="p-6 text-center text-neutral-600">
        <p className="text-sm">No tasks yet</p>
        <p className="text-xs mt-1">Run a task to see it here</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-neutral-800 max-h-[600px] overflow-y-auto">
      {tasks.map((task) => (
        <button
          key={task._id}
          onClick={() => onSelectTask(task._id)}
          className={`
            w-full p-4 text-left transition-colors duration-150
            ${selectedTaskId === task._id
              ? "bg-neutral-800/80"
              : "hover:bg-neutral-800/50"
            }
          `}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-neutral-200 line-clamp-2 flex-1">
              {truncatePrompt(task.prompt)}
            </p>
            <StatusBadge status={task.status as any} size="sm" />
          </div>
          <p className="text-xs text-neutral-600 mt-2">
            {formatDistanceToNow(task.createdAt)}
          </p>
        </button>
      ))}
    </div>
  );
}

function truncatePrompt(prompt: string, maxLength = 60): string {
  if (prompt.length <= maxLength) return prompt;
  return prompt.substring(0, maxLength).trim() + "...";
}
