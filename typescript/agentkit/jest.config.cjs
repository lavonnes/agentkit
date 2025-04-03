const baseConfig = require("../jest.config.base.cjs");

module.exports = {
  ...baseConfig,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
  coveragePathIgnorePatterns: ["node_modules", "dist", "docs", "index.ts"],
  coverageThreshold: {},
};