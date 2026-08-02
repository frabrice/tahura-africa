import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // The codebase leans on `any` for Supabase rows and event payloads.
      // Surface these as warnings (visible for incremental typing) rather than
      // hard errors so `npm run lint` reflects genuine problems.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Empty catch blocks are used intentionally to swallow best-effort
      // operations (e.g. speech API teardown); other empty blocks stay errors.
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Catch real dead code, but honour the `_`-prefix convention for
      // deliberately unused parameters/bindings.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  }
);
