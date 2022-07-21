const path = require('path')

module.exports = ({ config }) => {
  config.resolve.alias = {
    ...config.resolve.alias,
    ...{
      // Should match the configuration in "tsconfig.json" file
      '@src': path.resolve(__dirname, '..', 'src'),
    },
  }

  return config
}
