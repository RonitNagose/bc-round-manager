import { createServer } from "http";
import mongoose from "mongoose";
import { Server as SocketIOServer } from "socket.io";

import { createApp } from "./app";
import { env } from "./config/env";
import { setupSocketHandlers } from "./sockets/socket";
import { startRoundLifecycleWorker } from "./services/roundLifecycleService";
import { setIo } from "./sockets/ioInstance";

async function start() {
  const app = createApp();
  const httpServer = createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN ? [env.CORS_ORIGIN] : true,
      credentials: true,
    },
  });
  setIo(io);
  setupSocketHandlers(io);

  if (env.MONGODB_URI) {
    try {
      mongoose.set("strictQuery", true);
      await mongoose.connect(env.MONGODB_URI);
      // eslint-disable-next-line no-console
      console.log("MongoDB connected");

      // Background worker to handle start/close lifecycle.
      await startRoundLifecycleWorker({ intervalMs: 2000 });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("MongoDB connection failed:", e);
      throw e;
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn("MONGODB_URI not set; skipping MongoDB connection");
  }

  httpServer.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on port ${env.PORT}`);
  });
}

start().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

