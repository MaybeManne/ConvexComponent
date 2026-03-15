"use client";

export function BugReport({ bugs }: { bugs: any[] }) {
  if (bugs.length === 0) return null;

  const sorted = [...bugs].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, major: 1, minor: 2 };
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
  });

  const statusIcon: Record<string, string> = { found: "●", fixing: "◐", fixed: "✓", failed: "✕" };
  const statusColor: Record<string, string> = { found: "text-red-400", fixing: "text-yellow-400", fixed: "text-green-400", failed: "text-zinc-500" };
  const severityColor: Record<string, string> = {
    critical: "text-red-400 border-red-400/20 bg-red-400/5",
    major: "text-orange-400 border-orange-400/20 bg-orange-400/5",
    minor: "text-yellow-400 border-yellow-400/20 bg-yellow-400/5",
  };

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-3">
      <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">
        Bug Report · {bugs.length} issues
      </h3>
      <div className="space-y-1.5">
        {sorted.map((bug) => (
          <div
            key={bug._id}
            className={`border rounded-lg px-2 py-1.5 animate-slide-in ${severityColor[bug.severity] ?? "text-zinc-400 border-zinc-700 bg-zinc-800/50"}`}
          >
            <div className="flex items-start gap-2">
              <span className={`text-xs mt-0.5 ${statusColor[bug.status] ?? "text-zinc-500"}`}>
                {statusIcon[bug.status] ?? "?"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono uppercase opacity-70">{bug.severity}</span>
                  <span className="text-[10px] font-mono opacity-50">{bug.status}</span>
                </div>
                <p className="text-xs text-zinc-300 line-clamp-2">{bug.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
