/**
 * Delay the start of the target process until the GraphQL server is ready.
 * Learned about this thanks to: https://stackoverflow.com/a/48050020/12368615
 */
import { fork, spawn } from 'child_process';

console.log('Init runner.js');

const gql = fork('server/gql-server.js');
let runningScripts = [gql];

gql.on('message', (msg) => {
  if (msg === 'oyu-gql-ready') {
    // Start the target process (e.g. the dev server or the build script)
    const targetProcess = spawn('npm run dev', [], {
      shell: true,
      stdio: 'inherit',
    });
    // targetProcess.stdout.pipe(process.stdout);
    runningScripts.push(targetProcess);

    // Exit the parent process when the target process exits
    for (let script of runningScripts) {
      script.on('close', function (code) {
        console.log('child process exited with code ' + code);
        process.exit();
      });
    }
  }
});

// End any remaining child processes when the parent process exits
process.on('exit', function () {
  console.log('killing', runningScripts.length, 'child processes');
  runningScripts.forEach(function (child) {
    child.kill();
  });
});
