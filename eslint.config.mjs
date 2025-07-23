import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  eslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
      }
    },
    rules: {
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_'
      }],
      'no-console': 'off', // Keep this off as per your current config
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'prefer-const': 'error',
      'no-var': 'error',
      'arrow-body-style': ['error', 'as-needed'],
      'prefer-arrow-callback': 'error',
      'no-await-in-loop': 'warn'
    }
  },
  {
    ignores: ['node_modules/', 'sessions/', '.wwebjs_auth/', 'dist/', 'whatsapp-sessions/']
  }
]; 