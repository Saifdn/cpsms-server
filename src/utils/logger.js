const isProd = process.env.NODE_ENV === "production";

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LEVELS[process.env.LOG_LEVEL] ?? (isProd ? LEVELS.info : LEVELS.debug);

function log(level, message, meta = {}) {
  if (LEVELS[level] > currentLevel) return;

  if (isProd) {
    process.stdout.write(
      JSON.stringify({ ts: new Date().toISOString(), level, message, ...meta }) + "\n"
    );
  } else {
    const colors = { error: "\x1b[31m", warn: "\x1b[33m", info: "\x1b[36m", debug: "\x1b[90m" };
    const reset = "\x1b[0m";
    const metaStr = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
    const prefix = `${colors[level]}[${level.toUpperCase()}]${reset}`;
    console.log(`${prefix} ${message}${metaStr}`);
  }
}

export const logger = {
  error: (message, meta) => log("error", message, meta),
  warn:  (message, meta) => log("warn",  message, meta),
  info:  (message, meta) => log("info",  message, meta),
  debug: (message, meta) => log("debug", message, meta),
};
