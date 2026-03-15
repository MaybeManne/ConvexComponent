"use client";
import { useState } from "react";

export function CycleCard({ cycle, bugs }: { cycle: any; bugs: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const isActive = cycle.phase !== "complete";

  const phaseColor: Record<string, string> = {
    attacking: "text-red-400 bg-red-400/10 border-red-400/20",
    fixing: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    researching: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    evolving: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    complete: "text-green-400 bg-green-400/10 border-green-400/20",
  };

  return (
    <div
      className={`bg-zinc-900/50 border rounded-xl p-3 transition-all animate-slide-in ${
        isActive ? "border-zinc-600" : "border-zinc-800"
      }`}
    >
      <div
        className="flex items-center justify-between mb-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-300 font-semibold">Cycle {cycle.cycleNumber}</span>
          {isActive && <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />}
        </div>
        <span
          className={`text-xs font-mono px-2 py-0.5 rounded-full border ${phaseColor[cycle.phase] ?? "text-zinc-400 bg-zinc-400/10 border-zinc-400/20"}`}
        >
          {cycle.phase}
        </span>
      </div>

      <div className="flex gap-3 text-xs text-zinc-500 font-mono">
        <span className="text-red-400">{cycle.bugsFound} found</span>
        <span className="text-green-400">{cycle.bugsFixed} fixed</span>
        {cycle.featureAdded && <span className="text-purple-400 truncate">+{cycle.featureAdded}</span>}
      </div>

      {cycle.featureAdded && (
        <div className="mt-2 text-xs font-mono text-zinc-500 bg-zinc-800/50 rounded-lg px-2 py-1">
          Added: {cycle.featureAdded}
        </div>
      )}

      {expanded && (cycle.screenshotBefore || cycle.screenshotAfter) && (
        <div className="mt-2 flex gap-1">
          {cycle.screenshotBefore && (
            <div className="flex-1">
              <p className="text-[10px] font-mono text-zinc-600 mb-1">Before</p>
              <img
                src={cycle.screenshotBefore}
                className="w-full rounded-lg border border-zinc-700 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => window.open(cycle.screenshotBefore, "_blank")}
              />
            </div>
          )}
          {cycle.screenshotAfter && (
            <div className="flex-1">
              <p className="text-[10px] font-mono text-zinc-600 mb-1">After</p>
              <img
                src={cycle.screenshotAfter}
                className="w-full rounded-lg border border-zinc-700 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => window.open(cycle.screenshotAfter, "_blank")}
              />
            </div>
          )}
        </div>
      )}

      {expanded && bugs.length > 0 && (
        <div className="mt-2 space-y-1">
          {bugs.map((bug) => (
            <div key={bug._id} className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  bug.status === "fixed"
                    ? "bg-green-400"
                    : bug.status === "fixing"
                      ? "bg-yellow-400"
                      : bug.status === "failed"
                        ? "bg-red-400"
                        : "bg-zinc-500"
                }`}
              />
              <span className="truncate">{bug.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
