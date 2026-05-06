import { SYSTEM_ID, SYSTEM_LABEL } from "../constants/system.constants.js";

type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Central logger so debug output can be toggled and prefixed consistently.
 * Avoid scattered console.log calls.
 */
export class Logger {
  private static debugEnabled = false;

  static setDebug(enabled: boolean): void {
    Logger.debugEnabled = enabled;
  }

  static debug(message: string, data?: unknown): void {
    if (!Logger.debugEnabled) return;
    Logger.write("debug", message, data);
  }

  static info(message: string, data?: unknown): void {
    Logger.write("info", message, data);
  }

  static warn(message: string, data?: unknown): void {
    Logger.write("warn", message, data);
  }

  static error(message: string, data?: unknown): void {
    Logger.write("error", message, data);
  }

  private static write(level: LogLevel, message: string, data?: unknown): void {
    const prefix = `${SYSTEM_LABEL} | ${SYSTEM_ID}`;
    const args = data === undefined ? [prefix, message] : [prefix, message, data];
    switch (level) {
      case "debug":
        console.debug(...args);
        return;
      case "info":
        console.info(...args);
        return;
      case "warn":
        console.warn(...args);
        return;
      case "error":
        console.error(...args);
        return;
    }
  }
}
