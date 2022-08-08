import { readdir } from 'fs/promises';
import colors from 'kleur';
import { join } from 'path';
import flatbreadPackage from '../../packages/flatbread/package.json';

export type FlatbreadPackage = typeof flatbreadPackage;

/**
 * The package.json of the flatbread package with a path to the package.
 */
export type PathedFlatbreadPackage = FlatbreadPackage & {
  dirName: string;
};

/**
 * Returns the packages manifest for all public packages in the monorepo.
 *
 * @param dirs list of directories to search
 * @returns
 */
export async function getPackagesManifest(
  dirs: string[]
): Promise<PathedFlatbreadPackage[]> {
  const pkgManifest = 'package.json';

  const pkgs = await Promise.all(
    dirs.map(async (dir) => ({
      ...(await import(join(process.cwd() + '/packages', dir, pkgManifest))),
      dirName: dir,
    }))
  );

  return pkgs.filter(
    (pkg) => !(pkg.default.private && pkg.default.private === true)
  );
}

export async function getMonorepoPublicPackages(): Promise<
  PathedFlatbreadPackage[]
> {
  const dirents = await readdir('packages', { withFileTypes: true });
  const dirs = dirents
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  console.group(colors.bold(colors.green('Found public packages...')));
  console.log(dirs);
  console.groupEnd();

  return getPackagesManifest(dirs);
}
