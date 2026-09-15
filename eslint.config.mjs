import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import js from '@eslint/js';
import globals from 'globals';
import ts from 'typescript-eslint';
import jsdoc from 'eslint-plugin-jsdoc';

export default defineConfig(
  {
    files: ['**/*.{js,ts}'],
    extends: [
      js.configs.recommended,
      ts.configs.recommended,
      ts.configs.strictTypeChecked,
      prettier,
      jsdoc.configs['flat/recommended-typescript']
    ],
    languageOptions: {
      globals: {
        ...globals.node
      },
      parser: ts.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      jsdoc
    },
    rules: {
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/typedef': ['error', { variableDeclaration: true }],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true
        }
      ],
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      'no-console': 'warn',
      'jsdoc/check-indentation': 'off'
    }
  },
  {
    files: ['**/schema.ts', '**/schemas.ts', '**/schemas/*.ts'],
    rules: {
      '@typescript-eslint/typedef': 'off'
    }
  }
);
