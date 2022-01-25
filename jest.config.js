/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  resetMocks: true,
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  testRegex: ['(\\.|/).+\\.test\\.[jt]sx?$'],
  globals: {
    'ts-jest': {
      useESM: true,
      isolatedModules: true,
    },
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.ts$': '$1',
    '@shopify/support': '<rootDir>/../support/src/index.ts',
  },
  moduleDirectories: ['node_modules', '<rootDir>'],
};
