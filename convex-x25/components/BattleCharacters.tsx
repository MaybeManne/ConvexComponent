"use client";
import { useEffect, useRef, useState, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type BattleState = "idle" | "fighting" | "hero_wins" | "villain_wins" | "hardened";
type Particle = {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number; glow?: boolean;
};
type Ring = { x: number; y: number; r: number; maxR: number; color: string; life: number; maxLife: number };
type Afterimage = { x: number; y: number; alpha: number; sprite: string[]; flip: boolean };
type Lightning = { x1: number; y1: number; x2: number; y2: number; color: string; life: number; segs: { x: number; y: number }[] };

interface Props {
  heroProgress: number;
  villainProgress: number;
  battleState: BattleState;
  consecutiveWins: number;
  heroChar?: string;
  villainChar?: string;
  /** Actual bug descriptions found this cycle (villain side) */
  bugsFound?: string[];
  /** Number of bugs fixed this cycle (hero side) */
  bugsFixedCount?: number;
  /** Current phase for contextual dialogue */
  phase?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CHARACTER DATA — 14x18 sprites, outlined, 4-tone shading
// ═══════════════════════════════════════════════════════════════════════════

interface CharDef {
  name: string; title: string;
  idle0: string[]; idle1: string[]; attack: string[]; hurt: string[];
  pal: Record<string, string>;
  goldenPal?: Record<string, string>;
  /** Lines when this character lands a hit */
  hitLines: string[];
  /** Lines when scanning/hunting (villain) or waiting (hero) */
  idleLines: string[];
  winLine: string; loseLine: string; hardenedLine: string;
  auraColor: string; glowColor: string;
}

const T = "transparent";
const _ = { ".": T, W: "#fff", w: "#cbd5e1", K: "#000", k: "#1e293b" };

const BATMAN: CharDef = {
  name: "batman", title: "THE BAT",
  auraColor: "#3b82f6", glowColor: "59,130,246",
  idle0: [
    "...Kk..kK...",
    "..KKkkkkKK..",
    "..kkkkkkkkk.",
    ".kkaawwaakk.",
    ".kka__a__ak.",
    ".kkaaaaaaak.",
    "..kkka_akkk.",
    "...kkkkkk...",
    "..KddYYddK..",
    ".KddddddddK",
    ".Kdddddddd.",
    "..Kdddddd..",
    "..Kdd..ddK..",
    "..Kdd..ddK..",
    "..kkk..kkk..",
  ],
  idle1: [
    "...Kk..kK...",
    "..KKkkkkKK..",
    "..kkkkkkkkk.",
    ".kkaawwaakk.",
    ".kka__a__ak.",
    ".kkaaaaaaak.",
    "..kkka_akkk.",
    "...kkkkkk...",
    "..KddYYddK..",
    ".KddddddddK",
    ".Kdddddddd.",
    "..Kdddddd..",
    "..Kd..ddK...",
    "..kd..dkk...",
    "..kk..kkk...",
  ],
  attack: [
    "...Kk..kK...",
    "..KKkkkkKK..",
    "..kkkkkkkkk.",
    ".kkaawwaakk.",
    ".kka__a__ak.",
    ".kkaaaaaaak.",
    "..kkka_akkk.",
    "...kkkkkk...",
    "..KddYYddKCC",
    ".KddddddCCC",
    ".KdddddCCC.",
    "..Kdddddd..",
    "..Kdd..ddK..",
    "..kkd..dkk..",
    "..kkk..kkk..",
  ],
  hurt: [
    "...Kk..kK...",
    "..KKkkkkKK..",
    "..kkkkkkkkk.",
    ".kkaa>>aakk.",
    ".kka__a__ak.",
    ".kkaaaaaaak.",
    "..kkk~~kkk..",
    "...kkkkkk...",
    "..KddYYddK..",
    ".KddddddddK",
    ".Kdddddddd.",
    "..Kdddddd..",
    ".Kdd....ddK.",
    ".kkd....dkk.",
    ".kk......kk.",
  ],
  pal: { ..._, a: "#334155", d: "#1f2937", D: "#111827", Y: "#eab308", C: "#60a5fa", ">": "#ef4444", "~": "#ef4444", _: "#0f172a" },
  goldenPal: { ..._, a: "#92400e", d: "#78350f", D: "#451a03", Y: "#fef3c7", C: "#fde047", k: "#d97706", K: "#f59e0b", ">": "#ef4444", "~": "#ef4444", _: "#451a03" },
  hitLines: ["Patched!", "Bug sealed.", "Fixed it.", "Deployed.", "Resolved."],
  idleLines: ["Scanning...", "Standing by.", "Watching.", "Ready."],
  winLine: "Gotham is safe.", loseLine: "Not over...", hardenedLine: "I AM BATMAN.",
};

const JOKER: CharDef = {
  name: "joker", title: "THE JOKER",
  auraColor: "#ef4444", glowColor: "239,68,68",
  idle0: [
    "...gGGGGg...",
    "..gGGGGGGg..",
    ".gGGGGGGGGg.",
    ".ggffffffgg.",
    ".gfWK..KWfg.",
    ".gffffffeeg.",
    ".gffRRRRffg.",
    "..gffffffg..",
    "...pppppp...",
    "..ppPpppPp..",
    ".ppPppppPpp.",
    "..pppppppp..",
    "..pp..pp.p..",
    "..pp..pp....",
    "..vv..vv....",
  ],
  idle1: [
    "...gGGGGg...",
    "..gGGGGGGg..",
    ".gGGGGGGGGg.",
    ".ggffffffgg.",
    ".gfWK..KWfg.",
    ".gffffffeeg.",
    ".gffRRRRffg.",
    "..gffffffg..",
    "...pppppp...",
    "..ppPpppPp..",
    ".ppPppppPpp.",
    "..pppppppp..",
    "..pp..pp....",
    "..pp..pp....",
    "..vv..vv....",
  ],
  attack: [
    "...gGGGGg...",
    "..gGGGGGGg..",
    ".gGGGGGGGGg.",
    ".ggffffffgg.",
    ".gfRK..KRfg.",
    ".gffffffeeg.",
    ".gfRRRRRRfg.",
    "..gffffffg..",
    "YY.pppppp...",
    "YYppPpppPp..",
    "YYPppppPpp..",
    "..pppppppp..",
    "..pp..pp....",
    "..pp..pp....",
    "..vv..vv....",
  ],
  hurt: [
    "...gGGGGg...",
    "..gGGGGGGg..",
    ".gGGGGGGGGg.",
    ".ggffffffgg.",
    ".gf>K..K>fg.",
    ".gffffffeeg.",
    ".gff____ffg.",
    "..gffffffg..",
    "...pppppp...",
    "..ppPpppPp..",
    ".ppPppppPpp.",
    "..pppppppp..",
    ".pp....pp...",
    ".pp....pp...",
    ".vv....vv...",
  ],
  pal: { ..._, g: "#22c55e", G: "#16a34a", f: "#fde9e9", e: "#fca5a5", R: "#dc2626", r: "#991b1b", p: "#7c3aed", P: "#5b21b6", v: "#4c1d95", Y: "#fde047", ">": "#fde047", _: "#dc2626" },
  hitLines: ["Found a crack!", "Bug spotted!", "Exploited!", "Haha, broken!", "Vulnerability!"],
  idleLines: ["Hunting bugs...", "Searching...", "Hehehe...", "Probing..."],
  winLine: "HAHAHAHA!", loseLine: "Next time...", hardenedLine: "IMPOSSIBLE!",
};

const NINJA: CharDef = {
  name: "ninja", title: "SHADOW",
  auraColor: "#6366f1", glowColor: "99,102,241",
  idle0: [
    "....kkkk....",
    "...kkkkkkk..",
    "..kkkkkkkkk.",
    "..kkWk.kWkk.",
    "..kk_k.k_kk.",
    "..kkkkkkkkk.",
    "...kkkkkkk..",
    "....dddd....",
    "..dddDdddd..",
    ".dddDddDddd.",
    "..ddddddddd.",
    "..ddd..ddd..",
    "..dd...dd...",
    "..dd...dd...",
    "..kk...kk...",
  ],
  idle1: [
    "....kkkk....",
    "...kkkkkkk..",
    "..kkkkkkkkk.",
    "..kkWk.kWkk.",
    "..kk_k.k_kk.",
    "..kkkkkkkkk.",
    "...kkkkkkk..",
    "....dddd....",
    "..dddDdddd..",
    ".dddDddDddd.",
    "..ddddddddd.",
    "..ddd..ddd..",
    "..dd...dd...",
    ".dd.....dd..",
    ".kk.....kk..",
  ],
  attack: [
    "....kkkk....",
    "...kkkkkkk..",
    "..kkkkkkkkk.",
    "..kkWk.kWkk.",
    "..kk_k.k_kk.",
    "..kkkkkkkkk.",
    "...kkkkkkk..",
    "....dddd.CCC",
    "..dddDddCCC.",
    ".dddDdCCC...",
    "..ddddddddd.",
    "..ddd..ddd..",
    "..dd...dd...",
    "..dd...dd...",
    "..kk...kk...",
  ],
  hurt: [
    "....kkkk....",
    "...kkkkkkk..",
    "..kkkkkkkkk.",
    "..kk>k.k>kk.",
    "..kk_k.k_kk.",
    "..kkkkkkkkk.",
    "...kkkkkkk..",
    "....dddd....",
    "..dddDdddd..",
    ".dddDddDddd.",
    "..ddddddddd.",
    ".ddd....ddd.",
    ".dd......dd.",
    ".dd......dd.",
    ".kk......kk.",
  ],
  pal: { ..._, d: "#1e293b", D: "#0f172a", C: "#818cf8", ">": "#ef4444", _: "#020617" },
  goldenPal: { ..._, d: "#92400e", D: "#78350f", k: "#d97706", K: "#f59e0b", C: "#fde047", ">": "#ef4444", _: "#451a03" },
  hitLines: ["Patched.", "Neutralized.", "Sealed.", "Done.", "Clean."],
  idleLines: ["In shadows...", "Observing.", "Silent watch.", "Ready."],
  winLine: "Mission complete.", loseLine: "Retreating...", hardenedLine: "SHADOW MASTER!",
};

const DRAGON: CharDef = {
  name: "dragon", title: "FIREDRAKE",
  auraColor: "#ef4444", glowColor: "239,68,68",
  idle0: [
    "rr........rr",
    ".rr.rrrr.rr.",
    "..rrrrrrrr..",
    ".rrrrrrrrrr.",
    ".rrWR..RWrr.",
    ".rr_R..R_rr.",
    ".rrrrrrrrrr.",
    "..rrOOOOrr..",
    "...rrrrrr...",
    "..rrrRrrRrr.",
    ".rrrrrrrrrr.",
    "..rrrrrrrr..",
    "..rr..rr.rr.",
    "..rr..rr....",
    "..oo..oo....",
  ],
  idle1: [
    "rr........rr",
    ".rr.rrrr.rr.",
    "..rrrrrrrr..",
    ".rrrrrrrrrr.",
    ".rrWR..RWrr.",
    ".rr_R..R_rr.",
    ".rrrrrrrrrr.",
    "..rrOOOOrr..",
    "...rrrrrr...",
    "..rrrRrrRrr.",
    ".rrrrrrrrrr.",
    "..rrrrrrrr..",
    "..rr..rr....",
    ".rr...rr....",
    ".oo...oo....",
  ],
  attack: [
    "rr........rr",
    ".rr.rrrr.rr.",
    "..rrrrrrrr..",
    ".rrrrrrrrrr.",
    ".rrWR..RWrr.",
    ".rr_R..R_rr.",
    ".rrrrrrrrrr.",
    "OOOrOOOOrr..",
    "OYOO.rrrrr..",
    "OOO.rRrrRrr.",
    "...rrrrrrrr.",
    "..rrrrrrrr..",
    "..rr..rr....",
    "..rr..rr....",
    "..oo..oo....",
  ],
  hurt: [
    "rr........rr",
    ".rr.rrrr.rr.",
    "..rrrrrrrr..",
    ".rrrrrrrrrr.",
    ".rr>R..R>rr.",
    ".rr_R..R_rr.",
    ".rrrrrrrrrr.",
    "..rr____rr..",
    "...rrrrrr...",
    "..rrrRrrRrr.",
    ".rrrrrrrrrr.",
    "..rrrrrrrr..",
    ".rr....rr...",
    ".rr....rr...",
    ".oo....oo...",
  ],
  pal: { ..._, r: "#dc2626", R: "#991b1b", o: "#c2410c", O: "#fb923c", Y: "#fde047", ">": "#fde047", _: "#1c1917" },
  hitLines: ["Found flaw!", "ROAARR!", "Burned it!", "Cracked!", "Exposed!"],
  idleLines: ["Sniffing...", "Prowling...", "Grrrr...", "Searching..."],
  winLine: "ALL SHALL BURN!", loseLine: "Grrrr...", hardenedLine: "IMPOSSIBLE!",
};

const GOKU: CharDef = {
  name: "goku", title: "KAKAROT",
  auraColor: "#f59e0b", glowColor: "245,158,11",
  idle0: [
    "...kkkkkk...",
    "..kkkkkkkk..",
    ".kkkkkkkkk..",
    ".kkkkkkkkkk.",
    "..ssWK.KWss.",
    "..ssssssss..",
    "..sss__sss..",
    "...ssssss...",
    "..OObOObOO..",
    ".bbObbbbObb.",
    ".bbbbbbbbb..",
    "..bbbbbbb...",
    "..bb...bb...",
    "..bb...bb...",
    "..BB...BB...",
  ],
  idle1: [
    "...kkkkkk...",
    "..kkkkkkkk..",
    ".kkkkkkkkk..",
    ".kkkkkkkkkk.",
    "..ssWK.KWss.",
    "..ssssssss..",
    "..sss__sss..",
    "...ssssss...",
    "..OObOObOO..",
    ".bbObbbbObb.",
    ".bbbbbbbbb..",
    "..bbbbbbb...",
    "..bb...bb...",
    ".bb.....bb..",
    ".BB.....BB..",
  ],
  attack: [
    "...kkkkkk...",
    "..kkkkkkkk..",
    ".kkkkkkkkk..",
    ".kkkkkkkkkk.",
    "..ssWK.KWss.",
    "..ssssssss..",
    "..sss__sss..",
    "...ssssss...",
    "..OObOObOOCC",
    ".bbObbbCCCC.",
    ".bbbbCCCC...",
    "..bbbbbbb...",
    "..bb...bb...",
    "..bb...bb...",
    "..BB...BB...",
  ],
  hurt: [
    "...kkkkkk...",
    "..kkkkkkkk..",
    ".kkkkkkkkk..",
    ".kkkkkkkkkk.",
    "..ss>K.K>ss.",
    "..ssssssss..",
    "..sss~~sss..",
    "...ssssss...",
    "..OObOObOO..",
    ".bbObbbbObb.",
    ".bbbbbbbbb..",
    "..bbbbbbb...",
    ".bb.....bb..",
    ".bb.....bb..",
    ".BB.....BB..",
  ],
  pal: { ..._, s: "#fcd9b6", b: "#f97316", B: "#2563eb", O: "#ea580c", C: "#fbbf24", ">": "#ef4444", "~": "#ef4444", _: "#1c1917" },
  goldenPal: { ..._, k: "#fde047", K: "#fbbf24", s: "#fef3c7", b: "#f59e0b", B: "#d97706", O: "#d97706", C: "#fde047", ">": "#ef4444", "~": "#ef4444", _: "#451a03" },
  hitLines: ["KAMEHAMEHA!", "Fixed!", "Kaioken!", "Patched!", "Haaaa!"],
  idleLines: ["Powering up...", "Waiting...", "Training.", "Ready!"],
  winLine: "That was fun!", loseLine: "Not done yet...", hardenedLine: "ULTRA INSTINCT!",
};

const SKULL: CharDef = {
  name: "skull", title: "SKULL LORD",
  auraColor: "#a855f7", glowColor: "168,85,247",
  idle0: [
    "....wwww....",
    "...wwwwww...",
    "..wwwwwwww..",
    "..wKKwwKKw..",
    "..wKRwwRKw..",
    "..wwwwwwww..",
    "..ww.KK.ww..",
    "...wKKKKw...",
    "....wwww....",
    "..kkPkkkPk..",
    ".kkPkkkkPkk.",
    "..kkkkkkkk..",
    "..kk...kk...",
    "..kk...kk...",
    "..kk...kk...",
  ],
  idle1: [
    "....wwww....",
    "...wwwwww...",
    "..wwwwwwww..",
    "..wKKwwKKw..",
    "..wKRwwRKw..",
    "..wwwwwwww..",
    "..ww.KK.ww..",
    "...wKKKKw...",
    "....wwww....",
    "..kkPkkkPk..",
    ".kkPkkkkPkk.",
    "..kkkkkkkk..",
    "..kk...kk...",
    ".kk.....kk..",
    ".kk.....kk..",
  ],
  attack: [
    "....wwww....",
    "...wwwwww...",
    "..wwwwwwww..",
    "..wRRwwRRw..",
    "..wRRwwRRw..",
    "..wwwwwwww..",
    "..ww.KK.ww..",
    "...wKKKKw...",
    "CC..wwww....",
    "CCCkPkkkPk..",
    "CC.PkkkkPkk.",
    "..kkkkkkkk..",
    "..kk...kk...",
    "..kk...kk...",
    "..kk...kk...",
  ],
  hurt: [
    "....wwww....",
    "...wwwwww...",
    "..wwwwwwww..",
    "..w>>ww>>w..",
    "..wKKwwKKw..",
    "..wwwwwwww..",
    "..ww____ww..",
    "...wwwwww...",
    "....wwww....",
    "..kkPkkkPk..",
    ".kkPkkkkPkk.",
    "..kkkkkkkk..",
    ".kk.....kk..",
    ".kk.....kk..",
    ".kk.....kk..",
  ],
  pal: { ..._, w: "#e2e8f0", R: "#ef4444", P: "#7c3aed", p: "#6d28d9", C: "#a855f7", ">": "#fde047", _: "#ef4444" },
  hitLines: ["Soul drain!", "Found one!", "Void breach!", "Corrupted!", "Decayed!"],
  idleLines: ["Seeking...", "Darkness...", "Lurking...", "Probing..."],
  winLine: "YOUR SOUL IS MINE!", loseLine: "Next time...", hardenedLine: "HOW?!",
};

const HARRY: CharDef = {
  name: "harry", title: "THE CHOSEN ONE",
  auraColor: "#dc2626", glowColor: "220,38,38",
  idle0: [
    "...kkkkkk...",
    "..kkkkkkkk..",
    ".kkkkkkkkk..",
    ".kkkkkkkkkk.",
    "..ssWK.KWss.",
    "..ssssssss..",
    "..sss__sss..",
    "...ssssss...",
    "..KrrbrrKK..",
    ".KKrrrrrrKK.",
    ".KKrrrrrrK..",
    "..KKrrrrK...",
    "..KK...KK...",
    "..KK...KK...",
    "..kk...kk...",
  ],
  idle1: [
    "...kkkkkk...",
    "..kkkkkkkk..",
    ".kkkkkkkkk..",
    ".kkkkkkkkkk.",
    "..ssWK.KWss.",
    "..ssssssss..",
    "..sss__sss..",
    "...ssssss...",
    "..KrrbrrKK..",
    ".KKrrrrrrKK.",
    ".KKrrrrrrK..",
    "..KKrrrrK...",
    "..KK...KK...",
    ".KK.....KK..",
    ".kk.....kk..",
  ],
  attack: [
    "...kkkkkk...",
    "..kkkkkkkk..",
    ".kkkkkkkkk..",
    ".kkkkkkkkkk.",
    "..ssWK.KWss.",
    "..ssssssss..",
    "..sss__sss..",
    "...ssssss...",
    "..KrrbrrKKCC",
    ".KKrrrrrCCC.",
    ".KKrrrCCC...",
    "..KKrrrrK...",
    "..KK...KK...",
    "..KK...KK...",
    "..kk...kk...",
  ],
  hurt: [
    "...kkkkkk...",
    "..kkkkkkkk..",
    ".kkkkkkkkk..",
    ".kkkkkkkkkk.",
    "..ss>K.K>ss.",
    "..ssssssss..",
    "..sss~~sss..",
    "...ssssss...",
    "..KrrbrrKK..",
    ".KKrrrrrrKK.",
    ".KKrrrrrrK..",
    "..KKrrrrK...",
    ".KK.....KK..",
    ".KK.....KK..",
    ".kk.....kk..",
  ],
  pal: { ..._, s: "#fcd9b6", r: "#7f1d1d", b: "#fbbf24", C: "#ef4444", ">": "#22c55e", "~": "#22c55e", _: "#1c1917" },
  goldenPal: { ..._, k: "#fde047", K: "#fbbf24", s: "#fef3c7", r: "#dc2626", b: "#fff", C: "#fde047", ">": "#22c55e", "~": "#22c55e", _: "#451a03" },
  hitLines: ["Expelliarmus!", "Patched!", "Reparo!", "Fixed!", "Protego!"],
  idleLines: ["Watching...", "Wand ready.", "Vigilant.", "On guard."],
  winLine: "Mischief managed.", loseLine: "I'll be back...", hardenedLine: "EXPECTO PATRONUM!",
};

const VOLDEMORT: CharDef = {
  name: "voldemort", title: "DARK LORD",
  auraColor: "#22c55e", glowColor: "34,197,94",
  idle0: [
    "....wwww....",
    "...wwwwww...",
    "..wwwwwwww..",
    "..wwwwwwww..",
    "..wwRK.KRww.",
    "..wwwwwwww..",
    "..ww.KK.ww..",
    "...wwwwww...",
    "....kkkk....",
    "..kkGkkkGk..",
    ".kkGkkkkGkk.",
    "..kkkkkkkk..",
    "..kk...kk...",
    "..kk...kk...",
    "..kk...kk...",
  ],
  idle1: [
    "....wwww....",
    "...wwwwww...",
    "..wwwwwwww..",
    "..wwwwwwww..",
    "..wwRK.KRww.",
    "..wwwwwwww..",
    "..ww.KK.ww..",
    "...wwwwww...",
    "....kkkk....",
    "..kkGkkkGk..",
    ".kkGkkkkGkk.",
    "..kkkkkkkk..",
    "..kk...kk...",
    ".kk.....kk..",
    ".kk.....kk..",
  ],
  attack: [
    "....wwww....",
    "...wwwwww...",
    "..wwwwwwww..",
    "..wwwwwwww..",
    "..wwRK.KRww.",
    "..wwwwwwww..",
    "..ww.KK.ww..",
    "...wwwwww...",
    "CC..kkkk....",
    "CCCkGkkkGk..",
    "CC.GkkkkGkk.",
    "..kkkkkkkk..",
    "..kk...kk...",
    "..kk...kk...",
    "..kk...kk...",
  ],
  hurt: [
    "....wwww....",
    "...wwwwww...",
    "..wwwwwwww..",
    "..wwwwwwww..",
    "..ww>K.K>ww.",
    "..wwwwwwww..",
    "..ww____ww..",
    "...wwwwww...",
    "....kkkk....",
    "..kkGkkkGk..",
    ".kkGkkkkGkk.",
    "..kkkkkkkk..",
    ".kk.....kk..",
    ".kk.....kk..",
    ".kk.....kk..",
  ],
  pal: { ..._, w: "#d4d4d8", R: "#ef4444", G: "#22c55e", C: "#22c55e", ">": "#fde047", _: "#22c55e" },
  hitLines: ["Avada Kedavra!", "Bug found!", "Crucio!", "Exposed!", "Dark mark!"],
  idleLines: ["Seeking...", "I sense fear.", "Hunting...", "Pathetic..."],
  winLine: "BOW TO ME!", loseLine: "This changes nothing...", hardenedLine: "IMPOSSIBLE!",
};

const HEROES: Record<string, CharDef> = { batman: BATMAN, goku: GOKU, ninja: NINJA, harry: HARRY };
const VILLAINS: Record<string, CharDef> = { joker: JOKER, voldemort: VOLDEMORT, dragon: DRAGON, skull: SKULL };

// ═══════════════════════════════════════════════════════════════════════════
// RENDER UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

const W = 560, H = 340;

function px(ctx: CanvasRenderingContext2D, sprite: string[], x: number, y: number, s: number, pal: Record<string, string>, flip = false, op = 1, white = false) {
  ctx.globalAlpha = op;
  for (let r = 0; r < sprite.length; r++) {
    for (let c = 0; c < sprite[r].length; c++) {
      const ch = sprite[r][c];
      const col = pal[ch];
      if (!col || col === T) continue;
      ctx.fillStyle = white ? "#fff" : col;
      const cx = flip ? x + (sprite[r].length - 1 - c) * s : x + c * s;
      ctx.fillRect(cx, y + r * s, s, s);
    }
  }
  ctx.globalAlpha = 1;
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 0.3) {
  if (r <= 0) return;
  ctx.globalCompositeOperation = "lighter";
  const sr = Math.max(0.1, r);
  const g = ctx.createRadialGradient(x, y, 0, x, y, sr);
  g.addColorStop(0, color.includes("rgba") ? color : `rgba(${color},${alpha})`);
  g.addColorStop(1, `rgba(${color.replace(/[^\d,]/g, "")},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, sr, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
}

function softDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1) {
  if (r <= 0) return;
  ctx.globalAlpha = alpha;
  const sr = Math.max(0.1, r);
  const g = ctx.createRadialGradient(x, y, 0, x, y, sr);
  g.addColorStop(0, color);
  g.addColorStop(1, T);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, sr, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function txt(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, sz = 7) {
  ctx.font = `bold ${sz}px "Press Start 2P",monospace`;
  ctx.textAlign = "center";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function makeLightning(x1: number, y1: number, x2: number, y2: number): { x: number; y: number }[] {
  const segs: { x: number; y: number }[] = [{ x: x1, y: y1 }];
  const n = 5 + Math.floor(Math.random() * 4);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    segs.push({
      x: x1 + (x2 - x1) * t + (Math.random() - 0.5) * 40,
      y: y1 + (y2 - y1) * t + (Math.random() - 0.5) * 30,
    });
  }
  segs.push({ x: x2, y: y2 });
  return segs;
}

function drawLightning(ctx: CanvasRenderingContext2D, segs: { x: number; y: number }[], color: string, alpha: number) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  // core
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(segs[0].x, segs[0].y);
  for (let i = 1; i < segs.length; i++) ctx.lineTo(segs[i].x, segs[i].y);
  ctx.stroke();
  // glow
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.lineWidth = 12;
  ctx.globalAlpha = alpha * 0.3;
  ctx.stroke();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function BattleCharacters({
  heroProgress, villainProgress, battleState, consecutiveWins,
  heroChar = "batman", villainChar = "joker",
  bugsFound: bugsFoundRaw, bugsFixedCount = 0, phase = "idle",
}: Props) {
  const bugsFound = bugsFoundRaw ?? [];
  const bugCount = bugsFound.length;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const animRef = useRef(0);
  const hero = HEROES[heroChar] ?? BATMAN;
  const villain = VILLAINS[villainChar] ?? JOKER;
  const isHard = battleState === "hardened" || consecutiveWins >= 3;

  const S = useRef({
    hAnim: "idle", vAnim: "idle",
    hBubble: "", vBubble: "",
    shake: 0, flash: 0, hitStop: 0,
    hAtk: -99, vAtk: -99,
    hWhiteFlash: 0, vWhiteFlash: 0,
    hSquash: { sx: 1, sy: 1 }, vSquash: { sx: 1, sy: 1 },
    particles: [] as Particle[],
    rings: [] as Ring[],
    afterimages: [] as Afterimage[],
    lightnings: [] as Lightning[],
    prevH: 0, prevV: 0,
    stars: Array.from({ length: 50 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.65, s: 0.4 + Math.random() * 1.2, b: Math.random() * Math.PI * 2 })),
    motes: Array.from({ length: 18 }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.3, vy: -0.2 - Math.random() * 0.3, size: 1 + Math.random() * 2, color: ["#60a5fa", "#818cf8", "#c084fc", "#fbbf24"][Math.floor(Math.random() * 4)], life: 999, maxLife: 999 })),
    hpAnimH: 0, hpAnimV: 0,
  });

  const [, setTk] = useState(0);
  const tick = () => setTk((t) => t + 1);

  // ─── Track previous bug count for villain attacks ───
  const prevBugsRef = useRef(0);
  const prevFixedRef = useRef(0);

  // ─── Villain finds a bug → villain attacks, shows actual bug desc ───
  useEffect(() => {
    const s = S.current;
    if (bugCount > prevBugsRef.current) {
      // New bug found — villain attacks!
      const newBug = bugsFound[bugCount - 1] ?? "";
      s.vAnim = "attack"; s.vAtk = frameRef.current;
      s.shake = 4; s.flash = 0.25; s.hitStop = 3;
      s.hWhiteFlash = 3; s.hSquash = { sx: 1.15, sy: 0.85 };
      // Villain bubble: show truncated actual bug description
      s.vBubble = newBug.length > 25 ? newBug.slice(0, 22) + "..." : newBug;
      // Hero reacts with concern
      s.hBubble = phase === "attacking" ? hero.idleLines[Math.floor(Math.random() * hero.idleLines.length)] : "Incoming...";
      for (let i = 0; i < 15; i++) s.particles.push({ x: 160 + (Math.random() - 0.5) * 30, y: 170 + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4 - 1, life: 25 + Math.random() * 20, maxLife: 45, color: ["#ef4444", "#f87171", "#fbbf24", "#fff"][Math.floor(Math.random() * 4)], size: 2 + Math.random() * 4, glow: true });
      s.rings.push({ x: 160, y: 170, r: 0, maxR: 60, color: `rgba(${villain.glowColor},0.5)`, life: 18, maxLife: 18 });
      s.lightnings.push({ x1: 370, y1: 100, x2: 160, y2: 170, color: `rgba(${villain.glowColor},0.6)`, life: 8, segs: makeLightning(370, 100, 160, 170) });
      tick();
    }
    prevBugsRef.current = bugCount;
  }, [bugCount, hero, villain, phase]);

  // ─── Hero fixes a bug → hero attacks back ───
  useEffect(() => {
    const s = S.current;
    if (bugsFixedCount > prevFixedRef.current) {
      s.hAnim = "attack"; s.hAtk = frameRef.current;
      s.shake = 5; s.flash = 0.4; s.hitStop = 4;
      s.vWhiteFlash = 3; s.vSquash = { sx: 1.15, sy: 0.85 };
      // Hero announces the fix
      s.hBubble = hero.hitLines[Math.floor(Math.random() * hero.hitLines.length)];
      // Villain reacts
      s.vBubble = villain.hitLines[Math.floor(Math.random() * villain.hitLines.length)];
      for (let i = 0; i < 15; i++) s.particles.push({ x: 370 + (Math.random() - 0.5) * 30, y: 170 + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4 - 1, life: 25 + Math.random() * 20, maxLife: 45, color: ["#60a5fa", "#93c5fd", "#fbbf24", "#fff"][Math.floor(Math.random() * 4)], size: 2 + Math.random() * 4, glow: true });
      s.rings.push({ x: 370, y: 170, r: 0, maxR: 60, color: `rgba(${hero.glowColor},0.5)`, life: 18, maxLife: 18 });
      s.lightnings.push({ x1: 200, y1: 100, x2: 370, y2: 170, color: `rgba(${hero.glowColor},0.6)`, life: 8, segs: makeLightning(200, 100, 370, 170) });
      tick();
    }
    prevFixedRef.current = bugsFixedCount;
  }, [bugsFixedCount, hero, villain]);

  // ─── Fallback: progress-based attacks (for when no bug data yet) ───
  useEffect(() => {
    const s = S.current;
    if (heroProgress > s.prevH && bugsFixedCount === prevFixedRef.current) {
      // Progress increased but no new fix — mild idle update
      s.hBubble = hero.idleLines[Math.floor(Math.random() * hero.idleLines.length)];
      tick();
    }
    s.prevH = heroProgress;
  }, [heroProgress, hero, bugsFixedCount]);

  useEffect(() => {
    const s = S.current;
    if (villainProgress > s.prevV && bugCount === prevBugsRef.current) {
      s.vBubble = villain.idleLines[Math.floor(Math.random() * villain.idleLines.length)];
      tick();
    }
    s.prevV = villainProgress;
  }, [villainProgress, villain, bugCount]);

  // ─── Phase-aware idle dialogue ───
  useEffect(() => {
    const s = S.current;
    if (phase === "attacking") {
      s.vBubble = villain.idleLines[Math.floor(Math.random() * villain.idleLines.length)];
      s.hBubble = hero.idleLines[Math.floor(Math.random() * hero.idleLines.length)];
    } else if (phase === "fixing") {
      s.hBubble = "On it...";
    } else if (phase === "researching") {
      s.hBubble = hero.idleLines[0];
      s.vBubble = "...";
    } else if (phase === "evolving") {
      s.hBubble = "Upgrading...";
      s.vBubble = "What?!";
    }
    tick();
  }, [phase, hero, villain]);

  // ─── Battle state changes (victory/defeat/hardened) ───
  useEffect(() => {
    const s = S.current;
    const burst = (cx: number, cy: number, n: number, cols: string[]) => {
      for (let i = 0; i < n; i++) s.particles.push({ x: cx + (Math.random() - 0.5) * 60, y: cy + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 7, vy: -Math.random() * 6 - 2, life: 30 + Math.random() * 35, maxLife: 65, color: cols[Math.floor(Math.random() * cols.length)], size: 2 + Math.random() * 5, glow: true });
    };
    if (battleState === "hero_wins") {
      s.hBubble = hero.winLine; s.vBubble = villain.loseLine;
      s.hAnim = "victory"; s.vAnim = "defeat"; s.flash = 0.7; s.shake = 6;
      burst(280, 140, 25, ["#22c55e", "#60a5fa", "#fbbf24", "#fff"]);
      s.rings.push({ x: 150, y: 170, r: 0, maxR: 90, color: "rgba(34,197,94,0.4)", life: 25, maxLife: 25 });
    } else if (battleState === "villain_wins") {
      s.hBubble = hero.loseLine; s.vBubble = villain.winLine;
      s.vAnim = "victory"; s.hAnim = "defeat"; s.flash = 0.6; s.shake = 5;
      burst(280, 140, 25, ["#ef4444", "#dc2626", "#fbbf24"]);
    } else if (battleState === "hardened") {
      s.hBubble = hero.hardenedLine; s.vBubble = villain.hardenedLine;
      s.hAnim = "hardened"; s.vAnim = "defeat"; s.flash = 1; s.shake = 10;
      burst(280, 130, 50, ["#fbbf24", "#fde047", "#60a5fa", "#34d399", "#f472b6", "#a78bfa", "#fff"]);
      for (let i = 0; i < 4; i++) s.rings.push({ x: 150, y: 170, r: 0, maxR: 80 + i * 25, color: "rgba(251,191,36,0.4)", life: 28 + i * 4, maxLife: 28 + i * 4 });
      for (let i = 0; i < 3; i++) s.lightnings.push({ x1: 150 + (Math.random() - 0.5) * 60, y1: 60, x2: 150 + (Math.random() - 0.5) * 60, y2: 220, color: "rgba(251,191,36,0.7)", life: 12, segs: makeLightning(150 + (Math.random() - 0.5) * 60, 60, 150 + (Math.random() - 0.5) * 60, 220) });
    } else if (battleState === "idle" || battleState === "fighting") {
      // Reset from victory/defeat back to normal
      s.hAnim = "idle"; s.vAnim = "idle";
    }
    tick();
  }, [battleState, hero, villain]);

  // ─── RENDER LOOP ───
  const render = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const s = S.current;
    const f = frameRef.current++;

    // Hit stop (anime freeze frame)
    if (s.hitStop > 0) { s.hitStop--; animRef.current = requestAnimationFrame(render); return; }

    // Decay
    s.shake *= 0.88; if (s.shake < 0.15) s.shake = 0;
    s.flash *= 0.86; if (s.flash < 0.01) s.flash = 0;
    if (s.hWhiteFlash > 0) s.hWhiteFlash--;
    if (s.vWhiteFlash > 0) s.vWhiteFlash--;
    // Squash/stretch decay back to 1,1
    s.hSquash.sx += (1 - s.hSquash.sx) * 0.15;
    s.hSquash.sy += (1 - s.hSquash.sy) * 0.15;
    s.vSquash.sx += (1 - s.vSquash.sx) * 0.15;
    s.vSquash.sy += (1 - s.vSquash.sy) * 0.15;
    if (s.hAnim === "attack" && f - s.hAtk > 28) s.hAnim = "idle";
    if (s.vAnim === "attack" && f - s.vAtk > 28) s.vAnim = "idle";

    // Update particles
    s.particles = s.particles.filter((p) => p.life > 0);
    for (const p of s.particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--; p.vx *= 0.98; }

    // Update motes (ambient, loop forever)
    for (const m of s.motes) {
      m.x += m.vx; m.y += m.vy;
      if (m.y < -10) { m.y = H + 10; m.x = Math.random() * W; }
      if (m.x < -10) m.x = W + 10;
      if (m.x > W + 10) m.x = -10;
    }

    // Update rings & lightning
    s.rings = s.rings.filter((r) => r.life > 0);
    for (const r of s.rings) { r.r += (r.maxR - r.r) * 0.12; r.life--; }
    s.lightnings = s.lightnings.filter((l) => l.life > 0);
    for (const l of s.lightnings) l.life--;
    s.afterimages = s.afterimages.filter((a) => a.alpha > 0.05);
    for (const a of s.afterimages) a.alpha *= 0.8;

    // Smooth HP
    s.hpAnimH += (heroProgress - s.hpAnimH) * 0.08;
    s.hpAnimV += (villainProgress - s.hpAnimV) * 0.08;

    const sx = s.shake > 0 ? Math.sin(f * 1.7) * s.shake : 0;
    const sy = s.shake > 0 ? Math.cos(f * 2.3) * s.shake * 0.5 : 0;
    ctx.save();
    ctx.translate(sx, sy);

    // ═══ BACKGROUND — Smash Bros pixel stage ═══
    const gy = 232;

    // Sky gradient (warm sunset tones)
    const sky = ctx.createLinearGradient(0, 0, 0, gy);
    sky.addColorStop(0, "#1a1a4e");
    sky.addColorStop(0.3, "#2d1b69");
    sky.addColorStop(0.6, "#4a2c6e");
    sky.addColorStop(0.85, "#7c4a72");
    sky.addColorStop(1, "#c76a5e");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, gy);

    // Sun/moon glow
    const sunX = W * 0.8, sunY = 50;
    softDot(ctx, sunX, sunY, 80, "rgba(251,191,36,1)", 0.08);
    softDot(ctx, sunX, sunY, 30, "rgba(255,255,255,1)", 0.12);

    // Pixel clouds (parallax)
    const drawCloud = (cx: number, cy: number, w: number) => {
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      const s = 4;
      for (let r = 0; r < 3; r++) for (let c = 0; c < w; c++) {
        if (r === 0 && (c < 1 || c >= w - 1)) continue;
        ctx.fillRect(cx + c * s, cy + r * s, s, s);
      }
    };
    drawCloud(((f * 0.15) % (W + 100)) - 50, 30, 8);
    drawCloud(((f * 0.1 + 200) % (W + 100)) - 50, 55, 6);
    drawCloud(((f * 0.2 + 350) % (W + 100)) - 50, 20, 5);

    // Distant mountains (pixel silhouettes)
    ctx.fillStyle = "#2a1a4a";
    const mts = [0, 40, 80, 120, 160, 200, 240, 280, 320, 360, 400, 440, 480, 520];
    const mh = [30, 50, 70, 45, 65, 80, 55, 40, 70, 60, 45, 75, 50, 35];
    for (let i = 0; i < mts.length; i++) {
      const mx = mts[i], my = gy - mh[i];
      ctx.fillRect(mx, my, 40, mh[i]);
    }
    // Closer hills
    ctx.fillStyle = "#1a2a1a";
    for (let x = 0; x < W; x += 6) {
      const h = 15 + Math.sin(x * 0.02 + 1) * 12 + Math.sin(x * 0.05) * 6;
      ctx.fillRect(x, gy - h, 6, h);
    }

    // Trees (pixel art, scattered)
    const drawTree = (tx: number, h: number, leafColor: string) => {
      ctx.fillStyle = "#3d2a1a"; // trunk
      ctx.fillRect(tx + 4, gy - h, 4, h - 8);
      ctx.fillStyle = leafColor;
      // canopy (pixel triangle-ish)
      for (let r = 0; r < 4; r++) {
        const w = 6 + (3 - r) * 2;
        ctx.fillRect(tx + 6 - w / 2 * 2, gy - h - 4 + r * 3, w * 2, 3);
      }
    };
    const trees = [[30, 35, "#1a5c2a"], [90, 28, "#2a6e3a"], [180, 40, "#1a5c2a"], [350, 32, "#2a6e3a"], [430, 38, "#1a5c2a"], [500, 30, "#2a6e3a"]];
    for (const [tx, th, lc] of trees) drawTree(tx as number, th as number, lc as string);

    // Ground
    ctx.fillStyle = "#1a3a1a";
    ctx.fillRect(0, gy, W, 4);
    ctx.fillStyle = "#0f2a0f";
    ctx.fillRect(0, gy + 4, W, H - gy - 4);
    // Grass tufts
    ctx.fillStyle = "#2a5a2a";
    for (let x = 0; x < W; x += 8) {
      if (Math.sin(x * 0.7) > 0.3) ctx.fillRect(x, gy - 2, 4, 2);
    }
    // Ground detail
    ctx.fillStyle = "#1a3a1a";
    for (let x = 0; x < W; x += 12) ctx.fillRect(x, gy + 6, 1, H - gy - 6);

    // Ground light pools (character glow on grass)
    softDot(ctx, 150, gy + 5, 50, `rgba(${hero.glowColor},1)`, isHard ? 0.1 : 0.05);
    softDot(ctx, 400, gy + 5, 50, `rgba(${villain.glowColor},1)`, 0.05);

    // Speed lines during fighting
    if (battleState === "fighting" || s.hAnim === "attack" || s.vAnim === "attack") {
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 16; i++) {
        const ang = ((i * 22.5 + f * 2.5) % 360) * (Math.PI / 180);
        const cx = W / 2, cy = H * 0.45;
        const r1 = 80 + (i % 4) * 18;
        const r2 = r1 + 50 + Math.sin(f * 0.06 + i) * 25;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
        ctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    // Ambient motes (fireflies / leaves)
    ctx.globalCompositeOperation = "lighter";
    for (const m of s.motes) {
      const a = 0.15 + Math.sin(f * 0.03 + m.x) * 0.1;
      softDot(ctx, m.x, m.y, m.size * 2, m.color, a);
    }
    ctx.globalCompositeOperation = "source-over";

    // ═══ ENERGY RINGS ═══
    for (const ring of s.rings) {
      const a = ring.life / ring.maxLife;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = a * 0.6;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 2 + a * 2;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, Math.max(0.1, ring.r), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }

    // ═══ CHARACTER AURAS (additive glow) ═══
    const auraPulse = 0.5 + Math.sin(f * 0.05) * 0.3;
    if (battleState !== "idle" || isHard) {
      glow(ctx, 150, 190, 50 + auraPulse * 10, isHard ? "251,191,36" : hero.glowColor, isHard ? 0.08 : 0.04);
      if (isHard) glow(ctx, 150, 190, 70 + auraPulse * 15, "251,191,36", 0.03);
    }
    if (battleState === "fighting") {
      glow(ctx, 400, 190, 45 + auraPulse * 8, villain.glowColor, 0.03);
    }

    // ═══ HERO ═══
    const hbX = 100, hbY = 164, sc = 4;
    let hX = hbX, hY = hbY;
    const hSpr = s.hAnim === "attack" ? hero.attack : (s.hAnim === "defeat" || s.hAnim === "hurt") ? hero.hurt : f % 50 < 25 ? hero.idle0 : hero.idle1;

    if (s.hAnim === "idle" || s.hAnim === "victory" || s.hAnim === "hardened") {
      hY += Math.sin(f * 0.04) * 2.5;
    }
    if (s.hAnim === "attack") {
      const t = (f - s.hAtk) / 28;
      // Afterimages during dash
      if (t < 0.4 && f % 2 === 0) s.afterimages.push({ x: hX, y: hY, alpha: 0.4, sprite: hSpr, flip: false });
      hX += Math.sin(t * Math.PI) * 70;
      hY -= Math.sin(t * Math.PI) * 18;
    }
    if (s.hAnim === "victory") {
      const bounce = Math.sin(f * 0.08);
      hY -= Math.abs(bounce) * 12;
      // Stretch on rise, squash on land
      s.hSquash.sx = 1 - Math.abs(bounce) * 0.12;
      s.hSquash.sy = 1 + Math.abs(bounce) * 0.12;
    }
    if (s.hAnim === "hardened") {
      const bounce = Math.sin(f * 0.06);
      hY -= Math.abs(bounce) * 10;
      s.hSquash.sx = 1 - Math.abs(bounce) * 0.08;
      s.hSquash.sy = 1 + Math.abs(bounce) * 0.08;
      // Intense golden aura
      glow(ctx, hX + 28, hY + 35, 55 + Math.sin(f * 0.1) * 8, "251,191,36", 0.12);
    }
    if (s.hAnim === "defeat") { hY += 14; hX -= 10; }

    // Afterimages
    for (const ai of s.afterimages) {
      px(ctx, ai.sprite, ai.x, ai.y, sc, isHard && hero.goldenPal ? hero.goldenPal : hero.pal, ai.flip, ai.alpha * 0.5);
    }

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(hbX + 28, gy + 3, 24, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const hPal = isHard && hero.goldenPal ? hero.goldenPal : hero.pal;
    // Squash/stretch transform
    ctx.save();
    ctx.translate(hX + 28, hY + 35);
    ctx.scale(s.hSquash.sx, s.hSquash.sy);
    ctx.translate(-(hX + 28), -(hY + 35));
    px(ctx, hSpr, hX, hY, sc, hPal, false, s.hAnim === "defeat" ? 0.35 : 1, s.hWhiteFlash > 0);
    ctx.restore();

    // Crown for hardened
    if (isHard) {
      const crX = hX + 12, crY = hY - 16 - Math.sin(f * 0.07) * 2;
      const cs = 2;
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(crX, crY + cs * 3, cs * 12, cs);
      ctx.fillRect(crX, crY + cs, cs * 2, cs * 3);
      ctx.fillRect(crX + cs * 5, crY, cs * 2, cs * 4);
      ctx.fillRect(crX + cs * 10, crY + cs, cs * 2, cs * 3);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(crX + cs, crY + cs * 2, cs, cs);
      ctx.fillRect(crX + cs * 6, crY + cs, cs, cs);
      ctx.fillRect(crX + cs * 11, crY + cs * 2, cs, cs);
      // Crown glow
      glow(ctx, hX + 24, crY + 4, 20, "251,191,36", 0.15);
    }

    // ═══ VILLAIN ═══
    const vbX = 350, vbY = 164;
    let vX = vbX, vY = vbY;
    const vSpr = s.vAnim === "attack" ? villain.attack : (s.vAnim === "defeat" || s.vAnim === "hurt") ? villain.hurt : f % 40 < 20 ? villain.idle0 : villain.idle1;

    if (s.vAnim === "idle" || s.vAnim === "victory") {
      vY += Math.sin(f * 0.05 + 1) * 2.5;
      vX += Math.sin(f * 0.025) * 1.5;
    }
    if (s.vAnim === "attack") {
      const t = (f - s.vAtk) / 28;
      if (t < 0.4 && f % 2 === 0) s.afterimages.push({ x: vX, y: vY, alpha: 0.4, sprite: vSpr, flip: true });
      vX -= Math.sin(t * Math.PI) * 70;
      vY -= Math.sin(t * Math.PI) * 18;
    }
    if (s.vAnim === "victory") vY -= Math.abs(Math.sin(f * 0.1)) * 12;
    if (s.vAnim === "defeat") { vY += 14; vX += 10; }

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(vbX + 28, gy + 3, 24, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Squash/stretch transform
    ctx.save();
    ctx.translate(vX + 28, vY + 35);
    ctx.scale(s.vSquash.sx, s.vSquash.sy);
    ctx.translate(-(vX + 28), -(vY + 35));
    px(ctx, vSpr, vX, vY, sc, villain.pal, true, s.vAnim === "defeat" ? 0.35 : 1, s.vWhiteFlash > 0);
    ctx.restore();

    // ═══ LIGHTNING ═══
    for (const l of s.lightnings) {
      drawLightning(ctx, l.segs, l.color, l.life / 8);
    }

    // ═══ PARTICLES (with glow) ═══
    ctx.globalCompositeOperation = "lighter";
    for (const p of s.particles) {
      if (p.life <= 0) continue;
      const a = p.life / p.maxLife;
      if (p.glow) {
        softDot(ctx, p.x, p.y, p.size * 2, p.color, a * 0.4);
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      const ps = Math.max(1, p.size * a);
      ctx.fillRect(Math.floor(p.x - ps / 2), Math.floor(p.y - ps / 2), Math.ceil(ps), Math.ceil(ps));
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    // ═══ VS BADGE ═══
    const vsP = 1 + Math.sin(f * 0.06) * 0.08;
    ctx.save();
    ctx.translate(W / 2, 52);
    ctx.scale(vsP, vsP);
    glow(ctx, 0, 0, 28, "251,191,36", 0.1);
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#92400e"; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = `bold 9px "Press Start 2P",monospace`;
    ctx.fillStyle = "#78350f"; ctx.textAlign = "center"; ctx.fillText("VS", 0, 4);
    ctx.restore();

    // ═══ SPEECH BUBBLES ═══
    if (s.hBubble) drawBubble(ctx, s.hBubble, hbX + 28, hbY - 4, "#2563eb", "#dbeafe");
    if (s.vBubble) drawBubble(ctx, s.vBubble, vbX + 28, vbY - 4, "#dc2626", "#fecaca");

    // ═══ NAMES ═══
    txt(ctx, isHard ? "CHAMPION" : hero.name.toUpperCase(), hbX + 28, gy + 16, isHard ? "#fbbf24" : "#93c5fd", 6);
    txt(ctx, villain.name.toUpperCase(), vbX + 28, gy + 16, "#fca5a5", 6);

    // ═══ HP BARS ═══
    const barY = H - 55;
    drawHP(ctx, 16, barY, 200, 12, s.hpAnimH, isHard ? "#f59e0b" : "#3b82f6", hero.title, hero.glowColor, false);
    drawHP(ctx, W - 216, barY, 200, 12, s.hpAnimV, "#ef4444", villain.title, villain.glowColor, true);

    // Clash bar (center)
    const pbW = 90, pbX = (W - pbW) / 2, pbY = barY + 1;
    ctx.fillStyle = "#06060f";
    ctx.fillRect(pbX, pbY, pbW, 10);
    ctx.strokeStyle = "#222"; ctx.lineWidth = 1; ctx.strokeRect(pbX, pbY, pbW, 10);
    const hFill = (pbW / 2 - 1) * Math.min(s.hpAnimH / 50, 1);
    const vFill = (pbW / 2 - 1) * Math.min(s.hpAnimV / 50, 1);
    // Hero side
    const hg = ctx.createLinearGradient(pbX, 0, pbX + pbW / 2, 0);
    hg.addColorStop(0, isHard ? "#92400e" : "#1e40af");
    hg.addColorStop(1, isHard ? "#fbbf24" : "#60a5fa");
    ctx.fillStyle = hg;
    ctx.fillRect(pbX + 1, pbY + 1, hFill, 8);
    // Villain side
    const vg = ctx.createLinearGradient(pbX + pbW / 2, 0, pbX + pbW, 0);
    vg.addColorStop(0, "#ef4444");
    vg.addColorStop(1, "#991b1b");
    ctx.fillStyle = vg;
    ctx.fillRect(pbX + pbW - 1 - vFill, pbY + 1, vFill, 8);
    // Divider
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(pbX + pbW / 2 - 1, pbY - 1, 2, 12);
    // Divider glow
    glow(ctx, pbX + pbW / 2, pbY + 5, 10, "251,191,36", 0.08);

    // ═══ STATUS ═══
    ctx.font = `bold 5px "Press Start 2P",monospace`;
    ctx.textAlign = "left"; ctx.fillStyle = "#4b5563";
    ctx.fillText(`WINS: ${consecutiveWins}`, 16, H - 12);
    ctx.textAlign = "right";
    const lbl = battleState === "hardened" ? "BATTLE HARDENED!" : battleState === "hero_wins" ? "DEFENDERS WIN!" : battleState === "villain_wins" ? "BREACH DETECTED" : battleState === "fighting" ? "ENGAGING..." : "STANDBY";
    ctx.fillStyle = battleState === "hardened" ? "#fbbf24" : battleState === "hero_wins" ? "#22c55e" : battleState === "villain_wins" ? "#ef4444" : "#6b7280";
    ctx.fillText(lbl, W - 16, H - 12);

    // ═══ POST-PROCESSING ═══
    // Flash
    if (s.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(s.flash, 1)})`;
      ctx.fillRect(0, 0, W, H);
    }
    // Scanlines
    ctx.fillStyle = "rgba(0,0,0,0.04)";
    for (let ly = 0; ly < H; ly += 2) ctx.fillRect(0, ly, W, 1);
    // Vignette
    const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.22, W / 2, H / 2, W * 0.65);
    vig.addColorStop(0, T);
    vig.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    ctx.restore();
    animRef.current = requestAnimationFrame(render);
  }, [battleState, heroProgress, villainProgress, isHard, consecutiveWins, hero, villain]);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    animRef.current = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(animRef.current); link.parentNode?.removeChild(link); };
  }, [render]);

  return (
    <div className="relative group">
      <canvas ref={canvasRef} width={W} height={H} className="w-full rounded-lg" />
      <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
        boxShadow: isHard
          ? "inset 0 0 40px rgba(251,191,36,0.2), 0 0 50px rgba(251,191,36,0.12), 0 0 100px rgba(251,191,36,0.06)"
          : battleState === "fighting"
            ? `inset 0 0 25px rgba(${hero.glowColor},0.1), 0 0 30px rgba(${villain.glowColor},0.06)`
            : "inset 0 0 15px rgba(100,100,200,0.04)",
      }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HP BAR with gradient fill, shimmer, and glow
