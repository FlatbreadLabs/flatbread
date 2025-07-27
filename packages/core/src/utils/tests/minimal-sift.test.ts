import test from 'ava';

test('import test', async (t) => {
  try {
    const sift = await import('../sift');
    console.log('sift imported:', typeof sift.default);
    t.is(typeof sift.default, 'function');
  } catch (error) {
    console.error('Import error:', error);
    t.fail(error instanceof Error ? error.message : String(error));
  }
});
