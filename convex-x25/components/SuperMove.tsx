"use client";
import { useEffect, useRef, useCallback } from "react";

// Fast 2.5s super move — flash cut style
// Phase 0 (0-10):   Black + letterbox
// Phase 1 (10-30):  Silhouette + aura build
// Phase 2 (30-60):  Power burst + beam
// Phase 3 (60-100): Text + particles
// Phase 4 (100-150): Fade out

interface Props { active: boolean; isHardened: boolean; heroName: string; onComplete: () => void }

const W = 800, H = 450;

type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };

const HERO_STYLES: Record<string, { col: string; hex: string; name: string; move: string; win: string }> = {
  batman: { col: "59,130,246", hex: "#3b82f6", name: "BATMAN", move: "DARK KNIGHT", win: "JUSTICE" },
  goku: { col: "251,191,36", hex: "#fbbf24", name: "GOKU", move: "KAMEHAMEHA", win: "SUPER SAIYAN" },
  harry: { col: "220,38,38", hex: "#ef4444", name: "HARRY", move: "PATRONUS", win: "EXPECTO PATRONUM" },
  ninja: { col: "99,102,241", hex: "#818cf8", name: "SHADOW", move: "SHADOW BLADE", win: "KAGE" },
};

export function SuperMoveOverlay({ active, isHardened, heroName, onComplete }: Props) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const aRef = useRef(0);
  const fRef = useRef(0);
  const pts = useRef<P[]>([]);
  const started = useRef(false);

  const render = useCallback(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const f = fRef.current++;
    const TOTAL = 150;
    const cx = W / 2, cy = H / 2;

    if (f >= TOTAL) { onComplete(); return; }

    const hs = HERO_STYLES[heroName] ?? HERO_STYLES.batman;
    const col = isHardened ? "251,191,36" : hs.col;
    const hex = isHardened ? "#fbbf24" : hs.hex;

    // Update particles
    pts.current = pts.current.filter(p => p.life > 0);
    for (const p of pts.current) { p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life--; }

    // Phases
    const p0 = Math.min(f / 10, 1);
    const p1 = f >= 10 ? Math.min((f - 10) / 20, 1) : 0;
    const p2 = f >= 30 ? Math.min((f - 30) / 30, 1) : 0;
    const p3 = f >= 60 ? Math.min((f - 60) / 40, 1) : 0;
    const p4 = f >= 100 ? Math.min((f - 100) / 50, 1) : 0;
    const fade = 1 - p4;

    // Spawn
    if (f >= 30 && f <= 60 && f % 2 === 0) {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 4;
      pts.current.push({ x: cx + Math.cos(a) * 10, y: cy + Math.sin(a) * 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, life: 25, max: 25, color: [hex, "#fff"][Math.floor(Math.random() * 2)], size: 2 + Math.random() * 3 });
    }
    if (f === 35) {
      for (let i = 0; i < 40; i++) pts.current.push({ x: cx + (Math.random() - 0.5) * W, y: cy + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 35, max: 35, color: [hex, "#fff", "#fbbf24"][Math.floor(Math.random() * 3)], size: 1 + Math.random() * 4 });
    }

    // Shake
    const sh = (f >= 30 && f < 70) ? Math.sin(f * 2) * 4 * fade : 0;
    ctx.save();
    ctx.translate(sh, sh * 0.5);

    // Black bg
    ctx.fillStyle = `rgba(0,0,0,${Math.min(p0 * 0.95, 0.95) * fade})`;
    ctx.fillRect(-10, -10, W + 20, H + 20);

    if (fade > 0.01) {
      // Aura (phase 1+)
      if (p1 > 0) {
        ctx.globalCompositeOperation = "lighter";
        const r = 30 + p1 * 100 + (p2 > 0 ? p2 * 60 : 0);
        const a = (p1 < 0.5 ? p1 * 2 : 1) * 0.2 * fade;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, r));
        g.addColorStop(0, `rgba(255,255,255,${a * 0.8})`);
        g.addColorStop(0.3, `rgba(${col},${a})`);
        g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, r), 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
      }

      // Beam (phase 2)
      if (p2 > 0) {
        const ba = (p2 < 0.2 ? p2 * 5 : p2 > 0.8 ? (1 - p2) * 5 : 1) * fade;
        const bh = 30 + p2 * 30;
        ctx.globalCompositeOperation = "lighter";
        // Glow
        const og = ctx.createLinearGradient(0, cy - bh, 0, cy + bh);
        og.addColorStop(0, "transparent");
        og.addColorStop(0.3, `rgba(${col},${ba * 0.15})`);
        og.addColorStop(0.5, `rgba(${col},${ba * 0.25})`);
        og.addColorStop(0.7, `rgba(${col},${ba * 0.15})`);
        og.addColorStop(1, "transparent");
        ctx.fillStyle = og;
        ctx.fillRect(-10, cy - bh, W + 20, bh * 2);
        // Core
        ctx.fillStyle = `rgba(255,255,255,${ba * 0.7})`;
        ctx.fillRect(-10, cy - 8, W + 20, 16);
        ctx.globalCompositeOperation = "source-over";
      }

      // Particles
      ctx.globalCompositeOperation = "lighter";
      for (const p of pts.current) {
        if (p.life <= 0) continue;
        const a = (p.life / p.max) * fade;
        const r = Math.max(0.5, p.size * 2);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, p.color);
        g.addColorStop(1, "transparent");
        ctx.globalAlpha = a * 0.6;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      // Text
      if (p2 > 0.4 && fade > 0.1) {
        const ta = Math.min((p2 - 0.4) / 0.2, 1) * fade;
        ctx.globalAlpha = ta;
        ctx.font = `bold 28px "Press Start 2P",monospace`;
        ctx.textAlign = "center";
        ctx.strokeStyle = "#000"; ctx.lineWidth = 4;
        const moveTxt = isHardened ? "FINAL FORM" : hs.move;
        ctx.strokeText(moveTxt, cx, cy - 60);
        ctx.fillStyle = hex;
        ctx.fillText(moveTxt, cx, cy - 60);
        ctx.globalAlpha = 1;
      }

      if (p3 > 0.2 && fade > 0.1) {
        const ta = Math.min((p3 - 0.2) / 0.2, 1) * fade;
        const s = 0.6 + Math.min((p3 - 0.2) / 0.2, 1) * 0.4;
        ctx.save();
        ctx.translate(cx, cy + 20);
        ctx.scale(s, s);
        ctx.globalAlpha = ta;
        ctx.font = `bold 36px "Press Start 2P",monospace`;
        ctx.textAlign = "center";
        ctx.strokeStyle = "#000"; ctx.lineWidth = 5;
        const winTxt = isHardened ? "HARDENED" : hs.win;
        ctx.strokeText(winTxt, 0, 0);
        ctx.fillStyle = heroName === "goku" ? "#fbbf24" : (isHardened ? "#fbbf24" : hex);
        ctx.fillText(winTxt, 0, 0);
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      // Scanlines
      ctx.fillStyle = "rgba(0,0,0,0.03)";
      for (let y = 0; y < H; y += 2) ctx.fillRect(-10, y, W + 20, 1);

      // Letterbox
      const barH = 35 * p0 * fade;
      ctx.fillStyle = "#000";
      ctx.fillRect(-10, -10, W + 20, barH + 10);
      ctx.fillRect(-10, H - barH, W + 20, barH + 10);
    }

    // White flash on beam start
    if (f >= 30 && f < 38) {
      ctx.fillStyle = `rgba(255,255,255,${(1 - (f - 30) / 8) * 0.6})`;
      ctx.fillRect(-10, -10, W + 20, H + 20);
    }

    // Fade out
    if (p4 > 0) {
      const wa = p4 < 0.3 ? p4 / 0.3 : Math.max(0, 1 - (p4 - 0.3) / 0.7);
      ctx.fillStyle = `rgba(255,255,255,${wa})`;
      ctx.fillRect(-10, -10, W + 20, H + 20);
    }

    ctx.restore();
    aRef.current = requestAnimationFrame(render);
  }, [isHardened, heroName, onComplete]);

  useEffect(() => {
    if (!active) { started.current = false; return; }
    if (started.current) return;
    started.current = true;
    fRef.current = 0;
    pts.current = [];

    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    aRef.current = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(aRef.current); link.parentNode?.removeChild(link); };
  }, [active, render]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-50">
      <canvas ref={cvRef} width={W} height={H} className="w-full h-full" />
    </div>
  );
}
