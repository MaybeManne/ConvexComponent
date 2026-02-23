# Browser Use - Convex Component

A **durable browser automation component** built with Convex Components SDK. Run natural language browser tasks that execute to completion, even if you close the browser or refresh the page.

## What It Does

Type a natural language task like:

> "Go to airbnb.com and book a room in Barcelona tomorrow"

Click **Run**, and the agent runs autonomously in a **durable backend workflow** via Browser Use Cloud until it reaches a terminal state (success/failure/canceled). The UI shows a live timeline of what it's doing with screenshots, and a final result payload.

**Key Feature**: Tasks keep running even if you refresh the page. The workflow executes server-side and the UI reconnects to show live progress.

## Architecture

```
+-------------------------------------------------------------+
|                     Next.js Frontend                         |
|  +-------------+  +-------------+  +-----------------------+ |
|  |  TaskInput  |  |  TaskList   |  |      TaskDetail       | |
|  |             |  |  (sidebar)  |  |  - Timeline (live)    | |
|  |  [Run Task] |  |             |  |  - Screenshots        | |
|  +------+------+  +------+------+  |  - Result/Error       | |
|         |                |         +-----------+-----------+ |
+---------+----------------+-----------------------+------------+
          |                |                       |
          |  Convex Reactive Queries (no polling!)
          |                |                       |
+---------+----------------+-----------------------+------------+
|                      Convex Backend                           |
|  +----------------------------------------------------------+ |
|  |              Browser Use Component                        | |
|  |  +------------+  +----------------------------------+    | |
|  |  | Public API |  |         Durable Workflow          |    | |
|  |  |            |  |  +----------------------------+  |    | |
|  |  | startTask  +--+  |  runWorkflowStep           |  |    | |
|  |  | getTask    |  |  |  - Start provider task     |  |    | |
|  |  | listTasks  |  |  |  - Poll for progress       |  |    | |
|  |  | cancelTask |  |  |  - Handle completion       |  |    | |
|  |  +------------+  |  |  - Timeout handling        |  |    | |
|  |                  |  +-------------+--------------+  |    | |
|  |  +------------+  |                |                 |    | |
|  |  |   tasks    |  |  +-------------+--------------+  |    | |
|  |  |   table    +<-+  |      Provider Layer        |  |    | |
|  |  |            |  |  |  (Browser Use Cloud API)   |  |    | |
|  |  | - status   |  |  |                            |  |    | |
|  |  | - progress |  |  |  providerStartTask()       |  |    | |
|  |  | - result   |  |  |  providerGetTask()         |  |    | |
|  |  | - etc.     |  |  |  providerCancelTask()      |  |    | |
|  |  +------------+  |  +----------------------------+  |    | |
|  +----------------------------------------------------------+ |
+---------------------------------------------------------------+
                               |
                               v
               +-------------------------------+
               |    Browser Use Cloud API      |
               |    (Remote Browser Execution) |
               +-------------------------------+
```

## Quick Start

### 1. Clone and Install

```bash
git clone <this-repo>
cd convex-browser-use
npm install
```

### 2. Set Up Convex

```bash
cd example
npx convex dev
```

This will:
- Create a new Convex project (follow the prompts)
- Generate `example/.env.local` with your `NEXT_PUBLIC_CONVEX_URL`
- Start the Convex dev server

### 3. Set Browser Use API Key

In a **separate terminal**, set the API key in Convex:

```bash
cd example
npx convex env set BROWSER_USE_API_KEY bu_YKgj-x5Hhwc_ahghkx8gFM0jwcSXVV6nOZyR4nIM5eU
```

> **Important:** The API key is stored securely in Convex environment variables and is only accessible server-side. It is never exposed to the browser.

### 4. Run the App

In a **second terminal**:

```bash
cd example
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### 5. Test Durability

1. Enter a prompt and click **Run**
2. While the task is running, **refresh the page**
3. Notice the task continues running and the UI reconnects to show live progress

## Running Both Terminals

For convenience, you can run both in parallel from the root:

**Terminal 1:**
```bash
cd example && npx convex dev
```

**Terminal 2:**
```bash
cd example && npm run dev
```

Or use the root package.json script:
```bash
npm run dev
```

## Environment Variables

### Convex Backend (set via `npx convex env set`)

| Variable | Description | Required |
|----------|-------------|----------|
| `BROWSER_USE_API_KEY` | Browser Use Cloud API key | Yes |

### Next.js Frontend (`.env.local`)

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_CONVEX_URL` | Your Convex deployment URL | Yes (auto-generated) |

## Project Structure

