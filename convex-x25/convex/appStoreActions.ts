import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const findAppTwin = action({
  args: { description: v.string() },
  handler: async (ctx, { description }): Promise<{ taskId: string }> => {
    return await ctx.runAction(internal.appStore.findAppTwinInternal, { description });
  },
});

export const getAppTwinResult = action({
  args: { taskId: v.string() },
  handler: async (ctx, { taskId }): Promise<any> => {
    return await ctx.runAction(internal.appStore.getAppTwinResultInternal, { taskId });
  },
});
