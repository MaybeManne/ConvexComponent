"use node";

import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ============================================================================
// URL HELPERS
// ============================================================================

// Bloom has two URL patterns:
// - app.diy/xxx — the published app preview (for testing as a user)
// - bloom.diy/xxx — the editor with "Ask Bloom" chat (for making changes)
// We need both: ATTACK uses the app URL, FIX/EVOLVE use the editor URL.

function toAppUrl(url: string): string {
  // If it's already an app.diy URL, return as-is
  if (url.includes("app.diy")) return url;
  // Convert bloom.diy to app.diy
  return url.replace(/bloom\.diy/i, "app.diy");
}

function toEditorUrl(url: string): string {
  // If it's already a bloom.diy URL, return as-is
  if (url.includes("bloom.diy")) return url;
  // Convert app.diy to bloom.diy
  return url.replace(/app\.diy/i, "bloom.diy");
}

// ============================================================================
// AGENT PROMPTS
// ============================================================================

const ATTACK_1 = (appUrl: string) => `Go to ${appUrl}.
If you see a security error, blank page, or "localStorage" error, refresh the page.
If the page still won't load after 2 refreshes, try opening ${appUrl} in a new tab.
Once the app loads, test it thoroughly as a real user:
1. Add a new item using any input/form you see
2. Try to complete/check it off
3. Try to delete it
4. Try to edit it
5. Check: does each button do what its label says?
CRITICAL bugs: "delete" completes instead of deleting, "complete" removes instead of completing.
ONLY report FUNCTIONAL bugs. Ignore visual issues.
Report: SEVERITY: critical | ISSUE: description | STEPS: numbered steps
Screenshot each bug.`;

const FIX = (editorUrl: string, bug: string) => `Go to ${editorUrl}.
This is a Bloom editor page. Wait for it to fully load (up to 10 seconds).
If you see a blank page, security error, or "localStorage" error, refresh and wait again.
Look for the Bloom chat input — it may say "Ask Bloom", "Ask DIY", "Message Bloom", or similar.
It could be at the bottom of the page, in a sidebar, or behind a floating button/icon.
If you see a chat icon or speech bubble icon anywhere, click it to open the chat.
Once you find the chat input, click it and type exactly:
Fix this bug: ${bug}
Then press Enter or click the send button. Wait 15 seconds for Bloom to finish.
Screenshot the result showing the fix was applied.
Report exactly: FIXED if you successfully sent the message and saw changes, or FAILED if you could not find the chat or send the message.`;

const RESEARCH_1 = (appType: string) => `Go to producthunt.com and search for '${appType}'.
Find top 3 results. Report:
FEATURE: name | WHY: benefit
Be fast.`;

const EVOLVE = (editorUrl: string, promptUsed: string) => `Go to ${editorUrl}.
This is a Bloom editor page. Wait for it to fully load (up to 10 seconds).
If you see a blank page or error, refresh and wait again.
Look for the Bloom chat input — it may say "Ask Bloom", "Ask DIY", "Message Bloom", or similar.
It could be at the bottom of the page, in a sidebar, or behind a floating button/icon.
If you see a chat icon or speech bubble icon anywhere, click it to open the chat.
Once you find the chat input, click it and type:
${promptUsed}
Press Enter or click send. Wait 15 seconds for Bloom to finish.
Screenshot the result.
Report exactly: ADDED if you sent the message and saw changes, or FAILED if you could not.`;

// ============================================================================
// PARSE HELPERS
// ============================================================================

function parseBugs(text: string): Array<{ description: string; severity: "critical" | "major" | "minor" }> {
  const bugs: Array<{ description: string; severity: "critical" | "major" | "minor" }> = [];
  const lines = text.split("\n");
  for (const line of lines) {
    if (line.includes("SEVERITY:") && line.includes("ISSUE:")) {
      const sev = line.match(/SEVERITY:\s*(critical|major|minor)/i)?.[1]?.toLowerCase();
      const issue = line.match(/ISSUE:\s*([^|]+)/i)?.[1]?.trim();
      if (sev && issue) bugs.push({ severity: sev as "critical" | "major" | "minor", description: issue });
    }
  }
  if (bugs.length === 0 && text.length > 100) {
    bugs.push({ severity: "major" as const, description: text.slice(0, 300).trim() });
  }
  return bugs;
}

