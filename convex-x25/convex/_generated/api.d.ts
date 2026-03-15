/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as appStore from "../appStore.js";
import type * as appStoreActions from "../appStoreActions.js";
import type * as appStoreMutations from "../appStoreMutations.js";
import type * as orchestrator from "../orchestrator.js";
import type * as orchestratorMutations from "../orchestratorMutations.js";
import type * as provider from "../provider.js";
import type * as sessions from "../sessions.js";
import type * as tasks from "../tasks.js";
import type * as types from "../types.js";
import type * as workflow from "../workflow.js";
import type * as workflowMutations from "../workflowMutations.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  appStore: typeof appStore;
  appStoreActions: typeof appStoreActions;
  appStoreMutations: typeof appStoreMutations;
  orchestrator: typeof orchestrator;
  orchestratorMutations: typeof orchestratorMutations;
  provider: typeof provider;
  sessions: typeof sessions;
  tasks: typeof tasks;
  types: typeof types;
  workflow: typeof workflow;
  workflowMutations: typeof workflowMutations;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
