# Browser Use — Durable Convex Component

A **durable browser automation component** built with the new **Convex Components SDK**.

Run natural language browser tasks that execute to completion — even if the page refreshes, the client disconnects, or the server restarts.

---

## What It Does

Give the agent a task like:

> "Go to Google Flights and find the cheapest nonstop flight from JFK to LHR tomorrow."

Click **Run**.

The task executes in a **durable Convex workflow** that orchestrates Browser Use Cloud until it reaches a terminal state:

- `queued`
- `running`
- `succeeded`
- `failed`
- `canceled`

The UI displays:

- Live timeline updates  
- Incremental screenshots  
- Structured result payload  
- Explicit error states  

### Key Property: Durability

Tasks continue running even if:

- You refresh the page  
- You close the browser  
- The frontend disconnects  

Execution lives server-side. The UI simply reconnects.

---

## Architecture

```
Next.js Frontend
    ↓ (Reactive Queries — No Polling)
Convex Public API (queries + mutations)
    ↓
Durable Workflow (Scheduler-driven loop)
    ↓
Provider Layer (Browser Use Cloud API)
    ↓
Remote Browser Execution
```

### Design Principles

- No client polling
- No long-lived browser sessions
- All state persisted in Convex
- Idempotent state transitions
- Explicit cancellation support
- Provider abstraction boundary
- Server-only secret handling

---

## Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd ConvexComponent
npm install
```

---

### 2. Start Convex

```bash
cd example
npx convex dev
```

This will:

- Create a Convex project (if needed)
- Generate `NEXT_PUBLIC_CONVEX_URL`
- Start the backend dev server

---

### 3. Set Browser Use API Key (Server-Side Only)

```bash
npx convex env set BROWSER_USE_API_KEY <your_browser_use_api_key>
```

The API key:

- Is stored in Convex environment variables
- Is never exposed to the browser
- Is only accessed inside Convex actions

David can use his own Browser Use API key.  
Nothing in this repo hardcodes credentials.

---

### 4. Run the App

```bash
cd example
npm run dev
```

Open:

```
http://localhost:3000
```

---

## Verify Durability

1. Start a task  
2. Refresh the page mid-run  
3. Observe the task continues  
4. UI reconnects and shows live state  

If the server restarts, Convex resumes automatically.

---

## Public API

### `startTask({ prompt, options? })`

Creates a task record and begins workflow execution.

```ts
await ctx.runMutation(api.tasks.startTask, {
  prompt: "Find cheapest nonstop JFK → LHR flight tomorrow",
  options: {
    timeoutMs: 300000,
    pollIntervalMs: 2000,
  },
});
```

---

### `getTask({ taskId })`

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

### `listTasks({ limit?, cursor? })`

Paginated task history.

---

### `cancelTask({ taskId })`

Gracefully cancels a running workflow.

---

## Execution Model

1. `startTask` inserts DB record  
2. Durable workflow initializes Browser Use session  
3. Poll loop fetches provider state  
4. Progress appended incrementally  
5. Screenshots stored as they arrive  
6. Terminal state persisted  

All transitions are idempotent.  
Workflow is scheduler-driven and restart-safe.

---

## What This Demonstrates

- Durable agent orchestration
- Convex Components SDK integration
- Scheduler-based workflow control
- Cursor-based progress deduplication
- Safe cancellation
- Server-side secret isolation
- Deterministic test mode
- Fully reactive UI (no polling)

This converts stateless browser automation into durable infrastructure.

---

## Testing

Run deterministic test mode:

```bash
BROWSER_USE_TEST_MODE=1 npx convex dev
```

Run E2E tests:

```bash
npm run test
```

Run backend smoke tests:

```bash
npm run test:backend
```

Test mode does not call the real Browser Use API.

---

## Deployment

### Deploy Convex

```bash
cd example
npx convex deploy
```

Set:

- `BROWSER_USE_API_KEY`

---

### Deploy Frontend (Vercel)

```bash
cd example
vercel
```

Set:

- `NEXT_PUBLIC_CONVEX_URL`

API keys remain server-side.

---

## Why This Matters

Browser Use alone is stateless.

This component wraps it in:

- Durable execution  
- Persistent state  
- Workflow resilience  
- Reactive UI synchronization  

It transforms browser automation into production-ready agent infrastructure — suitable for real autonomous workflows inside products like Bloom.

---

## License

MIT
