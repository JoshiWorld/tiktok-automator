import { automationSessionRouter } from "@/server/api/routers/automationSession";
import { monitoredVideoRouter } from "@/server/api/routers/monitoredVideo";
import { tiktokAccountRouter } from "@/server/api/routers/tiktokAccount";
import { workflowRuleRouter } from "@/server/api/routers/workflowRule";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  tiktokAccount: tiktokAccountRouter,
  monitoredVideo: monitoredVideoRouter,
  workflowRule: workflowRuleRouter,
  automationSession: automationSessionRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for your tRPC API.
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCaller = createCallerFactory(appRouter);
