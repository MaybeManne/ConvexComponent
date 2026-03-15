import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

export const insertCycle = internalMutation({
  args: { sessionId: v.id("sessions"), cycleNumber: v.number() },
  handler: async (ctx, { sessionId, cycleNumber }) => {
    const existing = await ctx.db
      .query("cycles")
      .withIndex("by_session_cycle", (q) =>
        q.eq("sessionId", sessionId).eq("cycleNumber", cycleNumber)
      )
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("cycles", {
      sessionId,
      cycleNumber,
      phase: "attacking",
      bugsFound: 0,
      bugsFixed: 0,
      createdAt: Date.now(),
    });
  },
});

export const updateCyclePhase = internalMutation({
  args: {
    cycleId: v.id("cycles"),
    phase: v.union(
      v.literal("attacking"),
      v.literal("fixing"),
      v.literal("researching"),
      v.literal("evolving"),
      v.literal("complete")
    ),
    featureAdded: v.optional(v.string()),
    screenshotBefore: v.optional(v.string()),
    screenshotAfter: v.optional(v.string()),
  },
  handler: async (ctx, { cycleId, phase, featureAdded, screenshotBefore, screenshotAfter }) => {
    const patch: Record<string, any> = { phase };
    if (featureAdded !== undefined) patch.featureAdded = featureAdded;
    if (screenshotBefore !== undefined) patch.screenshotBefore = screenshotBefore;
    if (screenshotAfter !== undefined) patch.screenshotAfter = screenshotAfter;
    await ctx.db.patch(cycleId, patch);
  },
});

export const insertBugs = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    cycleId: v.id("cycles"),
    taskId: v.string(),
    bugs: v.array(
      v.object({
        description: v.string(),
        severity: v.union(v.literal("critical"), v.literal("major"), v.literal("minor")),
        screenshot: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { sessionId, cycleId, taskId, bugs }) => {
    const bugIds: Id<"bugs">[] = [];
    for (const bug of bugs) {
      const id = await ctx.db.insert("bugs", {
        sessionId,
        cycleId,
        taskId,
        description: bug.description,
        severity: bug.severity,
        screenshot: bug.screenshot,
        status: "found",
        createdAt: Date.now(),
      });
      bugIds.push(id);
    }
    const cycle = await ctx.db.get(cycleId);
    if (cycle) {
      await ctx.db.patch(cycleId, { bugsFound: cycle.bugsFound + bugs.length });
    }
    return bugIds;
  },
});

export const updateBugStatus = internalMutation({
  args: {
    bugId: v.id("bugs"),
    status: v.union(v.literal("found"), v.literal("fixing"), v.literal("fixed"), v.literal("failed")),
    fixTaskId: v.optional(v.string()),
  },
  handler: async (ctx, { bugId, status, fixTaskId }) => {
    const bug = await ctx.db.get(bugId);
    if (!bug) return;

    const patch: Record<string, any> = { status };
    if (fixTaskId !== undefined) patch.fixTaskId = fixTaskId;
    await ctx.db.patch(bugId, patch);

    if (status === "fixed") {
      const cycle = await ctx.db.get(bug.cycleId);
      if (cycle) {
        await ctx.db.patch(bug.cycleId, { bugsFixed: cycle.bugsFixed + 1 });
      }
      const session = await ctx.db.get(bug.sessionId);
      if (session) {
        await ctx.db.patch(bug.sessionId, { totalBugsFixed: session.totalBugsFixed + 1 });
      }
    }
  },
});

export const insertResearch = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    cycleId: v.id("cycles"),
    findings: v.array(
      v.object({
        source: v.string(),
        finding: v.string(),
        featureSuggestion: v.optional(v.string()),
        screenshot: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { sessionId, cycleId, findings }) => {
    for (const f of findings) {
      await ctx.db.insert("research", {
        sessionId,
        cycleId,
        source: f.source,
        finding: f.finding,
        featureSuggestion: f.featureSuggestion,
        screenshot: f.screenshot,
        createdAt: Date.now(),
      });
    }
  },
});

export const insertFeature = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    cycleId: v.id("cycles"),
    name: v.string(),
    reasoning: v.string(),
    promptUsed: v.string(),
  },
  handler: async (ctx, { sessionId, cycleId, name, reasoning, promptUsed }) => {
    return await ctx.db.insert("features", {
      sessionId,
      cycleId,
      name,
      reasoning,
      promptUsed,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const updateFeatureStatus = internalMutation({
  args: {
    featureId: v.id("features"),
    status: v.union(v.literal("pending"), v.literal("adding"), v.literal("added"), v.literal("failed")),
    taskId: v.optional(v.string()),
  },
  handler: async (ctx, { featureId, status, taskId }) => {
    const patch: Record<string, any> = { status };
    if (taskId !== undefined) patch.taskId = taskId;
    await ctx.db.patch(featureId, patch);

    if (status === "added") {
      const feature = await ctx.db.get(featureId);
      if (feature) {
        const session = await ctx.db.get(feature.sessionId);
        if (session) {
          await ctx.db.patch(feature.sessionId, {
            totalFeaturesAdded: session.totalFeaturesAdded + 1,
          });
        }
      }
    }
  },
});

export const completeCycleAndLoop = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    cycleId: v.id("cycles"),
    featureName: v.optional(v.string()),
    screenshotAfter: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, cycleId, featureName, screenshotAfter }) => {
    const patch: Record<string, any> = { phase: "complete" as const };
    if (featureName !== undefined) patch.featureAdded = featureName;
    if (screenshotAfter !== undefined) patch.screenshotAfter = screenshotAfter;
    await ctx.db.patch(cycleId, patch);

    const session = await ctx.db.get(sessionId);
    if (!session || session.status !== "running") return;

    // Check if we've hit maxCycles — mark done
    const maxCycles = session.maxCycles ?? 3;
    if (session.currentCycle >= maxCycles) {
      await ctx.db.patch(sessionId, { status: "done" });
      return;
    }

    const nextCycle = session.currentCycle + 1;
    await ctx.db.patch(sessionId, { currentCycle: nextCycle });

    await ctx.scheduler.runAfter(500, internal.orchestrator.startCycle, {
      sessionId,
      cycleNumber: nextCycle,
    });
  },
});

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

export const getBugsByCycle = internalQuery({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, { cycleId }) => {
    return await ctx.db
      .query("bugs")
      .withIndex("by_cycle", (q) => q.eq("cycleId", cycleId))
      .collect();
  },
});

export const getResearchByCycle = internalQuery({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, { cycleId }) => {
    return await ctx.db
      .query("research")
      .withIndex("by_cycle", (q) => q.eq("cycleId", cycleId))
      .collect();
  },
});