```
convex-browser-use/
├── package.json              # Root workspace config
├── README.md                 # This file
│
└── example/                  # Next.js Example App
    ├── package.json
    ├── convex.config.ts      # App config
    ├── playwright.config.ts  # E2E test config
    ├── convex/
    │   ├── schema.ts         # Tasks table schema
    │   ├── types.ts          # Type definitions
    │   ├── tasks.ts          # Public API (queries/mutations)
    │   ├── workflow.ts       # Durable workflow
    │   └── provider.ts       # Browser Use Cloud API
    ├── e2e/
    │   └── browser-use.spec.ts  # Playwright E2E tests
    ├── scripts/
    │   └── test-backend.sh   # Backend smoke test
    └── app/
        ├── layout.tsx
        ├── page.tsx          # Main page
        ├── providers.tsx     # Convex provider
        └── components/
            ├── TaskInput.tsx     # Prompt input + examples
            ├── TaskList.tsx      # Task history sidebar
            ├── TaskDetail.tsx    # Full task view
            ├── Timeline.tsx      # Progress timeline
            ├── StatusBadge.tsx   # Status pills
            ├── JsonViewer.tsx    # Result viewer
            └── Screenshots.tsx   # Screenshot gallery
```

## Component API

### startTask

Start a new browser automation task.

```typescript
const { taskId } = await ctx.runMutation(api.browserUse.startTask, {
  prompt: "Go to airbnb.com and find rooms in Barcelona",
  options: {
    timeoutMs: 300000,     // Optional: 5 minutes
    pollIntervalMs: 2000,  // Optional: 2 seconds
  },
});
```

### getTask

Get full task details (reactive).

```typescript
const task = useQuery(api.browserUse.getTask, { taskId });
// Returns: { _id, prompt, status, progress, screenshots, result, error, ... }
```

### listTasks

List all tasks (newest first).

```typescript
const { tasks, nextCursor } = useQuery(api.browserUse.listTasks, {
  limit: 20,
  cursor: undefined,
});
```

### cancelTask

Cancel a running task.

```typescript
const { ok } = await ctx.runMutation(api.browserUse.cancelTask, { taskId });
```

## How It Works

1. **User submits prompt** - `startTask` mutation creates task record + kicks off workflow
2. **Workflow starts** - Calls Browser Use Cloud API to start remote browser task
3. **Polling loop** - Workflow polls provider, appends progress events to DB
4. **UI updates** - Convex reactive query automatically pushes changes to UI
5. **Completion** - Workflow stores result/error, marks task terminal
6. **Durability** - If server restarts mid-workflow, Convex scheduler resumes automatically

## Key Design Decisions

- **Convex Components SDK** - Isolated schema/state, clean separation from app
- **Scheduler-based Polling** - Durable execution, survives restarts
- **No client polling** - All updates via Convex reactive queries
- **Progress deduplication** - Cursor-based tracking prevents duplicate events
- **Secret redaction** - API keys and sensitive data filtered from logs
- **Cancellation** - Workflow checks cancel flag each iteration

## Security

### API Key Protection

- **Server-side only**: The `BROWSER_USE_API_KEY` is stored in Convex environment variables and only accessed in Convex actions (server-side). It is **never** sent to the browser.
- **No logging**: The API key is never logged to console or stored in the database.
- **Convex actions**: All Browser Use Cloud API calls happen in Convex actions, which run server-side in a secure environment.

### Input Validation

- Prompts are validated for length (max 10,000 characters) and emptiness
- Task IDs are validated as proper Convex IDs before database operations
- All user input is sanitized before being stored or displayed

### Defense in Depth

- **Idempotency guards**: Workflow mutations check for terminal states before making changes
- **Retry with backoff**: Provider layer retries failed requests with exponential backoff
- **Timeout protection**: Tasks automatically fail after timeout (default 5 minutes)
- **Cancellation**: Users can cancel running tasks at any time

## Automated Testing

The project includes both E2E tests and backend smoke tests that run without calling the Browser Use Cloud API.

### Test Mode

Tests run in **test mode** which uses deterministic mock responses instead of real API calls. This is controlled by the `BROWSER_USE_TEST_MODE=1` environment variable.

### Quick Start

```bash
# Install Playwright browsers (first time only)
npm run test:install

# Run all E2E tests
npm run test

# Run tests with browser visible
npm run test:headed

# Run backend smoke tests
npm run test:backend
```

### Running Tests Step-by-Step

**Terminal 1 - Convex dev server with test mode:**
```bash
cd example
BROWSER_USE_TEST_MODE=1 npx convex dev
```

**Terminal 2 - Next.js dev server:**
```bash
cd example
npm run dev
```

**Terminal 3 - Run tests:**
```bash
cd example
npm run test:e2e
```

### E2E Test Coverage

The Playwright E2E tests cover:

