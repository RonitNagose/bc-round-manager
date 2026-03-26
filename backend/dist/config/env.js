"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
function required(name) {
    const v = process.env[name];
    if (!v)
        throw new Error(`Missing required env var: ${name}`);
    return v;
}
exports.env = {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    PORT: Number(process.env.PORT ?? 4000),
    MONGODB_URI: process.env.MONGODB_URI ?? "",
    JWT_SECRET: process.env.JWT_SECRET ?? "",
    CORS_ORIGIN: process.env.CORS_ORIGIN ?? "",
    // Basic validation for critical vars in auth/bidding steps.
    requireMongoUri: () => required("MONGODB_URI"),
    requireJwtSecret: () => required("JWT_SECRET"),
};
