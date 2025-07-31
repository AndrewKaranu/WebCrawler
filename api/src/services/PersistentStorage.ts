import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Base directory for all persistent storage
const BASE_DIR = path.join(process.cwd(), 'data');
export const JOBS_DIR = path.join(BASE_DIR, 'jobs');
export const CORPUS_BASE_DIR = path.join(BASE_DIR, 'corpus');
export const BATCHES_DIR = path.join(BASE_DIR, 'batches');

// Ensure directories exist
export async function initStorage(): Promise<void> {
  await fs.mkdir(BASE_DIR, { recursive: true });
  await fs.mkdir(JOBS_DIR, { recursive: true });
  await fs.mkdir(CORPUS_BASE_DIR, { recursive: true });
  await fs.mkdir(BATCHES_DIR, { recursive: true });
  console.log(`✅ Initialized persistent storage at ${BASE_DIR}`);
}

// Generic save function for any data
export async function saveData<T>(directory: string, id: string, data: T): Promise<void> {
  const filePath = path.join(directory, `${id}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Generic load function for any data
export async function loadData<T>(directory: string, id: string): Promise<T | null> {
  const filePath = path.join(directory, `${id}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (err) {
    // File doesn't exist or is corrupted
    return null;
  }
}

// List all data files in a directory
export async function listDataFiles(directory: string): Promise<string[]> {
  try {
    const files = await fs.readdir(directory);
    return files.filter(file => file.endsWith('.json')).map(file => file.replace('.json', ''));
  } catch (err) {
    return [];
  }
}

// Delete a data file
export async function deleteData(directory: string, id: string): Promise<boolean> {
  const filePath = path.join(directory, `${id}.json`);
  try {
    await fs.unlink(filePath);
    return true;
  } catch (err) {
    return false;
  }
}