// ═══════════════════════════════════════════════════════════════════════════

function drawHP(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pct: number, fg: string, label: string, glowCol: string, flip: boolean) {
  // BG
  ctx.fillStyle = "#06060f";
  ctx.fillRect(x, y, w, h);
  // Border
  ctx.strokeStyle = "#1a1a2e";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  // Fill with gradient
  const fill = (w - 2) * Math.min(Math.max(pct / 50, 0), 1);
  if (fill > 0) {
    const grad = flip
      ? ctx.createLinearGradient(x + w, 0, x + w - fill, 0)
      : ctx.createLinearGradient(x, 0, x + fill, 0);
    grad.addColorStop(0, fg);
    grad.addColorStop(1, fg + "88");
    ctx.fillStyle = grad;
    if (flip) ctx.fillRect(x + w - 1 - fill, y + 1, fill, h - 2);
    else ctx.fillRect(x + 1, y + 1, fill, h - 2);
    // Shimmer highlight
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    if (flip) ctx.fillRect(x + w - 1 - fill, y + 1, fill, 1);
    else ctx.fillRect(x + 1, y + 1, fill, 1);
    // Glow at fill edge
    const edgeX = flip ? x + w - 1 - fill : x + 1 + fill;
    glow(ctx, edgeX, y + h / 2, 8, glowCol, 0.08);
  }
  // Label
  ctx.font = `bold 5px "Press Start 2P",monospace`;
  ctx.fillStyle = "#6b7280";
  ctx.textAlign = flip ? "right" : "left";
  ctx.fillText(label, flip ? x + w - 3 : x + 3, y + h + 10);
}

