# Browser Use - Durable Convex Component

## Quick Start (Run It in ~3 Minutes)

```bash
git clone <repo-url>
cd ConvexComponent
npm install
```

Start Convex:

```bash
cd example
npx convex dev
```

Set your Browser Use API key (server side only):

```bash
npx convex env set BROWSER_USE_API_KEY <your_browser_use_api_key>
```

Then run the frontend:

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

That’s it.

---

## What This Is

This is a durable browser automation component built using the new Convex Components SDK.

You give it a task like:

> "Go to Google Flights and find the cheapest nonstop flight from JFK to LHR tomorrow."

Click **Run**.

The task executes inside a durable Convex workflow that orchestrates Browser Use Cloud until it reaches a terminal state:

- queued  
- running  
- succeeded  
- failed  
- canceled  

The UI shows:

- live timeline updates  
- incremental screenshots  
- structured result payload  
- explicit error states  

---

## The Important Part

Tasks keep running even if:

- you refresh the page  
- you close the browser  
- the client disconnects  

Execution lives entirely on the backend.  
The UI just reconnects to state.

If the server restarts, Convex resumes the workflow automatically.

No polling. No hacks. No fragile browser sessions.

---

## Architecture

```
Next.js Frontend
      ↓
Convex Queries + Mutations
      ↓
Durable Workflow Loop
      ↓
Provider Layer
      ↓
Browser Use Cloud
```

Design constraints I followed:

- no client polling  
- idempotent state transitions  
- explicit cancellation checks  
- cursor-based progress deduplication  
- provider abstraction boundary  
- server-only secret handling  

Browser Use handles execution.  
Convex handles orchestration, durability, and persistence.

---

## Public API

### startTask({ prompt, options? })

Creates the task record and starts the durable workflow.

```ts
await ctx.runMutation(api.tasks.startTask, {
  prompt: "Find cheapest nonstop JFK to LHR flight tomorrow",
  options: {
    timeoutMs: 300000,
    pollIntervalMs: 2000,
  },
});
```

---

### getTask({ taskId })

Reactive query returning:

```ts
{
  _id,
  prompt,
  status,
  progress,
  screenshots,
  result,
  error,
}
```

---

### listTasks({ limit?, cursor? })

Paginated task history.

---

### cancelTask({ taskId })

Gracefully cancels a running workflow.

---

## Execution Flow

1. startTask inserts DB record  
2. workflow initializes Browser Use session  
3. poll loop fetches provider state  
4. progress events appended incrementally  
5. screenshots stored as they arrive  
6. terminal state persisted  

All transitions are safe to replay.  
Workflow is scheduler-driven and restart-safe.

---

## Security

The `BROWSER_USE_API_KEY`:

- is stored in Convex environment variables  
- never goes to the browser  
- never gets logged  
- is only accessed inside Convex actions  

You can use your own Browser Use key. Nothing is hardcoded.

---

## Testing

Deterministic test mode:

```bash
BROWSER_USE_TEST_MODE=1 npx convex dev
```

Run tests:

```bash
npm run test
npm run test:backend
```

Test mode does not call the real Browser Use API.

---

## Deploying

Deploy backend:

```bash
cd example
npx convex deploy
```

Deploy frontend (Vercel):

```bash
cd example
vercel
```

Set:

- BROWSER_USE_API_KEY in Convex  
- NEXT_PUBLIC_CONVEX_URL in Vercel  

Secrets stay server-side.

---

## Why I Built It This Way

Browser Use alone is stateless.

I wrapped it in a durable workflow layer so:

- tasks survive refresh  
- state persists  
- execution is resumable  
- cancellation is safe  
- UI stays reactive  

This turns browser automation into production-ready agent infrastructure.

That’s the point.
