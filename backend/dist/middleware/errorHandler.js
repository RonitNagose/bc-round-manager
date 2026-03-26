"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
exports.notFoundHandler = notFoundHandler;
exports.errorHandler = errorHandler;
const mongoose_1 = __importDefault(require("mongoose"));
class ApiError extends Error {
    constructor(statusCode, message, options) {
        super(message);
        this.statusCode = statusCode;
        this.code = options?.code;
        this.details = options?.details;
    }
}
exports.ApiError = ApiError;
function notFoundHandler(req, res) {
    res.status(404).json({
        message: `Not found: ${req.method} ${req.originalUrl}`,
    });
}
function errorHandler(err, _req, res, _next) {
    // eslint-disable-next-line no-console
    console.error(err);
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            message: err.message,
            code: err.code,
            details: err.details,
        });
    }
    if (err instanceof mongoose_1.default.Error.ValidationError) {
        return res.status(400).json({
            message: err.message,
            code: "VALIDATION_ERROR",
        });
    }
    if (err instanceof mongoose_1.default.Error.CastError) {
        return res.status(400).json({
            message: `Invalid ${err.path}`,
            code: "VALIDATION_ERROR",
        });
    }
    if (typeof err === "object" &&
        err !== null &&
        "code" in err &&
        err.code === 11000) {
        return res.status(409).json({
            message: "Duplicate value",
            code: "CONFLICT",
            details: err,
        });
    }
    return res.status(500).json({
        message: "Internal server error",
    });
}
