const { testHmr } = require('test-hmr')
const { clickButton } = require('./helpers')

describe('props', () => {
  testHmr`
    # preserves props value

    --- App.svelte ---

    <script>
      import Child from './Child.svelte'
    </script>

    <Child name="foo" />
    <Child name="bar" />

    --- Child.svelte ---

    <script>
      export let name = 'Child'
    </script>

    ::0 I am {name}
    ::1 My name is {name}

    * * *

    ::0::
      I am foo
      I am bar
    ::1::
      My name is foo
      My name is bar
  `

  testHmr`
    # doesn't trigger a warning when props are removed between updates

    --- App.svelte ---

    <script>
      import Child from './Child.svelte'
    </script>

    <Child name="foo" />

    --- Child.svelte ---

    <script>
      export let name
      ::0 export let surname = 'bar'
      ::1 // export let surname = 'bar'
    </script>

    ::0 I am {name} "{surname}"
    ::1 I am {name}

    * * *

    ::0 I am foo "bar"
    ::1 I am foo
  `

  testHmr`
    # restores value of aliased props (export {... as ...})

    --- App.svelte ---

    <script>
      import Child from './Child.svelte'
      let firstName = 'foo'
      const click = () => {
        firstName += firstName
      }
    </script>

    <button on:click={click} />
    <Child {firstName} />

    --- Child.svelte ---

    <!-- @hmr:keep-all -->

    <script>
      ::0::
        let name
        let surname = 'bar'
        export { name as firstName, surname as lastName }
      ::1::
        let name
        export { name as firstName }
      ::::
    </script>

    <x-focus>
      ::0 I am {name} "{surname}"
      ::1 I am {name}
    </x-focus>

    * * * * *

    ::0::
       I am foo "bar"
       ${clickButton()}
       I am foofoo "bar"
    ::1::
       I am foofoo
  `
})
