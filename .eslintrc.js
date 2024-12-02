module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint/eslint-plugin'],
    extends: [
        'alloy',
        'alloy/typescript',
    ],
    root: true,
    env: {
        node: true,
        jest: true,
    },
    globals: {
        NodeJS: true,
    },
    rules: {
        'react/react-in-jsx-scope': 'off',
        semi: ['error', 'always'],
        'comma-dangle': ['error', 'always-multiline'],
        'switch-colon-spacing': ['error', {
            'after': true,
            'before': false,
        }],
        quotes: ['error', 'single'],
        indent: ['error', 4, {
            SwitchCase: 1,
        }],
        'eol-last': ['error', 'always'],
        'space-infix-ops': 'off',
        'max-nested-callbacks': 'off',
        'max-params': 'off',
        'prefer-regex-literals': 'off',
        'no-unused-vars': 'off',
        'no-useless-call': 'off',
        'complexity': 'off',
        'constructor-super': 'off',
        'no-new-func': 'off',
        'comma-spacing': ['error', {
            'before': false,
            'after': true,
        }],
        'arrow-parens': ['error', 'always'],
        'keyword-spacing': [
            'error',
            {
                'before': true,
                'after': true,
            },
        ],
        'key-spacing': [2, {
            'beforeColon': false,
            'afterColon': true,
            'mode': 'strict',
        }],
        'no-multiple-empty-lines': ['error', {
            'max': 1,
            'maxEOF': 1,
        }],
        'object-property-newline': ['error', {
            'allowAllPropertiesOnSameLine': false,
        }],
        '@typescript-eslint/semi': ['error', 'always'],
        '@typescript-eslint/space-infix-ops': ['error', {
            'int32Hint': true,
        }],
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/interface-name-prefix': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/consistent-type-assertions': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-parameter-properties': 'off',
        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/type-annotation-spacing': [
            'error',
            {
                'before': true,
                'after': true,
                'overrides': {
                    'colon': {
                        'before': false,
                        'after': true,
                    },
                },
            },
        ],
    },
};
