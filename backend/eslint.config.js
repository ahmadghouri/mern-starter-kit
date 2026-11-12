const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^(req|res|next|_)$' }],
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['error'] }],
      'prefer-const': 'error',
    },
  },
  {
    // CLI scripts print status for the developer.
    files: ['scripts/**/*.js'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: { globals: { ...globals.jest } },
  },
];
