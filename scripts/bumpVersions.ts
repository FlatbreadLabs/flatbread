import { execSync } from 'child_process';
import inquirer from 'inquirer';
import colors from 'kleur';
import path from 'node:path';
import {
  getMonorepoPublicPackages,
  PathedFlatbreadPackage,
} from './utils/packageManifest';

// Get the list of public packages in the monorepo
const packages = await getMonorepoPublicPackages();

const { selectedPackages }: Record<string, PathedFlatbreadPackage[]> =
  await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedPackages',
      message: 'Which packages do you want to bump?',
      choices: packages.map((pkg) => ({
        name: `${pkg.name}`,
        value: pkg,
      })),
    },
  ]);

selectedPackages.forEach((selectedPackage) => {
  console.log(colors.bold(colors.yellow(`Bumping ${selectedPackage.name}`)));
  execSync('pnpm bumpp --no-commit --no-push --no-tag', {
    stdio: 'inherit',
    cwd: path.resolve(path.join('packages', selectedPackage.dirName)),
  });
});
