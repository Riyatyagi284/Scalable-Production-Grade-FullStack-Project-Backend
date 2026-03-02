/** @type {import('ts-jest').JestConfigWithTsJest} */

export const preset = "ts-jest";
export const testEnvironment = "node";
export const verbose = true;
export const collectCoverage = true;
export const coverageProvider = "v8";
export const collectCoverageFrom = ["src/**/*.ts", "!tests/**", "!**/node_modules/**"];