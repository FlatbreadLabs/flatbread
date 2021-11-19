console.log('Placeholder for the build process');
let result = [2];

for (var i = 0; i < 10000; i++) {
  result.push(Math.random() / 13.24354234);
  for (var x = 0; x < 3; x++) {
    result.map((x) => x * Math.random());
  }
}
console.log('Build finished!');

console.log(result);
