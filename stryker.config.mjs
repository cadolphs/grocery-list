/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  mutate: [
    'src/domain/**/*.ts',
    'src/ports/**/*.ts',
  ],
  testRunner: 'jest',
  jest: {
    projectType: 'custom',
    configFile: 'package.json',
  },
  checkers: [],
  reporters: ['clear-text', 'html'],
  thresholds: {
    high: 90,
    low: 80,
    break: 80,
  },
  timeoutMS: 30000,
  concurrency: 2,
};
