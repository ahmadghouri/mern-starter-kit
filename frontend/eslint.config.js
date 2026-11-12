import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Core ESLint does not see JSX usage, so capitalized names (components) are ignored.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
  },
  {
    // shadcn/ui files export component variants next to components.
    files: ['src/components/ui/**/*.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['**/*.test.{js,jsx}', 'src/test/**', 'jest.config.js', 'babel.config.cjs'],
    languageOptions: { globals: { ...globals.jest, ...globals.node } },
  },
  {
    files: ['vite.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
