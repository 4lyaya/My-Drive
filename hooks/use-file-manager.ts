'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId, updateSettings } from '@/lib/db';
import type { FileItem, FolderItem, BreadcrumbItem } from '@/lib/types';

export function useFiles(folderId: string | null) {
  return useLiveQuery(
    async () => {
      const allFiles = await db.files.toArray();
      return allFiles.filter(file => {
        if (folderId === null) {
          return file.folderId === null || file.folderId === undefined;
        }
        return file.folderId === folderId;
      });
    },
    [folderId],
    []
  );
}

export function useFolders(parentId: string | null) {
  return useLiveQuery(
    async () => {
      const allFolders = await db.folders.toArray();
      return allFolders.filter(folder => {
        if (parentId === null) {
          return folder.parentId === null || folder.parentId === undefined;
        }
        return folder.parentId === parentId;
      });
    },
    [parentId],
    []
  );
}

export function useAllFiles() {
  return useLiveQuery(() => db.files.toArray(), [], []);
}

export function useAllFolders() {
  return useLiveQuery(() => db.folders.toArray(), [], []);
}

export function useStorageUsed() {
  return useLiveQuery(async () => {
    const files = await db.files.toArray();
    return files.reduce((total, file) => total + file.size, 0);
  }, [], 0);
}

export async function createFolder(name: string, parentId: string | null): Promise<FolderItem> {
  const folder: FolderItem = {
    id: generateId(),
    name,
    type: 'folder',
    parentId: parentId ?? null, // Explicitly ensure null for root
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.folders.add(folder);
  return folder;
}

export async function uploadFile(
  file: File,
  folderId: string | null
): Promise<FileItem> {
  const fileItem: FileItem = {
    id: generateId(),
    name: file.name,
    type: 'file',
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    folderId: folderId ?? null, // Explicitly ensure null for root
    data: file,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.files.add(fileItem);
  await recalculateStorage();
  return fileItem;
}

export async function deleteFile(id: string): Promise<void> {
  await db.files.delete(id);
  await recalculateStorage();
}

export async function deleteFolder(id: string): Promise<void> {
  // Recursively delete all contents
  const subfolders = await db.folders.where('parentId').equals(id).toArray();
  for (const subfolder of subfolders) {
    await deleteFolder(subfolder.id);
  }
  
  // Delete all files in this folder
  await db.files.where('folderId').equals(id).delete();
  
  // Delete the folder itself
  await db.folders.delete(id);
  await recalculateStorage();
}

export async function renameItem(
  id: string,
  newName: string,
  itemType: 'file' | 'folder'
): Promise<void> {
  if (itemType === 'file') {
    await db.files.update(id, { name: newName, updatedAt: new Date() });
  } else {
    await db.folders.update(id, { name: newName, updatedAt: new Date() });
  }
}

export async function moveFile(fileId: string, targetFolderId: string | null): Promise<void> {
  await db.files.update(fileId, { folderId: targetFolderId, updatedAt: new Date() });
}

export async function moveFolder(folderId: string, targetParentId: string | null): Promise<void> {
  // Prevent moving a folder into itself or its descendants
  if (folderId === targetParentId) return;
  
  const isDescendant = await checkIsDescendant(targetParentId, folderId);
  if (isDescendant) return;
  
  await db.folders.update(folderId, { parentId: targetParentId, updatedAt: new Date() });
}

async function checkIsDescendant(childId: string | null, ancestorId: string): Promise<boolean> {
  if (!childId) return false;
  if (childId === ancestorId) return true;
  
  const folder = await db.folders.get(childId);
  if (!folder) return false;
  
  return checkIsDescendant(folder.parentId, ancestorId);
}

export async function copyFile(fileId: string, targetFolderId: string | null): Promise<FileItem> {
  const original = await db.files.get(fileId);
  if (!original) throw new Error('File not found');
  
  const copy: FileItem = {
    ...original,
    id: generateId(),
    name: `Copy of ${original.name}`,
    folderId: targetFolderId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await db.files.add(copy);
  await recalculateStorage();
  return copy;
}

export async function getBreadcrumbs(folderId: string | null): Promise<BreadcrumbItem[]> {
  const breadcrumbs: BreadcrumbItem[] = [{ id: null, name: 'My Files' }];
  
  let currentId = folderId;
  const folderPath: BreadcrumbItem[] = [];
  
  while (currentId) {
    const folder = await db.folders.get(currentId);
    if (!folder) break;
    folderPath.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parentId;
  }
  
  return [...breadcrumbs, ...folderPath];
}

export async function searchFiles(query: string): Promise<FileItem[]> {
  const lowerQuery = query.toLowerCase();
  const files = await db.files.toArray();
  return files.filter(file => file.name.toLowerCase().includes(lowerQuery));
}

export async function searchFolders(query: string): Promise<FolderItem[]> {
  const lowerQuery = query.toLowerCase();
  const folders = await db.folders.toArray();
  return folders.filter(folder => folder.name.toLowerCase().includes(lowerQuery));
}

export async function recalculateStorage(): Promise<number> {
  const files = await db.files.toArray();
  const total = files.reduce((sum, file) => sum + file.size, 0);
  await updateSettings({ totalStorageUsed: total });
  return total;
}

export async function clearAllData(): Promise<void> {
  await db.files.clear();
  await db.folders.clear();
  await updateSettings({ totalStorageUsed: 0 });
}

export async function getFileById(id: string): Promise<FileItem | undefined> {
  return db.files.get(id);
}

export async function getFolderById(id: string): Promise<FolderItem | undefined> {
  return db.folders.get(id);
}
