module.exports = {
  parser: '@typescript-eslint/parser',
  settings: {},
  parserOptions: {
    project: './tsconfig.json',
    EXPERIMENTAL_useSourceOfProjectReferenceRedirect: true,
  },
  plugins: ['@nrwl/nx']
  // WARNING: If you want to add new rules/plugins, you need to add them to the eslint-plugin-cli package.
  extends: ['plugin:@shopify/cli/configs'],
  rules: {
    '@nrwl/nx/enforce-module-boundaries': [
      'error',
      {
        allow: [],
        depConstraints: [
          {
            sourceTag: 'scope:feature',
            onlyDependOnLibsWithTargs: ['scope:foundation'],
          },
          {
            sourceTag: 'scope:plugin',
            onlyDependOnLibsWithTargs: ['scope:foundation'],
          },
          {
            sourceTag: 'scope:cli',
            onlyDependOnLibsWithTargs: ['scope:foundation', 'scope:feature'],
          },
          {
            sourceTag: 'scope:create-cli',
            onlyDependOnLibsWithTargs: ['scope:foundation'],
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['**/public/**/*.ts'],
      excludedFiles: [
        '*.test.ts',
        // TODO: Document all the public modules
        '**/public/node/abort.ts',
        '**/public/node/analytics.ts',
        '**/public/node/base-command.ts',
        '**/public/node/cli.ts',
        '**/public/node/dot-env.ts',
        '**/public/node/error-handler.ts',
        '**/public/node/framework.ts',
        '**/public/node/fs.ts',
        '**/public/node/github.ts',
        '**/public/node/hooks/prerun.ts',
        '**/public/node/os.ts',
        '**/public/node/node-package-manager.ts',
        '**/public/node/plugins/tunnel.ts',
        '**/public/node/environments.ts',
        '**/public/node/result.ts',
        '**/public/node/themes/**/*',
      ],
      rules: {
        'jsdoc/check-access': 'error',
        'jsdoc/check-alignment': 'error',
        'jsdoc/check-indentation': 'error',
        'jsdoc/check-line-alignment': 'error',
        'jsdoc/check-param-names': 'error',
        'jsdoc/check-property-names': 'error',
        'jsdoc/check-syntax': 'error',
        'jsdoc/check-tag-names': 'error',
        'jsdoc/check-types': 'error',
        'jsdoc/check-values': 'error',
        'jsdoc/empty-tags': 'error',
        'jsdoc/implements-on-classes': 'error',
        'jsdoc/match-description': 'error',
        'jsdoc/multiline-blocks': 'error',
        'jsdoc/newline-after-description': 'error',
        'jsdoc/no-bad-blocks': 'error',
        'jsdoc/no-defaults': 'error',
        'jsdoc/no-multi-asterisks': 'error',
        'jsdoc/no-types': 'error',
        'jsdoc/no-undefined-types': 'error',
        'jsdoc/require-asterisk-prefix': 'error',
        'jsdoc/require-description': 'error',
        'jsdoc/require-description-complete-sentence': 'error',
        'jsdoc/require-hyphen-before-param-description': 'error',
        'jsdoc/require-jsdoc': 'error',
        'jsdoc/require-param': 'error',
        'jsdoc/require-param-description': 'error',
        'jsdoc/require-param-name': 'error',
        'jsdoc/require-property': 'error',
        'jsdoc/require-property-description': 'error',
        'jsdoc/require-property-name': 'error',
        'jsdoc/require-property-type': 'error',
        'jsdoc/require-returns': 'error',
        'jsdoc/require-returns-check': 'error',
        'jsdoc/require-returns-description': 'error',
        'jsdoc/require-throws': 'error',
        'jsdoc/require-yields': 'error',
        'jsdoc/require-yields-check': 'error',
        'jsdoc/tag-lines': 'error',
        'jsdoc/valid-types': 'error',
      },
      settings: {
        jsdoc: {
          mode: 'typescript',
        },
      },
    },
    {
      files: ['**/*.test.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-restricted-syntax': 'off',
      },
    },
    {
      files: ['src/public/**/*.ts'],
      rules: {
        '@typescript-eslint/explicit-module-boundary-types': 'error',
      },
      excludedFiles: ['**/public/node/themes/**/*'],
    },
    {
      files: ['src/private/node/ui/components/**/*.tsx'],
      extends: ['plugin:react/recommended'],
      rules: {
        'react/destructuring-assignment': 2,
        'react/function-component-definition': [
          'error',
          {
            namedComponents: 'arrow-function',
            unnamedComponents: 'arrow-function',
          },
        ],
        'react/hook-use-state': 2,
        'react/jsx-boolean-value': 2,
        'react/jsx-child-element-spacing': 2,
        'react/jsx-closing-bracket-location': 2,
        'react/jsx-closing-tag-location': 2,
        'react/jsx-curly-brace-presence': 2,
        'react/jsx-curly-spacing': 2,
        'react/jsx-equals-spacing': 2,
        'react/jsx-first-prop-new-line': 2,
        'react/jsx-fragments': 2,
        'react/jsx-handler-names': 2,
        'react/jsx-indent': [2, 2, {checkAttributes: true, indentLogicalExpressions: true}],
        'react/jsx-indent-props': [2, 2],
        'react/jsx-no-leaked-render': 2,
        'react/jsx-no-useless-fragment': 2,
        'react/jsx-pascal-case': 2,
        'react/jsx-props-no-multi-spaces': 2,
        'react/jsx-tag-spacing': 2,
        'react/no-namespace': 2,
        'react/no-object-type-as-default-prop': 2,
        'react/self-closing-comp': 2,
        'react/no-unused-prop-types': 2,
        'import/no-default-export': 2,
        'import/no-namespace': 2,
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'react',
                importNames: ['FC'],
                message: 'Please use FunctionComponent from react instead.',
              },
            ],
          },
        ],
        '@typescript-eslint/naming-convention': [
          'error',
          {
            selector: 'interface',
            format: ['PascalCase'],
            custom: {
              regex: '^Props',
              match: false,
            },
          },
        ],
      },
      settings: {
        react: {
          version: 'detect',
        },
      },
    },
    {
      files: ['src/public/node/ui.tsx'],
      rules: {
        'max-params': ['error', 1],
      },
    },
  ],
  ignorePatterns: ['assets/cli-ruby/lib/shopify_cli/theme/dev_server/hot_reload/resources/*.js'],
}
