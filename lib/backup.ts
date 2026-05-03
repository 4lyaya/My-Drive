import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { db, generateId } from './db';
import type { FileItem, FolderItem } from './types';
import { recalculateStorage } from '@/hooks/use-file-manager';

interface BackupManifest {
  version: number;
  exportedAt: string;
  folders: Omit<FolderItem, 'type'>[];
  files: Omit<FileItem, 'data' | 'type'>[];
}

export async function exportBackup(): Promise<void> {
  const zip = new JSZip();
  
  const folders = await db.folders.toArray();
  const files = await db.files.toArray();
  
  // Create manifest
  const manifest: BackupManifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    folders: folders.map(({ type, ...rest }) => rest),
    files: files.map(({ data, type, ...rest }) => rest),
  };
  
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  
  // Add files to zip
  const filesFolder = zip.folder('files');
  if (filesFolder) {
    for (const file of files) {
      filesFolder.file(file.id, file.data);
    }
  }
  
  const content = await zip.generateAsync({ type: 'blob' });
  const filename = `file-manager-backup-${new Date().toISOString().split('T')[0]}.zip`;
  saveAs(content, filename);
}

export async function importBackup(zipFile: File): Promise<{ filesCount: number; foldersCount: number }> {
  const zip = await JSZip.loadAsync(zipFile);
  
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    throw new Error('Invalid backup file: missing manifest');
  }
  
  const manifestText = await manifestFile.async('text');
  const manifest: BackupManifest = JSON.parse(manifestText);
  
  if (manifest.version !== 1) {
    throw new Error(`Unsupported backup version: ${manifest.version}`);
  }
  
  // Map old IDs to new IDs
  const folderIdMap = new Map<string, string>();
  const fileIdMap = new Map<string, string>();
  
  // Import folders first (preserving hierarchy)
  const sortedFolders = [...manifest.folders].sort((a, b) => {
    // Root folders first
    if (!a.parentId && b.parentId) return -1;
    if (a.parentId && !b.parentId) return 1;
    return 0;
  });
  
  for (const folder of sortedFolders) {
    const newId = generateId();
    folderIdMap.set(folder.id, newId);
    
    const newFolder: FolderItem = {
      id: newId,
      name: folder.name,
      type: 'folder',
      parentId: folder.parentId ? folderIdMap.get(folder.parentId) ?? null : null,
      createdAt: new Date(folder.createdAt),
      updatedAt: new Date(folder.updatedAt),
    };
    
    await db.folders.add(newFolder);
  }
  
  // Import files
  const filesFolder = zip.folder('files');
  for (const file of manifest.files) {
    const newId = generateId();
    fileIdMap.set(file.id, newId);
    
    const fileContent = filesFolder?.file(file.id);
    if (!fileContent) continue;
    
    const blob = await fileContent.async('blob');
    
    const newFile: FileItem = {
      id: newId,
      name: file.name,
      type: 'file',
      mimeType: file.mimeType,
      size: file.size,
      folderId: file.folderId ? folderIdMap.get(file.folderId) ?? null : null,
      data: blob,
      createdAt: new Date(file.createdAt),
      updatedAt: new Date(file.updatedAt),
    };
    
    await db.files.add(newFile);
  }
  
  await recalculateStorage();
  
  return {
    filesCount: manifest.files.length,
    foldersCount: manifest.folders.length,
  };
}

export async function exportSelectedAsZip(fileIds: string[]): Promise<void> {
  const zip = new JSZip();
  
  for (const fileId of fileIds) {
    const file = await db.files.get(fileId);
    if (file) {
      zip.file(file.name, file.data);
    }
  }
  
  const content = await zip.generateAsync({ type: 'blob' });
  const filename = `files-${new Date().toISOString().split('T')[0]}.zip`;
  saveAs(content, filename);
}
