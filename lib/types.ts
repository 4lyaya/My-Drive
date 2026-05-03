export interface FileItem {
  id: string;
  name: string;
  type: 'file';
  mimeType: string;
  size: number;
  folderId: string | null;
  data: Blob;
  createdAt: Date;
  updatedAt: Date;
}

export interface FolderItem {
  id: string;
  name: string;
  type: 'folder';
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type Item = FileItem | FolderItem;

export interface AppSettings {
  id: string;
  pinCode: string | null;
  darkMode: boolean;
  viewMode: 'grid' | 'list';
  totalStorageUsed: number;
}

export type SortField = 'name' | 'createdAt' | 'size';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}

export function isFile(item: Item): item is FileItem {
  return item.type === 'file';
}

export function isFolder(item: Item): item is FolderItem {
  return item.type === 'folder';
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getMimeTypeCategory(mimeType: string): 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/javascript') return 'text';
  return 'other';
}
