#!/usr/bin/env node

const path = require('path')

const Mocha = require('mocha')
const glob = require('fast-glob')

const { config } = require('test-hmr')

// 'node' or 'cli'
const runMethod = 'node'

const defaultOptions = {
  detail: 0,
  defaultApp: false,
  selfTest: false,
  selfTestOnly: false,
  watch: false,
  watchDirs: [],
  watchExtensions: ['.js', '.svelte'],
  watchNodeModules: false,
  watchSelf: false,
  watchLoader: false,
  // open puppeteer's browser for visual inspection
  open: false,
  keepOpen: false,
  break: false,
  // console: log browser's console output to terminal
  console: false,
  logWebpack: false,
}

const makeAbsolute = (name, basePath) =>
  path.isAbsolute(name) ? name : path.join(basePath, name)

const abs = name => path.join(__dirname, name)

const resolveAppPath = (arg, cwd, noDefault) => {
  if (!arg) {
    return noDefault ? null : cwd
  }
  if (path.isAbsolute(arg)) {
    return arg
  }
  return makeAbsolute(arg, cwd)
}

const helpDescription = `
If no <app> is provided, then the current directory will be used.

The --watch option will adapt to the current test target. When the target is an
app, both the app and tests directories will be placed under watch. When the
target is --self, then only the test utils directory will be watched.

If an <app> is provided with the --self option, then self e2e tests will also be
run (but HMR tests still won't be run).

Debug the tests:
  node --inspect-brk $(which svhs) [options] <app>
`

const helpMessage = ({ full = true }) => `
Usage: svhs [options] <app>

Options:
  --watch       Wath app and tests dirs, and rerun tests on change
  --open        Open puppeteer's browser for debug (with some slowmo)
  --keep        Keep the serves running after test run (useful for inspection)
  --console     Display browser's console messages in the terminal
  --webpack     Display webpack's output in the terminal
  --default     Use default app in the svelte-hmr-spec project
  --min         Display one mocha test (it) result per testHmr test (default)
  --detail      Display one test (it) result per HMR update
  --steps       Display one test (it) result per HMR update sub step
  --self        Runs test utils self tests instead of HMR tests
  --sanity      Runs test utils self tests in addition to app tests
  --watch-self  Watch test utils directory (even if not running self tests)
  --user-dir    Used for Puppeteer userDataDir
  --help, -h    Display ${full ? 'this' : 'full'} help message
${full ? helpDescription : ''}`

const parseArgs = (argv, defaultOptions) => {
  const options = {
    watch: false,
    watchDirs: [],
    ...defaultOptions,
    set 'watchDirs.push'(value) {
      options.watchDirs.push(value)
    },
  }

  let help = false
  let setKey = null
  let maybeSetKey = null
  const positionals = argv.slice(2).filter(arg => {
    if (setKey) {
      options[setKey] = arg
      setKey = maybeSetKey = null
    } else if (arg === '--help' || arg === '-h') {
      help = true
    } else if (arg === '--default') {
      options.defaultApp = true
    } else if (arg === '--watch') {
      options.watch = true
    } else if (arg === '--open') {
      options.open = true
    } else if (arg === '--keep') {
      options.keepOpen = true
    } else if (arg === '--break') {
      options.break = true
    } else if (arg === '--console') {
      options.console = true
    } else if (arg === '--webpack') {
      options.logWebpack = true
    } else if (arg === '--watch-dir' || arg === '-w') {
      options.watch = true
      maybeSetKey = 'watchDirs.push'
    } else if (arg === '--watch-self') {
      options.watch = true
      options.watchSelf = true
    } else if (arg === '--watch-loader') {
      options.watch = true
      options.watchLoader = true
    } else if (arg === '--sanity') {
      options.selfTest = true
      options.watchSelf = true
    } else if (arg === '--self') {
      options.selfTest = true
      options.watchSelf = true
      options.selfTestOnly = true
    } else if (arg === '--steps') {
      options.detail = Math.max(options.detail || 0, 2)
    } else if (arg === '--detail' || arg === '-d') {
      // setKey = 'detail'
      options.detail = Math.max(options.detail || 0, 1)
    } else if (arg === '--min') {
      options.detail = Math.min(options.detail || 0, 0)
    } else if (arg === '--user-data-dir') {
      setKey = 'userDataDir'
    } else if (maybeSetKey) {
      options[maybeSetKey] = arg
      maybeSetKey = null
    } else {
      return true
    }
  })

  let error = false

  if (positionals.length > 0) {
    options.app = positionals.shift()
    if (options.defaultApp) {
      error = 'Only one of --default or <app> is allowed'
    } else if (positionals.length > 0) {
      error = 'Only one <app> path can be provided'
    }
  } else if (options.defaultApp) {
    options.app = path.join(__dirname, 'app')
  }

  if (help || error) {
    // eslint-disable-next-line no-console
    console.log(helpMessage({ full: help }))
    if (typeof error === 'string') {
      // eslint-disable-next-line no-console
      console.log('ERROR:', error, '\n')
    }
    process.exit(error ? 255 : 0)
  }

  if (options.open && options.watch) {
    // eslint-disable-next-line no-console
    console.warn(
      "Don't use --watch with --open option, it's a mess. Watch will be ignored."
    )
    options.watch = false
  }

  return options
}

