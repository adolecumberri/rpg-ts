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

    // Set of linting plugins and base rules to use
    //
    // https://github.com/yannickcr/eslint-plugin-react
    // https://github.com/facebook/react/tree/master/packages/eslint-plugin-react-hooks
    // https://github.com/prettier/eslint-plugin-prettier
    // https://github.com/jest-community/eslint-plugin-jest
    plugins: ["react", "react-hooks", "prettier", "jest"],
    //
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

        "indent": "off",
        "padded-blocks": "off",
        // Fail if the file does not follow the Prettier formatting rules.
        // Uses the framework's prettier config.
        // https://github.com/prettier/eslint-plugin-prettier
        "prettier/prettier": ["error", prettierConfig],

        // console.log sentences issue warnings
        // https://eslint.org/docs/rules/no-console
        "no-console": ["warn", { allow: ["warn", "error"] }],

        // debugger sentences issue errors
        // https://eslint.org/docs/rules/no-debugger
        "no-debugger": "error",

        // Require sentences outside of the global scope issue warnings
        // https://eslint.org/docs/rules/global-require
        "global-require": "warn",

        // Allow usage of Common JS require and module.exports. They are used throughout
        // the tooling config files
        // https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/no-commonjs.md
        "import/no-commonjs": "off",

        // Allow importing transitive dependencies
        // https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/no-extraneous-dependencies.md
        // If enabled, disable directives must be added inline or new entries must be added to the import/core-modules
        // setting. Notice that import/core-modules has an awkward behaviour (see
        // https://github.com/benmosher/eslint-plugin-import/issues/1281)
        "import/no-extraneous-dependencies": "off",

        // Allow unused variables in some instances or when the variable name is prefixed by an underscore
        // https://eslint.org/docs/rules/no-unused-vars
        "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_", ignoreRestSiblings: true }],

        // Imports must point to existent files/modules
        // Webpack aliases are ignored by this rule
        // https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/no-unresolved.md
        "import/no-unresolved": ["error", { ignore: ["@/", "root/", "config/", "forms/", "resources/"] }],

        // Issue errors if the "rules of hooks" are not met
        // https://reactjs.org/docs/hooks-rules.html
        "react-hooks/rules-of-hooks": "error",

        // Issue errors if hooks dependendencies are not exhaustive
        "react-hooks/exhaustive-deps": "error",
    },

    // Additional global variables
    globals: {
        AMIGA: "readonly",
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
