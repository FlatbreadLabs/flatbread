export interface ReferenceAction {
  prerequisites: string;
  firstAction: {
    label: string;
    command: string;
    minutes: 1 | 2;
    success: string;
  };
  nextAction: {
    label: string;
    href: `#${string}`;
    minutes: 1 | 2;
  };
}

/**
 * Package READMEs serve npm, GitHub, and this site. Keep the site-only action
 * framing here so each reference page starts with one bounded task and ends
 * with one next action without adding deployment-specific copy to npm.
 */
export const REFERENCE_ACTIONS: Record<string, ReferenceAction | undefined> = {
  codegen: {
    prerequisites:
      'Node 20.19+ on Node 20, or Node 22.12+, and an existing pnpm project.',
    firstAction: {
      label: 'Install Flatbread with codegen',
      command: 'pnpm add flatbread',
      minutes: 2,
      success:
        'The install finishes without errors and package.json lists flatbread.',
    },
    nextAction: {
      label: 'Copy the codegen config block',
      href: '#basic-usage',
      minutes: 2,
    },
  },
  config: {
    prerequisites: 'Node 20.19+ and an existing pnpm project.',
    firstAction: {
      label: 'Install the config helper',
      command: 'pnpm i @flatbread/config',
      minutes: 2,
      success:
        'The install finishes without errors and package.json lists @flatbread/config.',
    },
    nextAction: {
      label: 'Wrap your existing config with defineConfig',
      href: '#typical-usage',
      minutes: 2,
    },
  },
  core: {
    prerequisites:
      'Node 20.19+ and a custom GraphQL server or low-level integration. Most apps should install flatbread instead.',
    firstAction: {
      label: 'Install the low-level core package',
      command: 'pnpm i @flatbread/core@latest',
      minutes: 2,
      success:
        'The install finishes without errors and package.json lists @flatbread/core.',
    },
    nextAction: {
      label: 'Choose the matching snapshot-export import',
      href: '#snapshot-exports',
      minutes: 1,
    },
  },
  explorer: {
    prerequisites:
      'An installed Flatbread project whose config uses proofContent(), plus prebuilt explorer assets.',
    firstAction: {
      label: 'Open the local explorer',
      command: 'npx flatbread start --watch --open',
      minutes: 2,
      success:
        'The browser opens http://localhost:5057/ and shows the explorer.',
    },
    nextAction: {
      label: 'Copy the local explorer command',
      href: '#try-it-locally',
      minutes: 1,
    },
  },
  flatbread: {
    prerequisites:
      'Node 20.19+ on Node 20, or Node 22.12+, plus Git and pnpm 10.33.x.',
    firstAction: {
      label: 'Check the Node version',
      command: 'node --version',
      minutes: 1,
      success: 'The terminal prints v20.19–v20.x, or v22.12 or newer.',
    },
    nextAction: {
      label: 'Open “Start the bundled example”',
      href: '#start-the-bundled-example',
      minutes: 1,
    },
  },
  proof: {
    prerequisites:
      'Run at the project root with the flatbread CLI installed. An invalid Flatbread config stops the check.',
    firstAction: {
      label: 'Check Proof setup',
      command: 'pnpm exec flatbread proof bootstrap',
      minutes: 1,
      success:
        'The terminal prints ready or action_required, plus a recipe for each missing item.',
    },
    nextAction: {
      label: 'Open “Install the Proof skill”',
      href: '#install-the-proof-skill',
      minutes: 1,
    },
  },
  'resolver-svimg': {
    prerequisites:
      'An existing pnpm Flatbread project using Node 20.19+, with svimg 2 or 3 installed as a peer dependency.',
    firstAction: {
      label: 'Install the image resolver',
      command: 'pnpm i @flatbread/resolver-svimg',
      minutes: 2,
      success:
        'The install finishes without errors and package.json lists @flatbread/resolver-svimg.',
    },
    nextAction: {
      label: 'Open “Configure an image field”',
      href: '#configure-an-image-field',
      minutes: 1,
    },
  },
  'source-filesystem': {
    prerequisites:
      'An existing Flatbread project with a transformer for the file types you want to load.',
    firstAction: {
      label: 'Install the filesystem source',
      command: 'pnpm i @flatbread/source-filesystem',
      minutes: 2,
      success:
        'The install finishes without errors and package.json lists @flatbread/source-filesystem.',
    },
    nextAction: {
      label: 'Copy the filesystem source config',
      href: '#usage',
      minutes: 2,
    },
  },
  'transformer-markdown': {
    prerequisites:
      'An existing Flatbread project with a compatible source such as @flatbread/source-filesystem.',
    firstAction: {
      label: 'Install the Markdown transformer',
      command: 'pnpm i @flatbread/transformer-markdown',
      minutes: 2,
      success:
        'The install finishes without errors and package.json lists @flatbread/transformer-markdown.',
    },
    nextAction: {
      label: 'Copy the Markdown transformer config',
      href: '#usage',
      minutes: 2,
    },
  },
  'transformer-yaml': {
    prerequisites:
      'An existing Flatbread project with a compatible source such as @flatbread/source-filesystem.',
    firstAction: {
      label: 'Install the YAML transformer',
      command: 'pnpm i @flatbread/transformer-yaml',
      minutes: 2,
      success:
        'The install finishes without errors and package.json lists @flatbread/transformer-yaml.',
    },
    nextAction: {
      label: 'Copy the YAML transformer config',
      href: '#usage',
      minutes: 2,
    },
  },
  utils: {
    prerequisites: 'Node 20.19+ and an existing pnpm project.',
    firstAction: {
      label: 'Install the shared utilities',
      command: 'pnpm add @flatbread/utils',
      minutes: 1,
      success:
        'The install finishes without errors and package.json lists @flatbread/utils.',
    },
    nextAction: {
      label: 'Copy the package-manager detection example',
      href: '#package-manager-detection',
      minutes: 2,
    },
  },
};

export function getReferenceAction(id: string): ReferenceAction {
  const action = REFERENCE_ACTIONS[id];
  if (action) return action;

  throw new Error(
    `Package reference \`${id}\` has no action contract. Add it to REFERENCE_ACTIONS before publishing the page.`
  );
}
