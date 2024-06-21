import { ESLint } from 'eslint';

export default new ESLint({
    baseConfig: {
        env: {
            browser: true,
            es2021: true,
            node: true,
        },
        extends: [
            'eslint:recommended',
            'plugin:@typescript-eslint/recommended',
        ],
        parser: '@typescript-eslint/parser',
        parserOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
        },
        plugins: [
            '@typescript-eslint',
        ],
        rules: {
            // Add custom rules here
        },
    },
});
