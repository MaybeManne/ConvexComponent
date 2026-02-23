If you have questions, want changes, or want additional features added, feel free to reach out. I respond quickly.

# Browser Use — Durable Browser Automation as a Convex Component

This is a Convex Component that integrates Browser Use Cloud for browser automation inside a durable Convex workflow. Natural language browser tasks run in a loop that survives page refreshes and continues until terminal state. Progress events and screenshots stream reactively to the client.

Browser automation is executed by Browser Use Cloud. Convex handles orchestration, durability, state, and reactivity.

## What It Does

- Accepts natural language browser tasks as input
- Runs them in a durable workflow that persists across restarts
- Streams step-by-step progress events reactively
- Captures and persists screenshots during execution
- Supports task cancellation
- Survives page refreshes and reconnects to live progress

## Architecture

```
Client (Next.js)
  ↓
Public Convex API (listTasks, getTask, startTask, cancelTask)
  ↓
Durable Workflow (runWorkflowStep)
  ↓
Provider (polling loop with retry)
  ↓
Browser Use Cloud API
  ↓
Remote browser session
```

The workflow persists task state in the tasks table. Provider calls retry with exponential backoff. Progress events and screenshots are deduplicated using a cursor to prevent duplicate appends on each poll. Terminal transitions (succeeded/failed/canceled) are idempotency-guarded. API key is server-only and never logged.

## Data Model

The `tasks` table contains:

- `prompt` — Natural language instruction
- `status` — queued | running | succeeded | failed | canceled
- `progress` — Append-only array of progress events
- `screenshots` — Array of screenshot URLs
- `result` — Task output (string or structured object)
- `error` — Error message and details
- `providerTaskId` — Browser Use Cloud task ID
- `lastProviderCursor` — Deduplication cursor for latest poll
- Timestamps: `createdAt`, `updatedAt`, `startedAt`, `finishedAt`, `canceledAt`

The cursor-based deduplication exists because polling the same provider task returns the same set of logs until new progress appears. Without deduplication, we would append the same events on each poll.

## Public API

**listTasks(limit?)** — Query returning paginated tasks (newest first). Max 100 per request.

**getTask(taskId)** — Query returning a single task by ID or null.

**startTask(prompt, options?)** — Mutation creating a task in queued state and scheduling the workflow.

**cancelTask(taskId)** — Mutation setting the canceledAt flag. Workflow stops on next iteration.

## Example App

The example demonstrates:

- Submitting a task with a natural language prompt
- Live timeline showing progress events as they stream in
- Screenshot grid updating reactively as captures arrive
- Task cancellation mid-execution
- Refreshing the browser while a task runs — the workflow continues on the server and reconnects when you return

This proves durability: the task survives page refreshes and server restarts.

## Running Locally

**Terminal 1:**
```bash
cd example
npx convex dev
```

Set your API key:
```bash
npx convex env set BROWSER_USE_API_KEY <your_key>
```

**Terminal 2:**
```bash
cd example
npm run dev
```

Open http://localhost:3000

## Production Notes

- Retry logic with exponential backoff for transient failures
- Idempotent workflow transitions prevent duplicate state changes
- Strict output validation using Convex validators
- Server-only secret handling via environment variables
- Cancellation is safe; terminal states are guarded
- Task result can be string or object, handled polymorphically on client
- Progress and screenshot deduplication via cursor
- Configurable polling interval and timeout

This component demonstrates real usage of the new Convex Components SDK with durable agent orchestration. The architecture is structured to integrate into production applications.