| Test | Description |
|------|-------------|
| Test 1 | Page loads and Run button enables when prompt filled |
| Test 2 | Clicking Run creates a task in history |
| Test 3 | Timeline updates with at least 2 events |
| Test 4 | Refresh mid-run and task still exists (durability) |
| Test 5 | Cancel works and status becomes canceled |

### Backend Smoke Test

The backend smoke test verifies that Convex functions are deployed and responding correctly:

```bash
npm run test:backend
```

This tests:
- `tasks:listTasks` returns correct response shape with `tasks` array and `nextCursor`

## Manual Test Checklist

Use this checklist to verify the component is working correctly:

### Basic Functionality

- [ ] **Start a task**: Enter "Go to google.com and search for 'Convex database'" and click Run
  - Task should appear in sidebar with "Running" badge
  - Timeline should show progress events
  - Screenshots should appear as the agent navigates

- [ ] **Task completion**: Wait for task to finish
  - Status should change to "Succeeded" or "Failed"
  - Result/error should be displayed
  - Run button should be re-enabled

### Durability

- [ ] **Page refresh during task**: Start a task, then refresh the page while it's running
  - Task should still be running after refresh
  - UI should reconnect and show live progress
  - Task should complete normally

- [ ] **Close and reopen browser**: Start a task, close the browser, wait, reopen
  - Task should have continued running
  - Final state should be visible

### Cancellation

- [ ] **Cancel running task**: Start a task and click Cancel while it's running
  - Status should change to "Canceled"
  - Timeline should show cancellation event
  - No further progress events should appear

### Error Handling

- [ ] **Missing API key**: Remove `BROWSER_USE_API_KEY` env var and try to start a task
  - Should show clear error message about missing API key
  - UI should display API key warning banner

- [ ] **Invalid prompt**: Try to submit an empty prompt
  - Should show validation error
  - Should not create a task

- [ ] **Long prompt**: Enter a prompt > 10,000 characters
  - Should show character count warning
  - Should reject submission with error

### Edge Cases

- [ ] **Multiple tasks**: Start multiple tasks in succession
  - All tasks should be visible in sidebar
  - Selecting different tasks should show their details
  - Only one task can be "in progress" at a time (UI disabled)

- [ ] **Task timeout**: Start a very long task and wait for timeout
  - Task should fail with timeout error after 5 minutes (default)

### UI Polish

- [ ] **Screenshots**: Click on a screenshot thumbnail
  - Lightbox should open with full-size image
  - Arrow keys should navigate between screenshots
  - Escape should close lightbox

- [ ] **Timeline auto-scroll**: Watch timeline during task execution
  - Should auto-scroll to show latest events
  - Should stop auto-scrolling when user scrolls up

- [ ] **Status badges**: Verify correct colors
  - Queued: Gray
  - Running: Blue (pulsing)
  - Succeeded: Green
  - Failed: Red
  - Canceled: Yellow/Orange

## Troubleshooting

### "Child component browserUse not found"

This error occurred when using the Convex Components SDK wrapper pattern. **We've removed this pattern entirely.**

**Previous (broken) approach:**
```typescript
// DON'T DO THIS - components object was empty
import { components } from "./_generated/api";
await ctx.runQuery(components.browserUse.tasks.listTasks, args);
```

**Current (working) approach:**
The browser automation code now lives directly in `example/convex/` instead of as a separate component. The frontend calls `api.tasks.*` functions directly:

```typescript
// Frontend (page.tsx)
import { api } from "../convex/_generated/api";

const tasksResult = useQuery(api.tasks.listTasks, { limit: 50 });
const startTask = useMutation(api.tasks.startTask);
```

If you see this error:
1. Delete any `example/convex/browserUse.ts` wrapper file
2. Ensure `example/convex/tasks.ts` exists with the public API
3. Restart `npx convex dev`

### "Could not find public function for 'browserUse:listTasks'"

This is the same root cause as above. The fix is to use `api.tasks.*` instead of `api.browserUse.*`:

```typescript
// Change this:
useQuery(api.browserUse.listTasks, { limit: 50 });

// To this:
useQuery(api.tasks.listTasks, { limit: 50 });
```

### "BROWSER_USE_API_KEY is not set"

Set the API key in Convex environment variables:

```bash
cd example
npx convex env set BROWSER_USE_API_KEY your_api_key_here
```

### Tasks stuck in "queued" status

1. Check the Convex dashboard logs for errors
2. Verify the API key is set correctly
3. Check that the Browser Use Cloud API is accessible

## Deploying to Production

### 1. Deploy Convex Backend

```bash
cd example
npx convex deploy
```

Set environment variables in the Convex dashboard:
- `BROWSER_USE_API_KEY` - your production API key

### 2. Deploy Next.js to Vercel

```bash
cd example
vercel
```

Set environment variable in Vercel:
- `NEXT_PUBLIC_CONVEX_URL` - your production Convex URL

## License

MIT
