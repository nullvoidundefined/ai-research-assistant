import pino from "pino";
import { isDevelopment } from "app/config/env.js";

export const logger = pino({
    level: process.env.LOG_LEVEL ?? "info",
    ...(isDevelopment && {
        transport: {
            target: "pino-pretty",
            options: { colorize: true },
        },
    }),
});
