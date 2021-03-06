// JS config is used for heavy lifting, but all that can be done in YAML
// must preferably be done in YAML
//
// # Reference
//
// https://eslint.org/docs/user-guide/configuring#configuration-file-formats
//
// If there are multiple configuration files in the same directory, ESLint will only use one. The priority order is:
//
//   1. .eslintrc.js
//   2. .eslintrc.yaml
//   3. .eslintrc.yml
//   4. .eslintrc.json
//   5. .eslintrc
//   6. package.json
//
module.exports = {
  extends: ['./.eslintrc'],
  settings: {
    'import/resolver': {
      webpack: {
        // our webpack config crashes if no platform is provided through
        // env, so we're doing it here
        config: require('./webpack.config.js'),
      },
    },
  },
}
