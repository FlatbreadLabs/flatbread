<script context="module">
  export const load = async ({ fetch }) => {
    const query = `
      query Song {
        song {
          firstVerse
        }
      }
		`;

    try {
      const response = await fetch('http://localhost:5057/graphql', {
        body: JSON.stringify({
          query,
        }),
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        method: 'POST',
      });

      const { data, errors } = await response.json();

      if (errors)
        return {
          error: new Error(errors.map(({ message }) => message).join('\\n')),
          status: 500,
        };
      return {
        props: {
          data: data,
        },
      };
    } catch (e) {
      return {
        error: new Error('Failed to load data'),
        status: 500,
      };
    }
  };
</script>

<script>
  export let data = {};
  export let error = null;
  if (data) console.log(data);
  if (error) console.log(error);
</script>

<pre>
  <code>
    {JSON.stringify(data, null, 2)}
  </code>
</pre>
