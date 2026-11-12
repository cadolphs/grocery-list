import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Lenient for now -- tighten incrementally
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // ADR-009: no classes. The single exception (React error boundary) carries
    // an inline disable with its reason.
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ClassDeclaration, ClassExpression',
          message:
            'No classes (ADR-009): use a factory function, a pure function, or a hook.',
        },
      ],
    },
  },
  {
    // ADR-001-architecture-style-and-paradigm: domain and ports stay free of
    // frameworks and of the layers that depend on them. Tests may wire null
    // adapters.
    files: ['src/domain/**/*.ts', 'src/ports/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/adapters/**',
                '**/auth/**',
                '**/hooks/**',
                '**/ui/**',
                '**/components/**',
                '**/storage/**',
              ],
              message:
                'domain and ports must not import adapters, auth, hooks, or UI (ADR-001-architecture-style-and-paradigm).',
            },
            {
              group: [
                'react',
                'react-*',
                'expo',
                'expo-*',
                'firebase',
                'firebase/*',
                '@react-native-async-storage/*',
              ],
              message:
                'domain and ports must not import frameworks or storage SDKs (ADR-001-architecture-style-and-paradigm).',
            },
          ],
        },
      ],
    },
  },
  {
    // Adapters and auth implement ports; they never reach up into hooks or UI.
    files: ['src/adapters/**/*.ts', 'src/auth/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/hooks/**', '**/ui/**', '**/components/**'],
              message:
                'adapters and auth must not import hooks or UI (ADR-001-architecture-style-and-paradigm).',
            },
          ],
        },
      ],
    },
  },
  {
    // scripts/*.mjs run under plain Node (no TypeScript, no bundler), so they
    // get the base recommended rules plus the Node globals they use.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        AbortSignal: 'readonly',
        setTimeout: 'readonly',
      },
    },
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      'web/',
      '.stryker-tmp/',
      '.expo/',
      'babel.config.js',
      'jest.setup.js',
      'stryker.config.mjs',
    ],
  },
);
