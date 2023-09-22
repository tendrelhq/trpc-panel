import express from "express";
import { renderTrpcPanel } from "trpc-panel";
import connectLiveReload from "connect-livereload";
import morgan from "morgan";
import * as trpcExpress from "@trpc/server/adapters/express";
import cors from "cors";
import { testRouter } from "./router.js";

const serverUrl = process.env.SERVER_URL ?? "localhost";
const trpcPath = process.env.TRPC_PATH ?? "trpc";
const port = Number(process.env.DEV_PORT ?? 4000);
// to marginally improve local development experience
const liveReload = process.env.LIVE_RELOAD === "true";
const simulateDelay = process.env.SIMULATE_DELAY === "true";

if (!serverUrl) throw new Error("No SERVER_URL passed.");
if (!trpcPath) throw new Error("No TRPC_PATH passed.");

async function createContext(opts: trpcExpress.CreateExpressContextOptions) {
  const authHeader = opts.req.headers["authorization"];
  return {
    authorized: !!authHeader,
  };
}

const expressApp = express();
expressApp.use(cors({ origin: "*" }));

if (liveReload) {
  expressApp.use(connectLiveReload());
}

if (simulateDelay) {
  console.log("Simulating delay...");
  expressApp.use((req, res, next) => {
    setTimeout(() => {
      next();
      console.log("Next in timeout");
    }, 1000);
  });
}

expressApp.use(morgan("short", {}));
expressApp.use(
  `/${trpcPath}`,
  trpcExpress.createExpressMiddleware({
    router: testRouter,
    createContext,
  })
);

expressApp.get("/", (_req, res) => {
  res.send(
    renderTrpcPanel(testRouter, {
      url: `${serverUrl}${port ? `:${port}` : ""}/${trpcPath}`,
      transformer: "superjson",
    })
  );
});

expressApp.listen(port, () => {
  console.log(`Test App started at ${serverUrl}:${port}`);
});
