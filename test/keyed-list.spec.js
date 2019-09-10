describe.skip('keyed lists', () => {
  testHmr`
    # preserves position of reordered child items when child updates

    ---- App.svelte ----

    <script>
      import { onMount } from 'svelte'
      import Child from './Child.svelte'
      let items = [
        {id: 1, text: 'foo'},
        {id: 2, text: 'bar'},
        {id: 3, text: 'baz'},
      ]
      onMount(() => {
        items = [
          {id: 3, text: 'baz'},
          {id: 2, text: 'bar'},
          {id: 1, text: 'foo'},
        ]
      })
    </script>

    {#each items as item (item.id)}
      <Child text={item.text} />
    {/each}

    ---- Child.svelte ----

    <script>
      export let text
    </script>

    ::0 <span>{text}</span>
    ::1 <li>{text}</li>

    *****

    ::0 <span>baz</span><span>bar</span><span>foo</span>
    ::1 <li>baz</li><li>bar</li><li>foo</li>
  `
})
