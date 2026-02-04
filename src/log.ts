import pino from "pino";

const isProduction = Bun.env["NODE_ENV"] === "production";

function getLoggerConfig() {
  if (isProduction) {
    return {
      level: "info",
    };
  }

  return {
    level: "debug",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  };
}

const logger = pino(getLoggerConfig());

export const log = logger;
export const getLogger = (name: string) => logger.child({ name });
