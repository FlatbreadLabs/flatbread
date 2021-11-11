import { mdsvex as preprocessor } from 'mdsvex';
import constructConfig from './config/index.js';
const config = await constructConfig();
export const mdsvex = preprocessor(config.mdsvex);
export const mdsvexExtensions = config.mdsvex.extensions;
export default { mdsvex, mdsvexExtensions };
//# sourceMappingURL=mdsvex.js.map
