"use client";

export function AgentCard({ task, bugs, features }: { task: any; bugs: any[]; features: any[] }) {
  const isRunning = task.status === "running";
  const latestScreenshot = task.screenshots?.[task.screenshots.length - 1];
  const latestProgress = task.progress?.slice(-3) ?? [];

  const relatedBug = bugs.find((b) => b.taskId === task._id || b.fixTaskId === task._id);
  const relatedFeature = features.find((f) => f.taskId === task._id);

  let agentType = "AGENT";
  let agentColor = "text-blue-400 bg-blue-400/10 border-blue-400/20";

  if (relatedBug?.fixTaskId === task._id) {
    agentType = "FIX";
    agentColor = "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
  } else if (relatedFeature) {
    agentType = "EVOLVE";
    agentColor = "text-purple-400 bg-purple-400/10 border-purple-400/20";
  } else if (relatedBug) {
    agentType = "ATTACK";
    agentColor = "text-red-400 bg-red-400/10 border-red-400/20";
  }

  const statusColor: Record<string, string> = {
    queued: "bg-zinc-500",
    running: "bg-blue-400 animate-pulse",
    succeeded: "bg-green-400",
    failed: "bg-red-400",
    canceled: "bg-zinc-500",
  };

  return (
    <div
      className={`bg-zinc-900/50 border rounded-xl p-3 animate-slide-in ${
        isRunning ? "border-zinc-600 animate-pulse-glow" : "border-zinc-800"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor[task.status] ?? "bg-zinc-500"}`} />
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${agentColor}`}>{agentType}</span>
        </div>
        <span className="text-xs font-mono text-zinc-500">{task.status}</span>
      </div>

      {latestProgress.length > 0 && (
        <div className="space-y-0.5 mb-2">
          {latestProgress.map((p: any, i: number) => (
            <p key={i} className="text-[11px] font-mono text-zinc-400 truncate">
              {p.message ?? p.type ?? String(p)}
            </p>
          ))}
        </div>
      )}

      {latestScreenshot && (
        <img
          src={latestScreenshot}
          className="w-full rounded-lg border border-zinc-700 cursor-pointer hover:opacity-80 transition-opacity mt-1"
          onClick={() => window.open(latestScreenshot, "_blank")}
        />
      )}
    </div>
  );
}
