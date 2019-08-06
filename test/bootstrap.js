const path = require('path')
const { bootstrap, config } = require('test-hmr')

const { appPath } = config
process.env.SVELTE = path.resolve(appPath, 'node_modules', 'svelte')

bootstrap()
