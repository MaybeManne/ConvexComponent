"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { TaskInput } from "./components/TaskInput";
import { TaskList } from "./components/TaskList";
import { TaskDetail } from "./components/TaskDetail";
import { Bot, Zap, AlertTriangle } from "lucide-react";

export default function Home() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Reactive queries - no polling needed!
  const tasksResult = useQuery(api.tasks.listTasks, { limit: 50 });
  const selectedTask = useQuery(
    api.tasks.getTask,
    selectedTaskId ? { taskId: selectedTaskId as any } : "skip"
  );

  // Mutations
  const startTask = useMutation(api.tasks.startTask);
  const cancelTask = useMutation(api.tasks.cancelTask);

  // Check if the SELECTED task is running (for cancel button only)
  const isSelectedTaskRunning = selectedTask?.status === "running" || selectedTask?.status === "queued";

  const handleStartTask = async (prompt: string) => {
    console.log("[Page] handleStartTask called with prompt:", prompt.slice(0, 50));
    try {
      const { taskId } = await startTask({ prompt });
      console.log("[Page] Task created:", taskId);
      setSelectedTaskId(taskId);
    } catch (err) {
      console.error("[Page] startTask mutation failed:", err);
      throw err; // Re-throw so TaskInput can handle it
    }
  };

  const handleCancelTask = async () => {
    if (selectedTaskId) {
      await cancelTask({ taskId: selectedTaskId as any });
    }
  };

  const tasks = tasksResult?.tasks ?? [];

  // Check for any running tasks (for UI indication in header only)
  const hasRunningTask = tasks.some((t) => t.status === "running" || t.status === "queued");

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-indigo-600 rounded-xl">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-neutral-100">Browser Use Agent</h1>
                <p className="text-sm text-neutral-500">
                  Durable browser automation powered by Convex
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {hasRunningTask && (
                <div className="flex items-center gap-2 text-sm text-sky-400">
                  <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse" />
                  <span>Task running</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Browser Use Cloud</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Sidebar - Task List */}
          <aside className="lg:col-span-3">
            <div className="bg-neutral-900 rounded-xl border border-neutral-800">
              <div className="p-5 border-b border-neutral-800">
                <h2 className="font-semibold text-neutral-100">Task History</h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Tasks persist through page refreshes
                </p>
              </div>
              <TaskList
                tasks={tasks}
                selectedTaskId={selectedTaskId}
                onSelectTask={setSelectedTaskId}
              />
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="lg:col-span-9 space-y-6">
            {/* Task Input - NO props that affect disable state */}
            <TaskInput onSubmit={handleStartTask} />

            {/* Task Detail */}
            {selectedTask ? (
              <TaskDetail
                task={selectedTask}
                onCancel={handleCancelTask}
                isRunning={isSelectedTaskRunning}
              />
            ) : (
              <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-12 text-center">
                <Bot className="w-16 h-16 mx-auto text-neutral-700 mb-4" />
                <h3 className="text-lg font-medium text-neutral-400">
                  No task selected
                </h3>
                <p className="text-sm text-neutral-600 mt-2">
                  Enter a prompt above or select a task from the history
                </p>
              </div>
            )}

            {/* API Key Warning (if applicable) */}
            {selectedTask?.status === "failed" &&
              selectedTask?.error?.message?.includes("BROWSER_USE_API_KEY") && (
              <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-200">
                      API Key Required
                    </h4>
                    <p className="text-sm text-amber-400/80 mt-1">
                      Set your Browser Use Cloud API key:
                    </p>
                    <code className="block mt-3 px-4 py-3 bg-neutral-900 rounded-lg text-xs font-mono text-neutral-300">
                      npx convex env set BROWSER_USE_API_KEY your_api_key_here
                    </code>
                  </div>
                </div>
              </div>
            )}

            {/* Durability Note */}
            <div className="bg-indigo-950/30 border border-indigo-800/50 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-indigo-600/20 rounded-lg">
                  <Zap className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h4 className="font-medium text-indigo-200">
                    Durability Test
                  </h4>
                  <p className="text-sm text-indigo-400/80 mt-1">
                    Try refreshing the page while a task is running. The workflow
                    continues executing on the server, and the UI will reconnect
                    and show live progress when you return.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
