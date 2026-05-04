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

/**
 * EXPORT: Semua data (folder structure + files) ke ZIP
 */
export async function exportBackup(): Promise<void> {
  const zip = new JSZip();
  
  const folders = await db.folders.toArray();
  const files = await db.files.toArray();
  
  // Create manifest
  const manifest: BackupManifest = {
    version: 2, // Upgrade version to 2
    exportedAt: new Date().toISOString(),
    folders: folders.map(({ type, ...rest }) => rest),
    files: files.map(({ data, type, ...rest }) => rest),
  };
  
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('metadata.txt', `MyDrive Backup\nDate: ${manifest.exportedAt}\nFolders: ${folders.length}\nFiles: ${files.length}\n`);
  
  // Add files to zip with original names (not just ID)
  const filesFolder = zip.folder('files');
  if (filesFolder) {
    for (const file of files) {
      // Preserve original filename with extension
      const fileName = file.name;
      filesFolder.file(fileName, file.data);
    }
  }
  
  const content = await zip.generateAsync({ type: 'blob' });
  const filename = `mydrive-backup-${new Date().toISOString().split('T')[0]}.zip`;
  saveAs(content, filename);
}

/**
 * IMPORT: Menerima ZIP dari berbagai sumber (MyDrive backup atau ZIP biasa)
 */
export async function importBackup(zipFile: File): Promise<{ 
  filesCount: number; 
  foldersCount: number;
  source: 'mydrive' | 'generic';
}> {
  const zip = await JSZip.loadAsync(zipFile);
  
  // Check if this is a MyDrive backup (has manifest.json)
  const manifestFile = zip.file('manifest.json');
  
  if (manifestFile) {
    // SOURCE 1: MyDrive official backup format
    return importMyDriveBackup(zip, manifestFile);
  } else {
    // SOURCE 2: Generic ZIP file (any files/folders)
    return importGenericZip(zip);
  }
}

/**
 * Import dari MyDrive official backup format
 */
