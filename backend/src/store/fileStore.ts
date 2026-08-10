// Persistance simple sur fichier JSON (remplaçable par une vraie base).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { StateSnapshot } from '../types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'state.json');

export async function readState(): Promise<StateSnapshot | null> {
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    return JSON.parse(raw) as StateSnapshot;
  } catch {
    return null;
  }
}

export async function writeState(state: StateSnapshot): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(state, null, 2), 'utf8');
}
