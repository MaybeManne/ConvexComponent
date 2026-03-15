"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { BattleCharacters, CharacterSelect } from "../../../components/BattleCharacters";
import { SuperMoveOverlay } from "../../../components/SuperMove";

// Demo
const DEMO_BUGS = [
  "Clicking 'Delete' marks the task as complete instead of removing it",
  "Clicking 'Complete' removes the task from the list entirely",
  "Adding a new task doesn't clear the input field",
  "Editing a task saves the change to the wrong task",
];

function useDemo() {
  const [on, set] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [bugs, setBugs] = useState<string[]>([]);
  const [fixed, setFixed] = useState(0);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cl = () => { if (t.current) clearTimeout(t.current); };

  const start = useCallback(() => {
    set(true); setPhase("attacking"); setBugs([]); setFixed(0);
    let i = 0;
    const find = () => {
      if (i < DEMO_BUGS.length) { setBugs(p => [...p, DEMO_BUGS[i]]); i++; t.current = setTimeout(find, 1000); }
      else {
        setPhase("fixing");
        let f = 0;
        const fix = () => {
          if (f < DEMO_BUGS.length) { f++; setFixed(f); t.current = setTimeout(fix, 1200); }
          else setPhase("complete");
        };
        t.current = setTimeout(fix, 800);
      }
    };
    t.current = setTimeout(find, 800);
  }, []);

  const stop = useCallback(() => { cl(); set(false); setPhase("idle"); setBugs([]); setFixed(0); }, []);
  useEffect(() => cl, []);
  return { on, phase, bugs, fixed, start, stop };
}

