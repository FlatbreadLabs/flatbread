import sift from './packages/core/src/utils/sift.js';

const nodes = [{ id: 1, name: 'foo', child: { id: 2, name: 'bar', age: 44 } }];

try {
  console.log('Creating sift function...');
  const siftFn = sift({ name: { eq: 'foo' } });
  console.log('Sift function created successfully');

  console.log('Applying filter...');
  const result = nodes.filter(siftFn);
  console.log('Result:', result);
} catch (error) {
  console.error('Error:', error);
  console.error(
    'Stack:',
    error instanceof Error ? error.stack : 'No stack trace available'
  );
}