function parseResearch(text: string, source: string): Array<{ finding: string; featureSuggestion?: string }> {
  const findings: Array<{ finding: string; featureSuggestion?: string }> = [];
  const lines = text.split("\n");
  for (const line of lines) {
    if (line.includes("FEATURE:")) {
      const feat = line.match(/FEATURE:\s*([^|]+)/i)?.[1]?.trim();
      if (feat) findings.push({ finding: `${source}: ${feat}`, featureSuggestion: feat });
    }
  }
  if (findings.length === 0 && text.length > 100) {
    findings.push({ finding: text.slice(0, 300), featureSuggestion: undefined });
  }
  return findings;
}

// ============================================================================
// BROWSER TASK HELPERS
// ============================================================================

async function startBrowserTask(ctx: any, prompt: string, timeoutMs = 90000): Promise<string> {
  const result = await ctx.runMutation(api.tasks.startTask, {
    prompt,
    options: { timeoutMs },
  });
  return result.taskId as string;
}

async function getTaskStatus(ctx: any, taskId: string) {
  return await ctx.runQuery(api.tasks.getTask, { taskId: taskId as Id<"tasks"> });
}

// Check if a task result indicates success based on the output text
function didTaskSucceed(task: any, successKeyword: string): boolean {
  if (task.status !== "succeeded") return false;
  if (!task.result) return false;
  const text = typeof task.result === "string" ? task.result : JSON.stringify(task.result);
  const upper = text.toUpperCase();
  // Check for the success keyword AND make sure it doesn't say FAILED
  return upper.includes(successKeyword) && !upper.includes("FAILED");
}

// ============================================================================
// INTERNAL ACTIONS — THE LOOP
// ============================================================================

export const startCycle = internalAction({
  args: { sessionId: v.id("sessions"), cycleNumber: v.number() },
  handler: async (ctx, { sessionId, cycleNumber }) => {
    const session = await ctx.runQuery(internal.sessions.getSessionInternal, { sessionId });
    if (!session || session.status !== "running") return;

    const cycleId = await ctx.runMutation(internal.orchestratorMutations.insertCycle, { sessionId, cycleNumber });
    await ctx.scheduler.runAfter(0, internal.orchestrator.runAttackPhase, { sessionId, cycleId });
  },
});

// ATTACK: 1 fast agent — uses the app preview URL
export const runAttackPhase = internalAction({
  args: { sessionId: v.id("sessions"), cycleId: v.id("cycles") },
  handler: async (ctx, { sessionId, cycleId }) => {
    const session = await ctx.runQuery(internal.sessions.getSessionInternal, { sessionId });
    if (!session || session.status !== "running") return;

    const appUrl = toAppUrl(session.bloomUrl);
    const t1 = await startBrowserTask(ctx, ATTACK_1(appUrl), 90000);

    await ctx.scheduler.runAfter(500, internal.orchestrator.pollAttackResults, {
      sessionId,
      cycleId,
      taskIds: [t1],
      completedTaskIds: [],
    });
  },
});

// Poll every 1.5s instead of 3s
export const pollAttackResults = internalAction({
  args: {
    sessionId: v.id("sessions"),
    cycleId: v.id("cycles"),
    taskIds: v.array(v.string()),
    completedTaskIds: v.array(v.string()),
  },
  handler: async (ctx, { sessionId, cycleId, taskIds, completedTaskIds }) => {
    const session = await ctx.runQuery(internal.sessions.getSessionInternal, { sessionId });
    if (!session || session.status === "stopped") return;

    const newlyDone: string[] = [];
    for (const taskId of taskIds) {
      if (completedTaskIds.includes(taskId)) continue;
      const task = await getTaskStatus(ctx, taskId);
      if (!task) continue;
      if (task.status === "succeeded" || task.status === "failed") {
        newlyDone.push(taskId);
        if (task.status === "succeeded" && task.result) {
          const text = typeof task.result === "string" ? task.result : JSON.stringify(task.result);
          const bugs = parseBugs(text);
          if (bugs.length > 0) {
            await ctx.runMutation(internal.orchestratorMutations.insertBugs, {
              sessionId,
              cycleId,
              taskId,
              bugs: bugs.map((b) => ({
                ...b,
                screenshot: task.screenshots?.[task.screenshots.length - 1],
              })),
            });
          }
        }
      }
    }

    const allDone = [...completedTaskIds, ...newlyDone];
    if (allDone.length >= taskIds.length) {
      await ctx.runMutation(internal.orchestratorMutations.updateCyclePhase, { cycleId, phase: "fixing" });
      await ctx.scheduler.runAfter(0, internal.orchestrator.runFixPhase, { sessionId, cycleId });
    } else {
      await ctx.scheduler.runAfter(800, internal.orchestrator.pollAttackResults, {
        sessionId,
        cycleId,
        taskIds,
        completedTaskIds: allDone,
      });
    }
  },
});

