"use client";

import { useState } from "react";
import { Play, Sparkles, Loader2, AlertCircle } from "lucide-react";

const EXAMPLE_PROMPTS = [
  {
    label: "Book Airbnb",
    prompt: "Go to airbnb.com and find a room in Barcelona for tomorrow",
    icon: "🏠",
  },
  {
    label: "Find Flights",
    prompt: "Search for the cheapest flights from NYC to London next month",
    icon: "✈️",
  },
  {
    label: "Newsletter",
    prompt: "Go to techcrunch.com and sign up for their newsletter",
    icon: "📧",
  },
];

interface TaskInputProps {
  onSubmit: (prompt: string) => Promise<void>;
}

export function TaskInput({ onSubmit }: TaskInputProps) {
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SIMPLIFIED: Run button only depends on prompt content and submitting state
  // No dependency on: selectedTask, selectedTaskId, tasksResult, isRunning, status
  const canRun = prompt.trim().length > 0 && !isSubmitting;

  // Debug logging
  console.log("[TaskInput]", { prompt: prompt.slice(0, 50), isSubmitting, canRun });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isSubmitting) {
      console.log("[TaskInput] Submit blocked:", { trimmedPrompt: !!trimmedPrompt, isSubmitting });
      return;
    }

    // Validate prompt length
    if (trimmedPrompt.length > 10000) {
      setError("Prompt is too long (max 10000 characters)");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    console.log("[TaskInput] Starting submission...");

    try {
      await onSubmit(trimmedPrompt);
      console.log("[TaskInput] Submission succeeded");
      setPrompt("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start task";
      console.error("[TaskInput] Submission failed:", message);
      setError(message);
    } finally {
      // CRITICAL: Always reset isSubmitting, regardless of success or error
      console.log("[TaskInput] Resetting isSubmitting to false");
      setIsSubmitting(false);
    }
  };

  const handleExampleClick = (examplePrompt: string) => {
    if (isSubmitting) return;
    setPrompt(examplePrompt);
    setError(null);
  };

  return (
    <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
      {/* Main Input */}
      <form onSubmit={handleSubmit} className="p-6">
        <label htmlFor="prompt" className="block text-sm font-medium text-neutral-300 mb-3">
          What would you like the agent to do?
        </label>
        <div className="relative">
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setError(null);
            }}
            placeholder="Go to airbnb.com and find a room in Barcelona for tomorrow..."
            className={`
              w-full min-h-[120px] p-4 pr-28 rounded-xl resize-none
              bg-neutral-800 border border-neutral-700
              text-neutral-100 placeholder:text-neutral-600
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-150
              ${error ? "border-rose-500 focus:ring-rose-500" : ""}
            `}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={!canRun}
            className="
              absolute right-3 bottom-3
              flex items-center gap-2 px-5 py-2.5
              bg-indigo-600 text-white font-medium
              rounded-lg
              hover:bg-indigo-500
              disabled:opacity-50 disabled:cursor-not-allowed
              disabled:hover:bg-indigo-600
              transition-all duration-150
            "
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Starting...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run</span>
              </>
            )}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-rose-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Character count */}
        {prompt.length > 8000 && (
          <div className={`mt-2 text-xs ${prompt.length > 10000 ? "text-rose-400" : "text-neutral-500"}`}>
            {prompt.length.toLocaleString()} / 10,000 characters
          </div>
        )}
      </form>

      {/* Example Prompts */}
      <div className="px-6 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-neutral-600" />
          <span className="text-sm text-neutral-500">Try an example:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => handleExampleClick(example.prompt)}
              disabled={isSubmitting}
              className="
                flex items-center gap-2 px-4 py-2
                bg-neutral-800 border border-neutral-700
                text-neutral-300
                hover:bg-neutral-700 hover:border-neutral-600
                disabled:opacity-50 disabled:cursor-not-allowed
                rounded-full text-sm
                transition-all duration-150
              "
            >
              <span>{example.icon}</span>
              <span>{example.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
