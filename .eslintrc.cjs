module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // Import rules - STRICT MODULE BOUNDARIES
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          {
            target: './src/tracking/*/domain/**',
            from: './src/tracking/*/index.ts',
            message: 'Domain klasörüne doğrudan erişim yasak - sadece ports/ üzerinden erişim',
          },
          {
            target: './src/tracking/*/adapters/**',
            from: './src/tracking/*/index.ts',
            message: 'Adapters klasörüne doğrudan erişim yasak - sadece ports/ üzerinden erişim',
          },
          {
            target: './src/tracking/*/domain/**',
            from: './src/tracking/*/adapters/**',
            message: 'Domain klasörüne adapters\'dan erişim yasak - tek yönlü bağımlılık',
          },
        ],
      },
    ],
    'import/no-cycle': 'error',
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    
    // General rules
    'no-console': 'off', // Allow console.log for development
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
  ],
};