// FIX: only fix critical/major bugs, skip minor. Cap at 2 fixes max.
// Uses the EDITOR URL (bloom.diy) so the agent can type into Bloom's chat.
export const runFixPhase = internalAction({
  args: { sessionId: v.id("sessions"), cycleId: v.id("cycles") },
  handler: async (ctx, { sessionId, cycleId }) => {
    const session = await ctx.runQuery(internal.sessions.getSessionInternal, { sessionId });
    if (!session || session.status !== "running") return;

    const bugs = await ctx.runQuery(internal.orchestratorMutations.getBugsByCycle, { cycleId });
    const unfixed = bugs
      .filter((b: any) => b.status === "found" && b.severity !== "minor")
      .slice(0, 2); // cap at 2 for speed

    if (unfixed.length === 0) {
      await ctx.runMutation(internal.orchestratorMutations.updateCyclePhase, { cycleId, phase: "researching" });
      await ctx.scheduler.runAfter(0, internal.orchestrator.runResearchPhase, { sessionId, cycleId });
      return;
    }

    const editorUrl = toEditorUrl(session.bloomUrl);

    // Launch all fixes in parallel
    const fixTasks = await Promise.all(
      unfixed.map(async (bug: any) => {
        await ctx.runMutation(internal.orchestratorMutations.updateBugStatus, { bugId: bug._id, status: "fixing" });
        const taskId = await startBrowserTask(ctx, FIX(editorUrl, bug.description), 120000);
        return { bugId: bug._id as Id<"bugs">, taskId, done: false, retries: 0 };
      })
    );

    await ctx.scheduler.runAfter(500, internal.orchestrator.pollFixResults, {
      sessionId,
      cycleId,
      fixTasks,
    });
  },
});

export const pollFixResults = internalAction({
  args: {
    sessionId: v.id("sessions"),
    cycleId: v.id("cycles"),
    fixTasks: v.array(v.object({
      bugId: v.id("bugs"),
      taskId: v.string(),
      done: v.boolean(),
      retries: v.optional(v.number()),
    })),
  },
  handler: async (ctx, { sessionId, cycleId, fixTasks }) => {
    const session = await ctx.runQuery(internal.sessions.getSessionInternal, { sessionId });
    if (!session || session.status === "stopped") return;

    const editorUrl = toEditorUrl(session.bloomUrl);
    const MAX_RETRIES = 2;

    const updated = await Promise.all(
      fixTasks.map(async (ft) => {
        if (ft.done) return ft;
        const task = await getTaskStatus(ctx, ft.taskId);
        if (!task) return ft;
        if (task.status === "succeeded" || task.status === "failed") {
          const retries = ft.retries ?? 0;

          // Check if the fix actually worked by looking at the result text
          const actuallyFixed = didTaskSucceed(task, "FIXED");

          if (actuallyFixed) {
            await ctx.runMutation(internal.orchestratorMutations.updateBugStatus, { bugId: ft.bugId, status: "fixed" });
            return { ...ft, done: true };
          }

          // Task failed or didn't actually fix — retry if we haven't exceeded max
          if (retries < MAX_RETRIES) {
            console.log(`[Orchestrator] Fix task failed, retrying (${retries + 1}/${MAX_RETRIES})`);
            // Get the bug description for the retry prompt
            const bugs = await ctx.runQuery(internal.orchestratorMutations.getBugsByCycle, { cycleId });
            const bug = bugs.find((b: any) => b._id === ft.bugId);
            if (bug) {
              const newTaskId = await startBrowserTask(ctx, FIX(editorUrl, bug.description), 120000);
              return { bugId: ft.bugId, taskId: newTaskId, done: false, retries: retries + 1 };
            }
          }

          // Max retries exceeded — mark as failed
          await ctx.runMutation(internal.orchestratorMutations.updateBugStatus, { bugId: ft.bugId, status: "failed" });
          return { ...ft, done: true };
        }
        return ft;
      })
    );

    if (updated.every((t) => t.done)) {
      await ctx.runMutation(internal.orchestratorMutations.updateCyclePhase, { cycleId, phase: "researching" });
      await ctx.scheduler.runAfter(0, internal.orchestrator.runResearchPhase, { sessionId, cycleId });
    } else {
      await ctx.scheduler.runAfter(800, internal.orchestrator.pollFixResults, {
        sessionId,
        cycleId,
        fixTasks: updated,
      });
    }
  },
});

