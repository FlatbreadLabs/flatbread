import { getConfig } from '../utils/getSchema';
import { startGraphqlServer } from './liveServer';

const config = await getConfig();
const running = await startGraphqlServer({
  config,
  port: Number(process.env.FLATBREAD_PORT) || 5050,
  watch: process.env.FLATBREAD_WATCH === '1',
});

communicateReadiness();

process.once('SIGINT', () => void running.close());
process.once('SIGTERM', () => void running.close());

function communicateReadiness() {
  process.send && process.send('flatbread-gql-ready');
}
