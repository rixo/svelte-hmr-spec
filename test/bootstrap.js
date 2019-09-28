const path = require('path')
const { bootstrap, config } = require('test-hmr')

const { appPath } = config
if (appPath) {
  // TODO remove svelte dep
  process.env.SVELTE = path.resolve(appPath, 'node_modules', 'svelte')
}

bootstrap()