// RESEARCH: 1 agent instead of 3
export const runResearchPhase = internalAction({
  args: { sessionId: v.id("sessions"), cycleId: v.id("cycles") },
  handler: async (ctx, { sessionId, cycleId }) => {
    const session = await ctx.runQuery(internal.sessions.getSessionInternal, { sessionId });
    if (!session || session.status !== "running") return;

    // Use clonedFrom app name if available, otherwise fall back to appType
    const clonedName = (session as any).clonedFrom?.appName;
    const appType = clonedName ?? session.appType ?? "mobile app";
    const researchPrompt = clonedName
      ? `Go to producthunt.com and search for '${appType}'.
Look at the top 3 results quickly. We are trying to beat ${clonedName}. Find features it's missing.
Report the top 3:
FEATURE: name | WHY: user benefit
Be fast — spend no more than 2 minutes total.`
      : RESEARCH_1(appType);

    const t1 = await startBrowserTask(ctx, researchPrompt, 120000);

    await ctx.scheduler.runAfter(500, internal.orchestrator.pollResearchResults, {
      sessionId,
      cycleId,
      taskIds: [t1],
      completedTaskIds: [],
    });
  },
});

export const pollResearchResults = internalAction({
  args: {
    sessionId: v.id("sessions"),
    cycleId: v.id("cycles"),
    taskIds: v.array(v.string()),
    completedTaskIds: v.array(v.string()),
  },
  handler: async (ctx, { sessionId, cycleId, taskIds, completedTaskIds }) => {
    const session = await ctx.runQuery(internal.sessions.getSessionInternal, { sessionId });
    if (!session || session.status === "stopped") return;

    const sources = ["ProductHunt"];
    const newlyDone: string[] = [];

    for (let i = 0; i < taskIds.length; i++) {
      const taskId = taskIds[i];
      if (completedTaskIds.includes(taskId)) continue;
      const task = await getTaskStatus(ctx, taskId);
      if (!task) continue;
      if (task.status === "succeeded" || task.status === "failed") {
        newlyDone.push(taskId);
        if (task.status === "succeeded" && task.result) {
          const text = typeof task.result === "string" ? task.result : JSON.stringify(task.result);
          const findings = parseResearch(text, sources[i] ?? "Research");
          if (findings.length > 0) {
            await ctx.runMutation(internal.orchestratorMutations.insertResearch, {
              sessionId,
              cycleId,
              findings: findings.map((f) => ({
                source: sources[i] ?? "Research",
                finding: f.finding,
                featureSuggestion: f.featureSuggestion,
                screenshot: task.screenshots?.[0],
              })),
            });
          }
        }
      }
    }

    const allDone = [...completedTaskIds, ...newlyDone];
    if (allDone.length >= taskIds.length) {
      const allResearch = await ctx.runQuery(internal.orchestratorMutations.getResearchByCycle, { cycleId });
      const suggestion =
        allResearch.find((r: any) => r.featureSuggestion)?.featureSuggestion ?? "improved user experience";
      const reasoning = allResearch[0]?.finding ?? "Based on competitor research";
      const promptUsed = `Add this feature: ${suggestion}. Make it feel native to the existing app style.`;

      const featureId = await ctx.runMutation(internal.orchestratorMutations.insertFeature, {
        sessionId,
        cycleId,
        name: suggestion,
        reasoning,
        promptUsed,
      });

      await ctx.runMutation(internal.orchestratorMutations.updateCyclePhase, { cycleId, phase: "evolving" });
      await ctx.scheduler.runAfter(0, internal.orchestrator.runEvolvePhase, {
        sessionId,
        cycleId,
        featureId,
        featureName: suggestion,
        promptUsed,
      });
    } else {
      await ctx.scheduler.runAfter(800, internal.orchestrator.pollResearchResults, {
        sessionId,
        cycleId,
        taskIds,
        completedTaskIds: allDone,
      });
    }
  },
});

