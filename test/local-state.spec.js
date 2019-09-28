const { clickButton } = require('./helpers')

describe('local state', () => {
  testHmr`
    # preserves local variables state when component changes

    --- App.svelte ---

    <script>
      let x = 0
      const increment = () => { x++ }
    </script>

    <button on:click={increment} />

    <x-focus>
      ::0 before: {x}
      ::1 after: {x}
    </x-focus>

    * * * * *

    ::0::
      before: 0
      ${clickButton()}
      before: 1
    ::1::
      after: 1
  `
})
