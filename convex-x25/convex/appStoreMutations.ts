import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const startAppTwinTask = internalMutation({
  args: { prompt: v.string() },
  handler: async (ctx, { prompt }): Promise<string> => {
    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      prompt,
      status: "queued",
      progress: [],
      screenshots: [],
      createdAt: now,
      updatedAt: now,
      options: { timeoutMs: 120000 },
    });

    await ctx.scheduler.runAfter(0, internal.workflow.startWorkflow, { taskId });

    return taskId as string;
  },
});

export const getTaskForTwin = internalQuery({
  args: { taskId: v.string() },
  handler: async (ctx, { taskId }) => {
    const task = await ctx.db.get(taskId as Id<"tasks">);
    if (!task) return null;
    return {
      status: task.status,
      result: task.result,
      screenshots: task.screenshots,
    };
  },
});
