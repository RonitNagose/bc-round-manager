"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const mongoose_1 = __importDefault(require("mongoose"));
const socket_io_1 = require("socket.io");
const app_1 = require("./app");
const env_1 = require("./config/env");
const socket_1 = require("./sockets/socket");
const roundLifecycleService_1 = require("./services/roundLifecycleService");
const ioInstance_1 = require("./sockets/ioInstance");
async function start() {
    const app = (0, app_1.createApp)();
    const httpServer = (0, http_1.createServer)(app);
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: env_1.env.CORS_ORIGIN ? [env_1.env.CORS_ORIGIN] : true,
            credentials: true,
        },
    });
    (0, ioInstance_1.setIo)(io);
    (0, socket_1.setupSocketHandlers)(io);
    if (env_1.env.MONGODB_URI) {
        try {
            mongoose_1.default.set("strictQuery", true);
            await mongoose_1.default.connect(env_1.env.MONGODB_URI);
            // eslint-disable-next-line no-console
            console.log("MongoDB connected");
            // Background worker to handle start/close lifecycle.
            await (0, roundLifecycleService_1.startRoundLifecycleWorker)({ intervalMs: 2000 });
        }
        catch (e) {
            // eslint-disable-next-line no-console
            console.error("MongoDB connection failed:", e);
            throw e;
        }
    }
    else {
        // eslint-disable-next-line no-console
        console.warn("MONGODB_URI not set; skipping MongoDB connection");
    }
    httpServer.listen(env_1.env.PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`Server listening on port ${env_1.env.PORT}`);
    });
}
start().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
});
