"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useRouter } from "next/navigation";

export default function Home() {
  const [url, setUrl] = useState("");
  const [cycles, setCycles] = useState(3);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const start = useMutation(api.sessions.startSession);
  const sessions = useQuery(api.sessions.listSessions);

  const go = async () => {
    if (!url.trim() || loading) return;
    setLoading(true);
    try {
      const { sessionId } = await start({ bloomUrl: url.trim(), maxCycles: cycles });
      router.push(`/session/${sessionId}`);
    } catch { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-white leading-tight">
          Bloom Autopilot
        </h1>
        <p className="text-[15px] text-neutral-500 mt-3 leading-relaxed">
          AI agents that test your app, fix bugs, and add features.
          Paste your Bloom editor URL (bloom.diy) or app preview URL (app.diy).
        </p>

        <div className="mt-10">
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && go()}
            placeholder="Paste your Bloom URL"
            className="w-full bg-transparent text-[16px] text-white placeholder:text-neutral-700 border-b border-neutral-800 focus:border-neutral-500 pb-4 outline-none transition-colors duration-300"
          />
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              {[1, 2, 3, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setCycles(n)}
                  className={`text-[13px] px-2.5 py-1 rounded-md transition-colors duration-200 cursor-pointer ${
                    cycles === n ? "bg-neutral-800 text-white" : "text-neutral-600 hover:text-neutral-400"
                  }`}
                >
                  {n}
                </button>
              ))}
              <span className="text-[13px] text-neutral-700">cycles</span>
            </div>
            <button
              onClick={go}
              disabled={loading || !url.trim()}
              className="text-[15px] font-medium text-white disabled:text-neutral-800 cursor-pointer transition-colors duration-200"
            >
              {loading ? "Starting..." : "Start"}
            </button>
          </div>
        </div>

        {sessions && sessions.length > 0 && (
          <div className="mt-16">
            <p className="text-[13px] text-neutral-600 mb-4">Recent</p>
            {sessions.map((s: any) => (
              <button
                key={s._id}
                onClick={() => router.push(`/session/${s._id}`)}
                className="w-full flex items-center justify-between py-3.5 border-t border-neutral-900 cursor-pointer group"
              >
                <span className="text-[14px] text-neutral-600 group-hover:text-white transition-colors duration-200 truncate max-w-[280px]">
                  {s.bloomUrl}
                </span>
                <span className={`text-[13px] transition-colors duration-200 ${
                  s.status === "done" ? "text-green-500" : s.status === "running" ? "text-blue-400" : "text-neutral-700"
                }`}>
                  {s.status === "done" ? `${s.totalBugsFixed} fixed` : s.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
