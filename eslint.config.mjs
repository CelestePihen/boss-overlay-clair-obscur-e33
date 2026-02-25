import eslint from '@eslint/js'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      // Vos règles personnalisées
      eqeqeq: ['error', 'always'], // Test les égalités strictes
      'prefer-const': ['error', { destructuring: 'all' }], // Préfère const pour les variables qui ne sont pas réassignées
      'no-console': 'off',
      'no-debugger': 'error',
      'no-unused-expressions': 'error',
      'no-var': 'error',
      'no-redeclare': 'error',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-const-assign': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': ['error', { fixToUnknown: true }],
    },
  },
  {
    ignores: [
      'node_modules',
      'dist',
      'build',
      'dist-electron',
      'data',
      'tools',
    ],
  },
)
