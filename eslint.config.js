import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const nodeGlobals = {
  Buffer: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  console: 'readonly',
  process: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
};

const browserGlobals = {
  AbortController: 'readonly',
  BeforeUnloadEvent: 'readonly',
  Event: 'readonly',
  HTMLElement: 'readonly',
  MouseEvent: 'readonly',
  Request: 'readonly',
  Response: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  addEventListener: 'readonly',
  clearTimeout: 'readonly',
  document: 'readonly',
  history: 'readonly',
  location: 'readonly',
  removeEventListener: 'readonly',
  setTimeout: 'readonly',
  window: 'readonly',
};

const relaxedTypedRules = {
  '@typescript-eslint/await-thenable': 'off',
  '@typescript-eslint/no-base-to-string': 'off',
  '@typescript-eslint/no-confusing-void-expression': 'off',
  '@typescript-eslint/no-deprecated': 'off',
  '@typescript-eslint/no-dynamic-delete': 'off',
  '@typescript-eslint/no-empty-object-type': 'off',
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-implied-eval': 'off',
  '@typescript-eslint/no-invalid-void-type': 'off',
  '@typescript-eslint/no-misused-promises': 'off',
  '@typescript-eslint/no-non-null-assertion': 'off',
  '@typescript-eslint/no-redundant-type-constituents': 'off',
  '@typescript-eslint/no-unnecessary-condition': 'off',
  '@typescript-eslint/no-unnecessary-type-assertion': 'off',
  '@typescript-eslint/no-unnecessary-type-conversion': 'off',
  '@typescript-eslint/no-unnecessary-type-parameters': 'off',
  '@typescript-eslint/no-unsafe-argument': 'off',
  '@typescript-eslint/no-unsafe-assignment': 'off',
  '@typescript-eslint/no-unsafe-call': 'off',
  '@typescript-eslint/no-unsafe-member-access': 'off',
  '@typescript-eslint/no-unsafe-return': 'off',
  '@typescript-eslint/prefer-nullish-coalescing': 'off',
  '@typescript-eslint/prefer-optional-chain': 'off',
  '@typescript-eslint/require-await': 'off',
  '@typescript-eslint/restrict-template-expressions': 'off',
  '@typescript-eslint/unbound-method': 'off',
  'no-constant-binary-expression': 'off',
};

export default [
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.changeset/**',
      '**/.cookbook-router/**',
    ],
  },
  {
    ...js.configs.recommended,
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: nodeGlobals,
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...browserGlobals,
        ...nodeGlobals,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      ...relaxedTypedRules,
      'no-console': 'off',
      'no-undef': 'off',
    },
  },
  {
    files: [
      '**/*.test.{ts,tsx}',
      'e2e/**/*.{ts,tsx}',
      'examples/**/*.{ts,tsx}',
      'consumer-trial/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  prettier,
];
