const path = require('path')

const { bootstrap } = require('test-hmr')

bootstrap({
  appPath: path.join(__dirname, '..', 'app'),
})
