<script context="module">
  export const load = async ({ fetch }) => {
    const query = `
			query Doubled($x: Int) {
				double(number: $x)
			}
		`;
    const variables = {
      x: 10,
    };
    const response = await fetch('/graphql', {
      body: JSON.stringify({ query, variables }),
      headers: {
        Authorization: 'Token ABC123',
        'Content-Type': 'application/json',
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
        doubled: data.double,
      },
    };
  };
</script>

<script>
  export let doubled = 2;
</script>

{doubled}
