export default [
    {
        rules: {
            'indent': ['error', 4], // Enforce 4-space indentation
            'semi': ['error', 'always'], // Require semicolons
            'no-unused-vars': ['error', { 'vars': 'all', 'args': 'after-used', 'ignoreRestSiblings': false }],
            'linebreak-style': ['error', 'unix'], // Enforce Unix line breaks
            'quotes': ['error', 'single', { 'avoidEscape': true }],
            'object-curly-spacing': ['error', 'always'], // Enforce spacing inside braces
            'no-trailing-spaces': 'error', // Disallow trailing spaces
            // 'no-console': 'warn', // 'error' to disallow completely
        },
        ignores: [
            'coverage',
        ],
    },
];