async function importMyDriveBackup(
  zip: JSZip, 
  manifestFile: JSZip.JSZipObject
): Promise<{ filesCount: number; foldersCount: number; source: 'mydrive' }> {
  const manifestText = await manifestFile.async('text');
  const manifest: BackupManifest = JSON.parse(manifestText);
  
  if (manifest.version !== 1 && manifest.version !== 2) {
    throw new Error(`Unsupported backup version: ${manifest.version}`);
  }
  
  // Map old IDs to new IDs
  const folderIdMap = new Map<string, string>();
  
  // Import folders (preserving hierarchy)
  const sortedFolders = [...manifest.folders].sort((a, b) => {
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
  let filesImported = 0;
  
  for (const file of manifest.files) {
    const fileContent = filesFolder?.file(file.name); // Use filename, not ID
    if (!fileContent) continue;
    
    const blob = await fileContent.async('blob');
    
    const newFile: FileItem = {
      id: generateId(),
      name: file.name,
      type: 'file',
      mimeType: file.mimeType || blob.type || 'application/octet-stream',
      size: blob.size,
      folderId: file.folderId ? folderIdMap.get(file.folderId) ?? null : null,
      data: blob,
      createdAt: new Date(file.createdAt),
      updatedAt: new Date(file.updatedAt),
    };
    
    await db.files.add(newFile);
    filesImported++;
  }
  
  await recalculateStorage();
  
  return {
    filesCount: filesImported,
    foldersCount: manifest.folders.length,
    source: 'mydrive',
  };
}

/**
 * Import dari generic ZIP file (bukan hasil export MyDrive)
 * Ini solusi untuk "kalo import itu bisa lah masukin data Zip selain dari export"
 */
async function importGenericZip(
  zip: JSZip
): Promise<{ filesCount: number; foldersCount: number; source: 'generic' }> {
  
  // Create a root folder for generic import (to organize)
  const rootFolderId = generateId();
  const rootFolder: FolderItem = {
    id: rootFolderId,
    name: `Imported ${new Date().toLocaleDateString()}`,
    type: 'folder',
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.folders.add(rootFolder);
  
  // Track folders we create
  const folderPathMap = new Map<string, string>();
  folderPathMap.set('', rootFolderId);
  
  let filesImported = 0;
  let foldersCreated = 1; // count root folder
  
  // Get all files from zip (including those in subfolders)
  const zipFiles: { path: string; file: JSZip.JSZipObject }[] = [];
  
  zip.forEach((relativePath, file) => {
    if (!file.dir) {
      zipFiles.push({ path: relativePath, file });
    }
  });
  
  // First, collect all unique folder paths
  const uniqueFolderPaths = new Set<string>();
  for (const { path } of zipFiles) {
    const parts = path.split('/');
    parts.pop(); // remove filename
    let currentPath = '';
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      uniqueFolderPaths.add(currentPath);
    }
  }
  
  // Create folder structure
  const sortedPaths = Array.from(uniqueFolderPaths).sort((a, b) => a.split('/').length - b.split('/').length);
  
  for (const folderPath of sortedPaths) {
    const parts = folderPath.split('/');
    const folderName = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');
    const parentId = folderPathMap.get(parentPath) || rootFolderId;
    
    const newFolderId = generateId();
    const newFolder: FolderItem = {
      id: newFolderId,
      name: folderName,
      type: 'folder',
      parentId: parentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.folders.add(newFolder);
    folderPathMap.set(folderPath, newFolderId);
    foldersCreated++;
  }
  
  // Import files into their respective folders
  for (const { path, file } of zipFiles) {
    const blob = await file.async('blob');
    const parts = path.split('/');
    const fileName = parts.pop() || 'unknown';
    const folderPath = parts.join('/');
    
    let folderId: string | null = folderPathMap.get(folderPath) || rootFolderId;
    
    // Skip hidden files and macOS junk files
    if (fileName.startsWith('._') || fileName === '__MACOSX') continue;
    
    const newFile: FileItem = {
      id: generateId(),
      name: fileName,
      type: 'file',
      mimeType: blob.type || getMimeType(fileName),
      size: blob.size,
      folderId: folderId,
      data: blob,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.files.add(newFile);
    filesImported++;
  }
  
  await recalculateStorage();
  
  return {
    filesCount: filesImported,
    foldersCount: foldersCreated,
    source: 'generic',
  };
}

/**
 * Helper: Guess MIME type from filename
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'txt': 'text/plain',
    'json': 'application/json',
    'js': 'application/javascript',
    'html': 'text/html',
    'css': 'text/css',
    'zip': 'application/zip',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Export selected files as ZIP
 */
export async function exportSelectedAsZip(fileIds: string[]): Promise<void> {
  const zip = new JSZip();
  
  for (const fileId of fileIds) {
    const file = await db.files.get(fileId);
    if (file) {
      zip.file(file.name, file.data);
    }
  }
  
  const content = await zip.generateAsync({ type: 'blob' });
  const filename = `mydrive-files-${new Date().toISOString().split('T')[0]}.zip`;
  saveAs(content, filename);
}

/**
 * Export entire folder as ZIP (including all subfolders and files)
 */
export async function exportFolderAsZip(folderId: string | null): Promise<void> {
  const zip = new JSZip();
  
  async function addFolderToZip(parentId: string | null, currentZipFolder: JSZip, currentPath: string = '') {
    const folders = await db.folders.where('parentId').equals(parentId).toArray();
    const files = await db.files.where('folderId').equals(parentId).toArray();
    
    for (const folder of folders) {
      const subFolder = currentZipFolder.folder(folder.name);
      if (subFolder) {
        await addFolderToZip(folder.id, subFolder, `${currentPath}/${folder.name}`);
      }
    }
    
    for (const file of files) {
      currentZipFolder.file(file.name, file.data);
    }
  }
  
  // Get folder name
  let rootFolderName = 'root';
  if (folderId) {
    const folder = await db.folders.get(folderId);
    if (folder) rootFolderName = folder.name;
  }
  
  await addFolderToZip(folderId, zip);
  
  const content = await zip.generateAsync({ type: 'blob' });
  const filename = `mydrive-folder-${rootFolderName}-${new Date().toISOString().split('T')[0]}.zip`;
  saveAs(content, filename);
  }
