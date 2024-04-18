const getSvagEslintNodeConfigs = require('./configs/node')

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  ...getSvagEslintNodeConfigs(),
  {
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
]
