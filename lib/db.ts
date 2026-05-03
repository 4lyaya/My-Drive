import Dexie, { type Table } from 'dexie';
import type { FileItem, FolderItem, AppSettings } from './types';

export class FileManagerDB extends Dexie {
  files!: Table<FileItem>;
  folders!: Table<FolderItem>;
  settings!: Table<AppSettings>;

  constructor() {
    super('fileManagerDB');
    this.version(1).stores({
      files: 'id, name, folderId, mimeType, size, createdAt, updatedAt',
      folders: 'id, name, parentId, createdAt, updatedAt',
      settings: 'id',
    });
  }
}

export const db = new FileManagerDB();

export async function initializeSettings(): Promise<AppSettings> {
  const existing = await db.settings.get('app-settings');
  if (existing) return existing;

  const defaultSettings: AppSettings = {
    id: 'app-settings',
    pinCode: null,
    darkMode: true,
    viewMode: 'grid',
    totalStorageUsed: 0,
  };

  await db.settings.add(defaultSettings);
  return defaultSettings;
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<void> {
  await db.settings.update('app-settings', updates);
}

export async function getSettings(): Promise<AppSettings | undefined> {
  return db.settings.get('app-settings');
}

export function generateId(): string {
  return crypto.randomUUID();
}
