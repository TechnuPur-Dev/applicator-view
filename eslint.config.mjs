import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import jestPlugin from 'eslint-plugin-jest';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
	{
		// Ignores files and directories not relevant for linting
		ignores: [
			'**/build/**',
			'**/dist/**',
			'node_modules/',
			'coverage',
			'docker',
		],
	},
	prettierConfig, // Disable ESLint rules that conflict with Prettier
	eslint.configs.recommended, // Base recommended ESLint rules
	...tseslint.configs.strict, // Strict rules for catching potential bugs
	...tseslint.configs.stylistic, // Rules for consistent styling (optional)
	{
		// Jest plugin config for .spec.ts files
		files: ['**/*.spec.ts'],
		...jestPlugin.configs['flat/recommended'],
	},
);
