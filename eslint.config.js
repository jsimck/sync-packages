import baseConfig from '@utima/eslint-config';

export default [
  ...baseConfig,
  {
    files: ['**/*.js'],
    rules: {
      'no-console': 'off',
    },
  },
];
