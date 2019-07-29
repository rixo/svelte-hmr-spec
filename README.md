# Svelte HMR Spec

Test suite for Svelte 3 HMR.

The whole project is only the tests. And a cool cli to run them on various targets.

## Install

If just for running the tests, install globally:

```bash
npm install --global svelte-hmr-spec

svhs --help
```

If you plan to work on the tests or do something involved with them, clone the repository and install _that_ globally instead:

```bash
git clone git@github.com:rixo/svelte-hmr-spec.git

npm install --global svelte-hmr-spec

svhs --help
```

In order to use the default app that is provided with the project as a test target, you also need to install its dependencies:

```bash
cd svelte-hmr-spec/app
npm install
```
