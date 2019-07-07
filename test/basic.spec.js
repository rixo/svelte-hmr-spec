const {
  testHmr,
  init,
  templates,
  change,
  innerText,
} = require('../test-utils/testHmr')

describe('basic HMR', () => {
  testHmr('updates text content (twice)', function*() {
    expect(yield innerText('h1')).to.equal('Hello world!')

    yield change({
      'App.svelte': '<h1>HMRd</h1>',
    })
    expect(yield innerText('h1')).to.equal('HMRd')

    yield change({
      'App.svelte': '<h1>reHMRd</h1>',
    })
    expect(yield innerText('h1')).to.equal('reHMRd')
  })

  testHmr('updates child text when child changes', function*() {
    yield templates({
      'App.svelte': slot => `
        <script>
          import Child from './Child'
        </script>
        ${slot}
      `,
    })

    yield init({
      'App.svelte': '<Child />',
      'Child.svelte': '<h2>I am Child</h2>',
    })
    expect(yield innerText('h2')).to.equal('I am Child')

    yield change({
      'Child.svelte': '<h2>I am Kid</h2>',
    })
    expect(yield innerText('h2')).to.equal('I am Kid')
  })

  testHmr('updates default slot when parent changes', function*() {
    yield templates({
      'App.svelte': slot => `
        <script>
          import Child from './Child'
        </script>
        ${slot}
      `,
    })

    yield init({
      'App.svelte': '<Child />',
      'Child.svelte': '<h2><slot>I am Child</slot></h2>',
    })
    expect(yield innerText('h2')).to.equal('I am Child')

    yield change({
      'App.svelte': '<Child>I am Slot</Child>',
    })
    expect(yield innerText('h2')).to.equal('I am Slot')
  })

  testHmr('updates default slot when child changes', function*() {
    yield templates({
      'Child.svelte': slot => `<h2>${slot}</h2>`,
    })

    yield init({
      'App.svelte': `
        <script>
          import Child from './Child'
        </script>
        <Child>I am Slot</Child>
      `,
      'Child.svelte': '<slot>I am Child</slot>',
    })
    expect(yield innerText('h2')).to.equal('I am Slot')

    yield change({
      'Child.svelte': 'I am Child',
    })
    expect(yield innerText('h2')).to.equal('I am Child')
  })
})
