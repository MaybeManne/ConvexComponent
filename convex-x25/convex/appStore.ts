"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

interface AppTwinResult {
  status: string;
  result: {
    appName: string;
    rating: string;
    topFeatures: string[];
    appStoreUrl: string;
    screenshot?: string;
  } | null;
}

export const findAppTwinInternal = internalAction({
  args: { description: v.string() },
  returns: v.object({ taskId: v.string() }),
  handler: async (ctx, { description }): Promise<{ taskId: string }> => {
    const result: string = await ctx.runMutation(internal.appStoreMutations.startAppTwinTask, {
      prompt: `Go to apps.apple.com.
Search for: "${description}".
Click the #1 result.
Extract:
- APP_NAME: the app's name
- RATING: star rating and number of reviews
- FEATURE_1: first key feature from description
- FEATURE_2: second key feature
- FEATURE_3: third key feature
- APP_URL: the full URL of this app on the App Store
Take a screenshot of the app's page.
Return all fields in the format above, one per line.`,
    });

    return { taskId: result };
  },
});

export const getAppTwinResultInternal = internalAction({
  args: { taskId: v.string() },
  handler: async (ctx, { taskId }): Promise<AppTwinResult | null> => {
    const task: any = await ctx.runQuery(internal.appStoreMutations.getTaskForTwin, { taskId });
    if (!task) return null;
    if (task.status !== "succeeded" && task.status !== "failed") {
      return { status: task.status, result: null };
    }

    const text = typeof task.result === "string" ? task.result : JSON.stringify(task.result ?? "");
    const getName = (t: string) => t.match(/APP_NAME:\s*(.+)/i)?.[1]?.trim() ?? "Unknown App";
    const getRating = (t: string) => t.match(/RATING:\s*(.+)/i)?.[1]?.trim() ?? "";
    const getFeatures = (t: string) => [1, 2, 3].map(n => t.match(new RegExp(`FEATURE_${n}:\\s*(.+)`, "i"))?.[1]?.trim()).filter(Boolean) as string[];
    const getUrl = (t: string) => t.match(/APP_URL:\s*(.+)/i)?.[1]?.trim() ?? "";

    return {
      status: task.status,
      result: {
        appName: getName(text),
        rating: getRating(text),
        topFeatures: getFeatures(text),
        appStoreUrl: getUrl(text),
        screenshot: task.screenshots?.[task.screenshots.length - 1],
      }
    };
  },
});
