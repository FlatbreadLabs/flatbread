import { join } from 'path';

/**
 * Returns the packages manifest for all public packages in the monorepo.
 *
 * @param dirs list of directories to search
 * @returns
 */
export default async function getPackagesManifest(
  dirs: string[]
): Promise<Record<string, any>[]> {
  const pkgManifest = 'package.json';

  const pkgs = await Promise.all(
    dirs.map(async (dir) => ({
      ...(await import(join('../packages', dir, pkgManifest))),
      dirName: dir,
    }))
  );
  console.log(pkgs);
  return pkgs.filter(
    (pkg) => !(pkg.default.private && pkg.default.private === true)
  );
}
