import test from 'ava';
import typeOf from '../typeOf.js';

test(`Nullish types return specific type`, (t) => {
  t.is(typeOf(null), `null`);
  t.is(typeOf({}), `object`);
  t.is(typeOf(), `undefined`);
  t.is(typeOf(``), `string`);
});

test(`Function is not an object`, (t) => {
  t.not(
    typeOf(() => console.log(`I'm a function!`)),
    `object`
  );
});

test(`Date is not an object`, (t) => {
  t.not(typeOf(new Date()), `object`);
});
