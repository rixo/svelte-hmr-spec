#!/usr/bin/env node

const path = require('path')

const Mocha = require('mocha')
const glob = require('fast-glob')

const { config } = require('test-hmr')

// 'node' or 'cli'
const runMethod = 'node'

const makeAbsolute = (name, basePath) =>
  path.isAbsolute(name) ? name : path.join(basePath, name)

const abs = name => path.join(__dirname, name)

const resolveAppPath = (arg, cwd) => {
  if (!arg) {
    return cwd
  }
  if (path.isAbsolute(arg)) {
    return arg
  }
  return makeAbsolute(arg, cwd)
}

// Run mocha programmatically:
//   https://github.com/mochajs/mocha/wiki/Using-mocha-programmatically
const runWithNode = async () => {
  let mocha
  let files
  let runAgain
  let runner

  const parseArgs = argv => {
    const options = { watch: false }
    let setKey = null
    const positionals = argv.slice(2).filter(arg => {
      if (setKey) {
        options[setKey] = arg
      } else if (arg === '--watch' || arg === 'w') {
        options.watch = true
      } else if (arg === '--detail' || arg === 'd') {
        setKey = 'detail'
      } else if (arg === '--steps') {
        options.detail = Math.max(options.detail || 0, 2)
      } else if (arg === '--min') {
        options.detail = Math.min(options.detail || 0, 0)
      } else {
        return true
      }
    })
    if (positionals.length > 0) {
      options.app = positionals.shift()
    }
    if (positionals.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`Usage: svhs [--watch] [--steps|--min] [APP_PATH=.]`)
      process.exit(255)
    }
    return options
  }

  const { watch, app: appArg, detail } = parseArgs(process.argv)

  const appPath = await resolveAppPath(appArg, process.cwd())

  const run = async () => {
    if (mocha) {
      mocha.unloadFiles()
    }

    files = []

    mocha = new Mocha({
      reporter: 'mocha-unfunk-reporter',
      timeout: 5000,
      slow: 1000,
    })

    files.push(abs('test/bootstrap.js'))

    const testFiles = await glob(abs('test/**/*.spec.js'))
    files.push(...testFiles)

    files.forEach(file => {
      mocha.addFile(file)
    })

    runAgain = false

    // see: https://stackoverflow.com/a/29802434/1387519
    runner = mocha.run(() => {
      runner = null
      if (runAgain) {
        run()
      }
    })
  }

  if (watch) {
    const CheapWatch = require('cheap-watch')

    const rerun = () => {
      runAgain = true
      if (runner) {
        runner.abort()
      } else {
        run().catch(err => {
          // eslint-disable-next-line no-console
          console.error(err.stack)
        })
      }
    }

    const watchDirs = [abs('test')]

    if (appPath !== watchDirs[0]) {
      watchDirs.push(appPath)
    }

    await Promise.all(
      watchDirs.map(async dir => {
        const watch = new CheapWatch({ dir })

        await watch.init()

        watch.on('+', rerun)
        watch.on('-', rerun)
      })
    )
  }

  config.set({
    appPath: appPath,
    keepRunning: true,
    detail,
  })

  return run()
}

const resolveAppArg = argv => {
  const args = argv.slice(2)
  const [first] = args
  const isFirstPositional = first && first.substr(0, 1) !== '-'
  if (isFirstPositional) {
    return {
      app: first,
      rest: args.slice(1),
    }
  } else {
    return {
      rest: args,
    }
  }
}

async function runWithCli() {
  const files = await glob(abs('test/**/*.spec.js'))
  const { app, rest } = resolveAppArg(process.argv)
  const argv = [
    abs('test/bootstrap.js'),
    '--reporter',
    'mocha-unfunk-reporter',
    '--recursive',
    '--slow',
    '10',
    '--timeout',
    '3000',
    ...files,
    ...rest,
  ]
  global.testHmrAppPath = makeAbsolute(app || '', process.cwd())
  require('mocha/lib/cli').main(argv)
}

const run = runMethod === 'node' ? runWithNode : runWithCli

run().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err)
})