function drawBubble(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, border: string, bg: string) {
  ctx.font = `bold 6px "Press Start 2P",monospace`;
  const m = ctx.measureText(text);
  const pw = 5, bw = m.width + pw * 2, bh = 16;
  const bx = Math.max(4, Math.min(x - bw / 2, W - bw - 4));
  const by = y - bh;
  // Body
  ctx.fillStyle = bg;
  ctx.fillRect(bx + 2, by, bw - 4, bh - 2);
  ctx.fillRect(bx, by + 2, bw, bh - 6);
  ctx.fillRect(bx + 1, by + 1, bw - 2, bh - 4);
  // Pointer
  ctx.fillRect(x - 2, by + bh - 2, 4, 3);
  ctx.fillRect(x - 1, by + bh + 1, 2, 2);
  // Border
  ctx.fillStyle = border;
  ctx.fillRect(bx + 2, by, bw - 4, 1);
  ctx.fillRect(bx + 2, by + bh - 3, bw - 4, 1);
  ctx.fillRect(bx, by + 2, 1, bh - 6);
  ctx.fillRect(bx + bw - 1, by + 2, 1, bh - 6);
  // Text
  ctx.fillStyle = border;
  ctx.textAlign = "center";
  ctx.fillText(text, x, by + 10);
}

