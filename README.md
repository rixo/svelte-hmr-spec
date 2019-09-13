# Svelte HMR Spec

Test suite for Svelte 3 HMR.

The whole project is only the tests. And a cool cli to run them on various targets.

## Install

```bash
git clone git@github.com:rixo/svelte-hmr-spec.git
cd svelte-hmr-spec
npm install
npm install --global .
cd app
npm install
```

## Usage

Quick start:

~~~bash
svhs --default # run tests on default (bundled) app

svhs --help # learn more
~~~

See inline help for an up to date description of available cli options:

```bash
svhs --help
```

To run the tests on the default app (which should be last versions of svelte-loader, svelte, everything...):

```bash
svhs --default
```

To run the tests on a custom target (for example to test a `svelte-loader` during development):

```bash
svhs ./path-to-your-app --watch
```

### Test Apps

The tests expect a basic svelte + webpack application with HMR enabled. They also expect the app to contain a `src/App.svelte` file, and a `src/main.js` file that bootstraps this App component on the document's body.

This is actually the default structure of the [webpack template app][template-webpack] with some customization to allow for programmatic control of the webpack instance. In particular, the webpack dev server's config must be located in the `webpack.config.js` file (the `contentBase` option specifically).

Look at the provided [default app] for a precise reference of what is expected. My [HMR demo app] should also be kept in sync to be usable as a test target (so you can start from that if you want to create a custom test target app).

[default app]: https://github.com/rixo/svelte-hmr-spec/tree/master/app
[hmr demo app]: https://github.com/rixo/demo-svelte3-hmr
[template-webpack]: https://github.com/sveltejs/template-webpack
