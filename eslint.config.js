import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '*.config.*'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Hook call order and effect dependencies — the bugs TypeScript can't see.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Unused code is already a TypeScript error (noUnusedLocals/Parameters).
      '@typescript-eslint/no-unused-vars': 'off',
      // TypeScript resolves globals itself.
      'no-undef': 'off',
    },
  },
)
