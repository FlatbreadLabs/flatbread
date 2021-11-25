import colors from 'kleur';
import fs from 'fs';
import { resolve } from 'path';

/**
 * Initialize the Flatbread config file
 */
const initConfig = () => {
  const configFileName = 'flatbread.config.js';
  const configPath = resolve(process.cwd(), configFileName);
  if (fs.existsSync(configPath)) {
    console.log(colors.red(`${configFileName} already exists`));
    process.exit(1);
  } else {
    fs.writeFileSync(
      configPath,
      `import defineConfig from '@flatbread/config';
import transformer from '@flatbread/transformer-markdown';
import filesystem from '@flatbread/source-filesystem';

const transformerConfig = {
  markdown: {
    gfm: true,
    externalLinks: true,
  },
};
export default defineConfig({
  source: filesystem(),
  transformer: transformer(transformerConfig),

  content: [
    {
      path: 'content/markdown/posts',
      typeName: 'Post',
      refs: {
        authors: 'Author',
      },
    },
    {
      path: 'content/markdown/authors',
      typeName: 'Author',
      refs: {
        friend: 'Author',
      },
    },
  ],
});
`
    );
    console.log(
      colors.green(
        `\nGenerated a ${colors.cyan(
          colors.bold(configFileName)
        )} in your project root 🍞\n`
      )
    );
    console.log(
      colors.bold("Don't forget to replace your dev/build scripts with:"),
      colors.dim('\n\n"flatbread start -- <your-current-script-here>"\n')
    );
  }
};

export default initConfig;
