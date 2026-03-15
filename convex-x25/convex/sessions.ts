import { query, mutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ============================================================================
// PUBLIC MUTATIONS
// ============================================================================

export const startSession = mutation({
  args: {
    bloomUrl: v.string(),
    maxCycles: v.optional(v.number()),
    appType: v.optional(v.string()),
    clonedFrom: v.optional(v.object({
      appName: v.string(),
      appStoreUrl: v.string(),
      topFeatures: v.array(v.string()),
      screenshot: v.optional(v.string()),
      rating: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { bloomUrl, maxCycles, appType, clonedFrom }) => {
    const sessionId = await ctx.db.insert("sessions", {
      bloomUrl,
      appType,
      status: "running",
      maxCycles: maxCycles ?? 3,
      currentCycle: 1,
      totalBugsFixed: 0,
      totalFeaturesAdded: 0,
      clonedFrom,
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.orchestrator.startCycle, {
      sessionId,
      cycleNumber: 1,
    });

    return { sessionId };
  },
});

export const pauseSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session || session.status !== "running") return;
    await ctx.db.patch(sessionId, { status: "paused" });
  },
});

export const stopSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session || session.status === "stopped") return;
    await ctx.db.patch(sessionId, { status: "stopped" });
  },
});

export const resumeSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session || session.status !== "paused") return;
    await ctx.db.patch(sessionId, { status: "running" });
    await ctx.scheduler.runAfter(0, internal.orchestrator.startCycle, {
      sessionId,
      cycleNumber: session.currentCycle + 1,
    });
  },
});

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

export const getSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db.get(sessionId);
  },
});

export const listSessions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_createdAt")
      .order("desc")
      .take(20);
  },
});

export const listCycles = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("cycles")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .order("desc")
      .collect();
  },
});

export const listBugs = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("bugs")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .order("desc")
      .take(100);
  },
});

export const listResearch = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("research")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .order("desc")
      .collect();
  },
});

export const listFeatures = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("features")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .order("desc")
      .collect();
  },
});

// ============================================================================
// INTERNAL QUERY
// ============================================================================

export const getSessionInternal = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db.get(sessionId);
  },
});