export default function SessionPage() {
  const { id } = useParams();
  const sid = id as Id<"sessions">;
  const router = useRouter();
  const [hero, setHero] = useState("batman");
  const [villain, setVillain] = useState("joker");
  const [superMove, setSuperMove] = useState(false);
  const [prevBs, setPrevBs] = useState("idle");
  const [victory, setVictory] = useState(false);
  const [photos, setPhotos] = useState(false);

  const session = useQuery(api.sessions.getSession, { sessionId: sid });
  const cycles = useQuery(api.sessions.listCycles, { sessionId: sid });
  const dbBugs = useQuery(api.sessions.listBugs, { sessionId: sid });
  const tasks = useQuery(api.tasks.listTasks, { limit: 50 });
  const pauseM = useMutation(api.sessions.pauseSession);
  const stopM = useMutation(api.sessions.stopSession);
  const resumeM = useMutation(api.sessions.resumeSession);
  const demo = useDemo();

  const all = tasks?.tasks ?? [];
  const noCredits = all.some((t: any) => t.status === "failed" && t.error?.message?.includes("402"));
  const cyc = cycles?.[0];
  const cb = dbBugs?.filter((b: any) => cyc && b.cycleId === cyc._id) ?? [];
  const shots = all.flatMap((t: any) => (t.screenshots ?? []) as string[]).filter(Boolean);

  const bugList = demo.on ? demo.bugs : cb.map((b: any) => b.description || "Bug found");
  const fixedN = demo.on ? demo.fixed : cb.filter((b: any) => b.status === "fixed").length;
  const phase = demo.on ? demo.phase : (cyc?.phase ?? "idle");
  const total = bugList.length;

  const heroP = total > 0 ? Math.min((fixedN / total) * 50, 50) : (phase === "complete" ? 50 : 0);
  const villP = total > 0 ? Math.min(((total - fixedN) / Math.max(total, 1)) * 40 + 10, 50) : (phase === "attacking" ? 15 : 0);
  const wins = (cycles?.filter((c: any) => c.phase === "complete") ?? []).reduce((a: number, c: any) => c.bugsFixed >= c.bugsFound && c.bugsFound > 0 ? a + 1 : 0, 0);

  let bs: "idle" | "fighting" | "hero_wins" | "villain_wins" | "hardened" = "idle";
  if (phase === "attacking" || phase === "fixing") bs = "fighting";
  else if (phase === "complete") {
    if (wins >= 3) bs = "hardened";
    else if (fixedN >= total && total > 0) bs = "hero_wins";
    else if (total > fixedN) bs = "villain_wins";
    else bs = "hero_wins";
  }

  useEffect(() => {
    if ((bs === "hero_wins" || bs === "hardened") && prevBs !== bs) setSuperMove(true);
    setPrevBs(bs);
  }, [bs, prevBs]);

  const demoRef = useRef(demo);
  demoRef.current = demo;

  const onFinish = useCallback(() => {
    setSuperMove(false);
    setVictory(true);
    setTimeout(() => { if (demoRef.current.on) demoRef.current.stop(); }, 100);
  }, []);

  if (!session) return <div className="h-screen flex items-center justify-center"><p className="text-neutral-700 text-sm">Loading...</p></div>;

  const rawUrl = session.bloomUrl.startsWith("http") ? session.bloomUrl : `https://${session.bloomUrl}`;
  // Derive both URLs — the app preview (for the user to open) and editor
  const appUrl = rawUrl.replace(/bloom\.diy/i, "app.diy");
  const url = appUrl; // show users the app preview URL
  const pct = total > 0 ? Math.round((fixedN / total) * 100) : (phase === "complete" ? 100 : 0);

  const phaseText: Record<string, string> = {
    idle: "Ready", attacking: "Testing your app for bugs", fixing: "Fixing bugs via Bloom editor",
    researching: "Researching competitors", evolving: "Adding new features", complete: "Complete",
  };

  return (
    <div className="h-screen flex flex-col">
      <SuperMoveOverlay active={superMove} isHardened={bs === "hardened"} heroName={hero} onComplete={onFinish} />

      {/* Victory */}
      {victory && (
        <div className="fixed inset-0 z-40 bg-black/90 backdrop-blur-md flex items-center justify-center" onClick={() => setVictory(false)}>
          <div className="max-w-[340px] w-full px-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="text-[20px] font-semibold text-white">Bugs fixed</p>
            <p className="text-[14px] text-neutral-500 mt-2 leading-relaxed">Your app has been tested and improved. Open it to see the changes.</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="mt-8 block w-full bg-white text-black text-[15px] font-medium py-3 rounded-xl hover:bg-neutral-100 transition-colors text-center">
              Open app
            </a>
            <button onClick={() => setVictory(false)} className="mt-3 w-full text-[14px] text-neutral-600 hover:text-white py-2 transition-colors cursor-pointer">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 h-12 shrink-0">
        <button onClick={() => router.push("/")} className="text-[14px] font-semibold text-white cursor-pointer">Bloom Autopilot</button>
        <div className="flex items-center gap-5">
          {shots.length > 0 && <NavBtn onClick={() => setPhotos(!photos)}>{photos ? "Hide photos" : `${shots.length} photos`}</NavBtn>}
          {!demo.on && <NavBtn onClick={demo.start}>Demo</NavBtn>}
          {demo.on && <NavBtn onClick={demo.stop} active>End demo</NavBtn>}
          {session.status === "running" && <NavBtn onClick={() => pauseM({ sessionId: sid })}>Pause</NavBtn>}
          {session.status === "paused" && <NavBtn onClick={() => resumeM({ sessionId: sid })} active>Resume</NavBtn>}
        </div>
      </nav>

      {/* Banner */}
      {noCredits && !demo.on && (
        <div className="px-6 py-2 text-[13px] text-neutral-600">
          No API credits. Tap <span className="text-white">Demo</span> to preview.
        </div>
      )}
      {session.status === "done" && (
        <div className="px-6 py-2 flex items-center justify-between text-[13px]">
          <span className="text-green-500">{session.totalBugsFixed} bugs fixed, {session.totalFeaturesAdded} features added</span>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-white hover:underline underline-offset-4">Open app</a>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[720px] mx-auto px-6 pb-20">

            {/* Phase + progress */}
            <div className="pt-6 pb-5">
              <p className="text-[15px] text-neutral-400">{phaseText[phase] ?? phase}</p>
              <div className="mt-3 h-[2px] bg-neutral-900 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, background: pct >= 100 ? "#22c55e" : "#fff" }} />
              </div>
              {total > 0 && (
                <p className="text-[13px] text-neutral-700 mt-2">{fixedN} of {total} fixed</p>
              )}
            </div>

            {/* Characters */}
            <div className="flex items-center justify-between mb-3">
              <CharacterSelect side="hero" selected={hero} onSelect={setHero} />
              <CharacterSelect side="villain" selected={villain} onSelect={setVillain} />
            </div>

            {/* Battle canvas */}
            <div className="rounded-2xl overflow-hidden">
              <BattleCharacters
                heroProgress={heroP} villainProgress={villP} battleState={bs}
                consecutiveWins={wins} heroChar={hero} villainChar={villain}
                bugsFound={bugList} bugsFixedCount={fixedN} phase={phase}
              />
            </div>

            {/* Bugs */}
            {bugList.length > 0 && (
              <div className="mt-8">
                {bugList.map((bug, i) => {
                  const done = i < fixedN;
                  return (
                    <div key={i} className="flex items-start gap-4 py-4 border-b border-neutral-900/60">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-[1px] transition-all duration-500 ${
                        done ? "bg-green-500" : "ring-[1.5px] ring-neutral-800"
                      }`}>
                        {done && <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <p className={`text-[14px] leading-relaxed transition-colors duration-500 ${done ? "text-neutral-600" : "text-neutral-300"}`}>
                        {bug}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty */}
            {bugList.length === 0 && !demo.on && (
              <p className="mt-20 text-center text-[14px] text-neutral-700">
                Tap Demo to preview
              </p>
            )}

            {/* Link */}
            <p className="mt-12 text-center">
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-[13px] text-neutral-700 hover:text-neutral-400 transition-colors duration-200">
                {session.bloomUrl}
              </a>
            </p>
          </div>
        </div>

        {/* Photos sidebar */}
        {photos && shots.length > 0 && (
          <div className="w-[280px] border-l border-neutral-900/60 overflow-y-auto p-4 space-y-3 shrink-0">
            {shots.map((src, i) => (
              <img key={i} src={src} alt="" className="w-full rounded-xl cursor-pointer hover:opacity-70 transition-opacity duration-200" onClick={() => window.open(src, "_blank")} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NavBtn({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} className={`text-[13px] cursor-pointer transition-colors duration-200 ${active ? "text-white" : "text-neutral-600 hover:text-white"}`}>
      {children}
    </button>
  );
}
