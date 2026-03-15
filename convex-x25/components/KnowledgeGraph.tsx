"use client";

export function KnowledgeGraph({ research, features }: { research: any[]; features: any[] }) {
  const bySource = research.reduce((acc: Record<string, any[]>, r: any) => {
    if (!acc[r.source]) acc[r.source] = [];
    acc[r.source].push(r);
    return acc;
  }, {});

  const sourceColor: Record<string, string> = {
    ProductHunt: "text-orange-400",
    Reddit: "text-orange-300",
    "App Store": "text-blue-400",
  };

  return (
    <div className="space-y-4">
      {Object.keys(bySource).length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-2">Research</h3>
          <div className="space-y-3">
            {Object.entries(bySource).map(([source, findings]) => (
              <div key={source} className="space-y-1.5">
                <p className={`text-xs font-mono font-semibold ${sourceColor[source] ?? "text-zinc-400"}`}>
                  {source}
                </p>
                {(findings as any[]).map((r: any) => (
                  <div key={r._id} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 animate-slide-in">
                    <p className="text-xs text-zinc-300 leading-relaxed">{r.finding}</p>
                    {r.featureSuggestion && (
                      <p className="text-[11px] font-mono text-purple-400 mt-1">→ {r.featureSuggestion}</p>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {features.filter((f) => f.status === "added" || f.status === "adding").length > 0 && (
        <div>
          <h3 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-2">Features Added</h3>
          <div className="space-y-1.5">
            {features
              .filter((f) => f.status === "added" || f.status === "adding")
              .map((f) => (
                <div
                  key={f._id}
                  className={`border rounded-lg px-3 py-2 animate-slide-in ${
                    f.status === "added"
                      ? "bg-purple-500/5 border-purple-500/20"
                      : "bg-blue-500/5 border-blue-500/20"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-200">{f.name}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">{f.reasoning.slice(0, 80)}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {research.length === 0 && features.length === 0 && (
        <div className="text-zinc-600 text-xs font-mono text-center py-8">
          Research findings will appear here...
        </div>
      )}
    </div>
  );
}
