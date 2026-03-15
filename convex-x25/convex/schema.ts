import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  progressEventValidator,
  taskErrorValidator,
  taskOptionsValidator,
  taskStatusValidator,
  taskResultValidator,
} from "./types";

export default defineSchema({
  // Browser Use tasks table (from component at ../component/)
  tasks: defineTable({
    prompt: v.string(),
    status: taskStatusValidator,
    providerTaskId: v.optional(v.string()),
    progress: v.array(progressEventValidator),
    lastProviderCursor: v.optional(v.number()),
    screenshots: v.array(v.string()),
    result: v.optional(taskResultValidator),
    error: v.optional(taskErrorValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    options: v.optional(taskOptionsValidator),
  })
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  sessions: defineTable({
    bloomUrl: v.string(),
    appType: v.optional(v.string()),
    status: v.union(
      v.literal("running"),
      v.literal("paused"),
      v.literal("stopped"),
      v.literal("done")
    ),
    maxCycles: v.optional(v.number()),
    currentCycle: v.number(),
    totalBugsFixed: v.number(),
    totalFeaturesAdded: v.number(),
    clonedFrom: v.optional(v.object({
      appName: v.string(),
      appStoreUrl: v.string(),
      topFeatures: v.array(v.string()),
      screenshot: v.optional(v.string()),
      rating: v.optional(v.string()),
    })),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),

  cycles: defineTable({
    sessionId: v.id("sessions"),
    cycleNumber: v.number(),
    phase: v.union(
      v.literal("attacking"),
      v.literal("fixing"),
      v.literal("researching"),
      v.literal("evolving"),
      v.literal("complete")
    ),
    bugsFound: v.number(),
    bugsFixed: v.number(),
    featureAdded: v.optional(v.string()),
    screenshotBefore: v.optional(v.string()),
    screenshotAfter: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_cycle", ["sessionId", "cycleNumber"]),

  bugs: defineTable({
    sessionId: v.id("sessions"),
    cycleId: v.id("cycles"),
    taskId: v.string(),
    description: v.string(),
    severity: v.union(
      v.literal("critical"),
      v.literal("major"),
      v.literal("minor")
    ),
    screenshot: v.optional(v.string()),
    status: v.union(
      v.literal("found"),
      v.literal("fixing"),
      v.literal("fixed"),
      v.literal("failed")
    ),
    fixTaskId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_cycle", ["cycleId"]),

  research: defineTable({
    sessionId: v.id("sessions"),
    cycleId: v.id("cycles"),
    source: v.string(),
    finding: v.string(),
    featureSuggestion: v.optional(v.string()),
    screenshot: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_cycle", ["cycleId"]),

  features: defineTable({
    sessionId: v.id("sessions"),
    cycleId: v.id("cycles"),
    name: v.string(),
    reasoning: v.string(),
    promptUsed: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("adding"),
      v.literal("added"),
      v.literal("failed")
    ),
    taskId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_cycle", ["cycleId"]),
});
