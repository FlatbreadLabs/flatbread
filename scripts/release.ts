import { execSync } from 'child_process';

const { version: oldVersion } = await import('../package.json');

execSync('npx bumpp', { stdio: 'inherit' });

const { version } = await import('../package.json');

if (oldVersion === version) {
  console.log('canceled');
  process.exit();
}

// execSync('npm run build', { stdio: 'inherit' });
// execSync('git add .', { stdio: 'inherit' });

// execSync(`git commit -m "chore: release v${version}"`, { stdio: 'inherit' });
// execSync(`git tag -a v${version} -m "v${version}"`, { stdio: 'inherit' });