// EVOLVE: Uses the EDITOR URL to type feature requests into Bloom's chat.
export const runEvolvePhase = internalAction({
  args: {
    sessionId: v.id("sessions"),
    cycleId: v.id("cycles"),
    featureId: v.id("features"),
    featureName: v.string(),
    promptUsed: v.string(),
  },
  handler: async (ctx, { sessionId, cycleId, featureId, featureName, promptUsed }) => {
    const session = await ctx.runQuery(internal.sessions.getSessionInternal, { sessionId });
    if (!session || session.status !== "running") return;

    const editorUrl = toEditorUrl(session.bloomUrl);
    await ctx.runMutation(internal.orchestratorMutations.updateFeatureStatus, { featureId, status: "adding" });
    const taskId = await startBrowserTask(ctx, EVOLVE(editorUrl, promptUsed), 120000);
    await ctx.runMutation(internal.orchestratorMutations.updateFeatureStatus, { featureId, status: "adding", taskId });

    await ctx.scheduler.runAfter(500, internal.orchestrator.pollEvolveResult, {
      sessionId,
      cycleId,
      featureId,
      featureName,
      promptUsed,
      taskId,
      retries: 0,
    });
  },
});

export const pollEvolveResult = internalAction({
  args: {
    sessionId: v.id("sessions"),
    cycleId: v.id("cycles"),
    featureId: v.id("features"),
    featureName: v.string(),
    promptUsed: v.string(),
    taskId: v.string(),
    retries: v.optional(v.number()),
  },
  handler: async (ctx, { sessionId, cycleId, featureId, featureName, promptUsed, taskId, retries }) => {
    const session = await ctx.runQuery(internal.sessions.getSessionInternal, { sessionId });
    if (!session || session.status === "stopped") return;

    const task = await getTaskStatus(ctx, taskId);
    if (!task) {
      await ctx.scheduler.runAfter(800, internal.orchestrator.pollEvolveResult, {
        sessionId, cycleId, featureId, featureName, promptUsed, taskId, retries,
      });
      return;
    }

    if (task.status === "succeeded" || task.status === "failed") {
      const actuallyAdded = didTaskSucceed(task, "ADDED");
      const screenshotAfter = task.screenshots?.[task.screenshots.length - 1];
      const currentRetries = retries ?? 0;
      const MAX_RETRIES = 2;

      if (actuallyAdded) {
        await ctx.runMutation(internal.orchestratorMutations.updateFeatureStatus, {
          featureId, status: "added",
        });
        await ctx.runMutation(internal.orchestratorMutations.completeCycleAndLoop, {
          sessionId, cycleId, featureName, screenshotAfter,
        });
        return;
      }

      // Failed — retry if we can
      if (currentRetries < MAX_RETRIES) {
        console.log(`[Orchestrator] Evolve task failed, retrying (${currentRetries + 1}/${MAX_RETRIES})`);
        const editorUrl = toEditorUrl(session.bloomUrl);
        const newTaskId = await startBrowserTask(ctx, EVOLVE(editorUrl, promptUsed), 120000);
        await ctx.scheduler.runAfter(500, internal.orchestrator.pollEvolveResult, {
          sessionId, cycleId, featureId, featureName, promptUsed,
          taskId: newTaskId, retries: currentRetries + 1,
        });
        return;
      }

      // Max retries — mark failed and complete cycle
      await ctx.runMutation(internal.orchestratorMutations.updateFeatureStatus, {
        featureId, status: "failed",
      });
      await ctx.runMutation(internal.orchestratorMutations.completeCycleAndLoop, {
        sessionId, cycleId, featureName: undefined, screenshotAfter,
      });
    } else {
      await ctx.scheduler.runAfter(800, internal.orchestrator.pollEvolveResult, {
        sessionId, cycleId, featureId, featureName, promptUsed, taskId, retries,
      });
    }
  },
});
