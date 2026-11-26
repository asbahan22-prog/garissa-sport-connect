import path from 'path';
import { fileURLToPath } from 'url';

export const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
