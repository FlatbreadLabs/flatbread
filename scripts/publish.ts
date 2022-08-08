import { execSync } from 'child_process';
import path from 'path';
import colors from 'kleur';
import { getMonorepoPublicPackages } from './utils/packageManifest';
// import { version } from '../package.json';

execSync('pnpm run build', { stdio: 'inherit' });

// Start building the npm registry publish command
let command = 'pnpm publish --access public';

// Get the list of public packages in the monorepo
const packages = await getMonorepoPublicPackages();

//
// For each package, release it.
// This will publish the package to the npm registry if the version has changed; otherwise it will error and move on.
//
for (const { dirName, name, version } of packages) {
  try {
    // Disabled for now as we are just publishing alpha/beta as the latest version before v1.0.0
    // if ((version as string | undefined)?.includes('alpha')) {
    //   command += ' --tag alpha';
    // } else if ((version as string | undefined)?.includes('beta')) {
    //   command += ' --tag beta';
    // }

    execSync(command, {
      stdio: 'inherit',
      cwd: path.resolve(path.join('packages', dirName)),
    });
  } catch (_) {
    console.log(colors.red(`${name} ${version} failed to publish`));
  }
  console.log(colors.bold().green(`Published ${name} v${version}`));
}