// ═══════════════════════════════════════════════════════════════════════════
// CHARACTER SELECT
// ═══════════════════════════════════════════════════════════════════════════

export function CharacterSelect({ side, selected, onSelect }: { side: "hero" | "villain"; selected: string; onSelect: (id: string) => void }) {
  const chars = side === "hero"
    ? [{ id: "batman", name: "Batman", color: "#374151", icon: "BAT" }, { id: "goku", name: "Goku", color: "#f97316", icon: "GKU" }, { id: "harry", name: "Harry P.", color: "#7f1d1d", icon: "HP" }, { id: "ninja", name: "Shadow", color: "#1e293b", icon: "NIN" }]
    : [{ id: "joker", name: "Joker", color: "#22c55e", icon: "JKR" }, { id: "voldemort", name: "Voldemort", color: "#d4d4d8", icon: "VLD" }, { id: "dragon", name: "Firedrake", color: "#dc2626", icon: "DRG" }, { id: "skull", name: "Skull Lord", color: "#e2e8f0", icon: "SKL" }];

  return (
    <div className="flex gap-1">
      {chars.map((c) => (
        <button key={c.id} onClick={() => onSelect(c.id)}
          className={`flex-1 px-1.5 py-1.5 rounded-lg text-center transition-all cursor-pointer border ${selected === c.id ? "border-blue-500/60 bg-blue-500/10 shadow-[0_0_12px_rgba(59,130,246,0.15)]" : "border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-600/60 hover:bg-zinc-800/40"}`}>
          <div className="w-6 h-6 rounded mx-auto mb-0.5 flex items-center justify-center text-[6px] font-mono font-black" style={{ background: c.color, border: `2px solid ${selected === c.id ? "#3b82f6" : "#333"}`, color: selected === c.id ? "#fff" : "#999" }}>
            {c.icon}
          </div>
          <p className="text-[8px] font-mono font-bold text-zinc-400 leading-tight">{c.name}</p>
        </button>
      ))}
    </div>
  );
}
