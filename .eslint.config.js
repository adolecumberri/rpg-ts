const prettierConfig = require("./prettier.config");

// ESLINT configuration
// https://eslint.org/docs/user-guide/configuring
module.exports = {
    // Use babel-eslint to lint ES2015+ syntax
    parser: "babel-eslint",

    parserOptions: {
        // ES2018 syntax
        ecmaVersion: 9,

        // ES2015 modules support
        sourceType: "module",

        ecmaFeatures: {
            // JSX support
            jsx: true,
        },
    },

    // Environment: browser + node + ES2105+
    env: {
        es6: true,
        browser: true,
        node: true,
    },
    // https://github.com/suchipi/eslint-config-unobtrusive
    // https://github.com/prettier/eslint-config-prettier
    extends: ["unobtrusive", "unobtrusive/react", "unobtrusive/import", "prettier", "prettier/react"],

    settings: {
        // eslint-plugin-react configuration. Detect React version
        // https://github.com/yannickcr/eslint-plugin-react#configuration
        react: {
            version: "detect",
        },

        // eslint-plugin-import: resolution algorithm uses the resolve and aliases from
        // the webpack.config.js file.
        // https://github.com/benmosher/eslint-plugin-import#resolvers
        "import/resolver": {
            node: {
                paths: ["./src/"],
                extensions: [".js", ".jsx", ".json"],
            },
            alias: {
                map: [
                    ["@", "./src"],
                    ["config", "./config"],
                    ["resources", "./resources"],
                    ["root", "."],
                ],
                extensions: [".js", ".jsx", ".json"],
            },
        },
        // Mark React and Redux as core modules. They won't be taken into account by the
        // import/no-extraneous-dependencies rule.
        // https://github.com/benmosher/eslint-plugin-import#importcore-modules
        "import/core-modules": ["react", "redux", "react-redux"],
    },

    // Rules overriding
    rules: {
        "@stylistic/arrow-parens": "as-needed",
        "indent": "off",
        "padded-blocks": "off",
        // Fail if the file does not follow the Prettier formatting rules.
        // Uses the framework's prettier config.
        // https://github.com/prettier/eslint-plugin-prettier
        "prettier/prettier": ["error", prettierConfig],

        // Allow usage of Common JS require and module.exports. They are used throughout
        // the tooling config files
        // https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/no-commonjs.md
        "import/no-commonjs": "off",

    },


    overrides: [
        {
            // Rules only applied to test files
            files: ["*-test.js", "*-test.jsx", "*.test.js", "*.test.jsx"],

            // Allow Jest global variables: jest, expect, it, test, describe, etc.
            env: {
                "jest/globals": true,
            },

            // Rules for Jest tests
            // https://github.com/jest-community/eslint-plugin-jest
            //
            // * Disallow skipped tests
            // * Disallow focused tests
            // * Disallow repeated test case names
            // * Do not import "jest"
            // * Prefer toBeNull, toBeUndefined and toHaveLength over toBe(xxx)
            // * Disallow invalid "describe" callbacks
            // * Disallow malformed expect expressions
            //
            rules: {
                "jest/no-disabled-tests": "error",
                "jest/no-focused-tests": "error",
                "jest/no-identical-title": "error",
                "jest/no-jest-import": "error",
                "jest/no-test-return-statement": "error",
                "jest/prefer-to-be-null": "warn",
                "jest/prefer-to-be-undefined": "warn",
                "jest/prefer-to-have-length": "warn",
                "jest/valid-describe": "error",
                "jest/valid-expect": "error",
            },
        },
    ],
};
