import { loadSecrets } from 'app/config/secrets.js';
import 'dotenv/config';

await loadSecrets();

await import('app/workers.js');