const createWatchFilter = ({ watchExtensions, watchNodeModules }) => ({
  path: name,
  stats,
}) => {
  const excludeDirRegex = watchNodeModules
    ? /(?:^|\/)(?:\.git)(?:\/|$)/
    : /(?:^|\/)(?:node_modules|\.git)(?:\/|$)/
  // case: directory
  if (stats.isDirectory()) {
    return !excludeDirRegex.test(name)
  }
  // case: file
  const ext = path.extname(name)
  return watchExtensions.includes(ext)
}

// Run mocha programmatically:
//   https://github.com/mochajs/mocha/wiki/Using-mocha-programmatically
const runWithNode = async () => {
  let mocha
  let files
  let runAgain
  let runner

  const options = parseArgs(process.argv, defaultOptions)

  const {
    watch,
    watchSelf,
    watchLoader,
    app: appArg,
    detail,
    selfTest,
    selfTestOnly,
    open,
    keepOpen,
    break: breakAfter,
    userDataDir,
    logWebpack,
  } = options

  // don't use default appPath with self only: if app path is provided, e2e
  // self tests will be run, else marked as pending
  const appPath = await resolveAppPath(appArg, process.cwd(), selfTestOnly)

  const run = async () => {
    if (mocha) {
      mocha.unloadFiles()
    }

    files = []

    mocha = new Mocha({
      reporter: 'mocha-unfunk-reporter',
      timeout: open ? Infinity : 5000,
      slow: 1500,
    })

    files.push(abs('test/bootstrap.js'))

    if (selfTest) {
      const testHmrIndex = require.resolve('test-hmr')
      const testHmrDir = path.dirname(testHmrIndex)
      const selfTestDir = path.join(testHmrDir, 'test')
      const selfTestFiles = await glob(`${selfTestDir}/**/*.spec.js`)
      files.push(...selfTestFiles)
    }

    if (!selfTestOnly) {
      const testFiles = await glob(abs('test/**/*.spec.js'))
      files.push(...testFiles)
    }

    files.forEach(file => {
      mocha.addFile(file)
    })

    runAgain = false

    // see: https://stackoverflow.com/a/29802434/1387519
    runner = mocha.run(() => {
      runner = null
      if (runAgain) {
        run().catch(err => {
          // eslint-disable-next-line no-console
          console.error(err.stack)
        })
      }
    })
  }

  if (watch) {
    const CheapWatch = require('cheap-watch')

    const apply = () => {
      const files = getWatchedFiles()
      files.forEach(Mocha.unloadFile)
      if (runner) {
        runner.abort()
      } else {
        run().catch(err => {
          // eslint-disable-next-line no-console
          console.error(err.stack)
        })
      }
    }

    let applyTimeout = null

    const schedule = () => {
      clearTimeout(applyTimeout)
      applyTimeout = setTimeout(apply, 20)
    }

    const rerun = () => {
      runAgain = true
      schedule()
    }

    const watchDirs = new Set()

    if (watchSelf) {
      let selfDir = path.dirname(require.resolve('test-hmr'))
      selfDir = path.resolve(selfDir)
      watchDirs.add(selfDir)
    }

    if (watchLoader) {
      const loaderPath = path.resolve(`${appPath}/node_modules/svelte-loader`)
      watchDirs.add(loaderPath)
      const devHelperPath = path.resolve(
        `${appPath}/node_modules/svelte-dev-helper`
      )
      watchDirs.add(devHelperPath)
    }

    if (!selfTestOnly) {
      watchDirs.add(abs('test'))
      if (appPath) {
        watchDirs.add(appPath)
      }
    }

    if (options.watchDirs) {
      options.watchDirs.forEach(dir => watchDirs.add(dir))
    }

    const getWatchedFiles = () => {
      const files = new Set()
      for (const watch of watches) {
        const { dir } = watch
        for (const [name, stat] of watch.paths) {
          if (stat.isFile()) {
            files.add(path.resolve(path.join(dir, name)))
          }
        }
      }
      return [...files]
    }

    const filter = createWatchFilter(options)

    const watches = await Promise.all(
      [...watchDirs].map(async dir => {
        // eslint-disable-next-line no-console
        console.info('Watching dir', dir)

        const watch = new CheapWatch({
          dir,
          filter,
        })

        await watch.init()

        watch.on('+', rerun)
        watch.on('-', rerun)

        return watch
      })
    )
  }

  config.set({
    appPath: appPath,
    e2e: appPath ? true : 'skip',
    keepRunning: !!watch,
    detail,
    open,
    keepOpen,
    break: breakAfter,
    console: options.console,
    logWebpack,
    userDataDir,
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

// TODO this is more & more legacy... it should be ready to leave us soon
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
