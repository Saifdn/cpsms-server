export default {
  testEnvironment: "node",
  transform: { "^.+\\.js$": "babel-jest" },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^../../src/config/upstash\\.js$": "<rootDir>/tests/__mocks__/upstash.js",
    "^../config/upstash\\.js$": "<rootDir>/tests/__mocks__/upstash.js",
    "^./config/upstash\\.js$": "<rootDir>/tests/__mocks__/upstash.js",
  },
  testMatch: ["**/tests/**/*.test.js"],
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "src/services/authService.js",
    "src/services/bookingService.js",
    "src/services/sessionService.js",
    "src/services/paymentService.js",
    "src/services/queueService.js",
    "src/services/userService.js",
    "src/middleware/authMiddleware.js",
    "src/utils/generateTokens.js",
    "src/utils/crypto.js",
  ],
  coverageThreshold: {
    global: { statements: 80, branches: 75, functions: 80, lines: 80 },
  },
  setupFiles: ["./tests/setup/env.js"],
};
