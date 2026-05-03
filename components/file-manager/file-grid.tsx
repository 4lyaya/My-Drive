'use client';

import { useState, useEffect } from 'react';
import {
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  Folder,
  MoreVertical,
  Download,
  Trash2,
  Edit2,
  Copy,
  Move,
  Eye,
  CheckSquare,
  Square,
} from 'lucide-react';
import type { FileItem, FolderItem, Item, SortConfig } from '@/lib/types';
import { formatFileSize, formatDate, getMimeTypeCategory, isFile } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FileGridProps {
  files: FileItem[];
  folders: FolderItem[];
  viewMode: 'grid' | 'list';
  sortConfig: SortConfig;
  selectedItems: Set<string>;
  isLoading?: boolean;
  onFolderOpen: (folderId: string) => void;
  onFilePreview: (file: FileItem) => void;
  onRename: (item: Item) => void;
  onDelete: (item: Item) => void;
  onMove: (item: Item) => void;
  onCopy: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onSelectionChange: (selected: Set<string>) => void;
}

function getFileIcon(mimeType: string) {
  const category = getMimeTypeCategory(mimeType);
  switch (category) {
    case 'image':
      return <FileImage className="h-8 w-8 text-emerald-400" />;
    case 'video':
      return <FileVideo className="h-8 w-8 text-purple-400" />;
    case 'audio':
      return <FileAudio className="h-8 w-8 text-pink-400" />;
    case 'pdf':
      return <FileText className="h-8 w-8 text-red-400" />;
    case 'text':
      return <FileText className="h-8 w-8 text-blue-400" />;
    default:
      return <File className="h-8 w-8 text-muted-foreground" />;
  }
}

function sortItems(items: Item[], sortConfig: SortConfig): Item[] {
  return [...items].sort((a, b) => {
    let comparison = 0;
    
    // Folders always come first
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    
    switch (sortConfig.field) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'size':
        const sizeA = isFile(a) ? a.size : 0;
        const sizeB = isFile(b) ? b.size : 0;
        comparison = sizeA - sizeB;
        break;
    }
    
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });
}

export function FileGrid({
  files,
  folders,
  viewMode,
  sortConfig,
  selectedItems,
  isLoading = false,
  onFolderOpen,
  onFilePreview,
  onRename,
  onDelete,
  onMove,
  onCopy,
  onDownload,
  onSelectionChange,
}: FileGridProps) {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  
  const items = sortItems([...folders, ...files], sortConfig);

  // Generate thumbnails for images
  useEffect(() => {
    const newThumbnails: Record<string, string> = {};
    
    files.forEach(file => {
      if (getMimeTypeCategory(file.mimeType) === 'image') {
        const url = URL.createObjectURL(file.data);
        newThumbnails[file.id] = url;
      }
    });
    
    setThumbnails(newThumbnails);
    
    return () => {
      Object.values(newThumbnails).forEach(URL.revokeObjectURL);
    };
  }, [files]);

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    onSelectionChange(newSelection);
  };

  const handleItemClick = (item: Item, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      toggleSelection(item.id, e);
      return;
    }
    
    if (item.type === 'folder') {
      onFolderOpen(item.id);
    } else {
      onFilePreview(item);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm">Loading files...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] min-h-[300px] text-muted-foreground">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
          <Folder className="h-10 w-10 opacity-50" />
        </div>
        <p className="text-xl font-medium text-foreground mb-2">No files in this folder</p>
        <p className="text-sm text-center max-w-xs">
          Use the sidebar to upload files or create new folders to organize your content
        </p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="p-3 w-10"></th>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium hidden sm:table-cell">Size</th>
              <th className="p-3 font-medium hidden md:table-cell">Modified</th>
              <th className="p-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr
                key={item.id}
                onClick={e => handleItemClick(item, e)}
                className={cn(
                  'border-b border-border/50 hover:bg-accent/50 cursor-pointer transition-colors',
                  selectedItems.has(item.id) && 'bg-accent'
                )}
              >
                <td className="p-3">
                  <button
                    onClick={e => toggleSelection(item.id, e)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {selectedItems.has(item.id) ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {item.type === 'folder' ? (
                      <Folder className="h-5 w-5 text-primary shrink-0" />
                    ) : (
                      <span className="shrink-0 scale-75 origin-left">
                        {getFileIcon(item.mimeType)}
                      </span>
                    )}
                    <span className="truncate max-w-[200px] md:max-w-[300px]">{item.name}</span>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground hidden sm:table-cell">
                  {isFile(item) ? formatFileSize(item.size) : '--'}
                </td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">
                  {formatDate(new Date(item.updatedAt))}
                </td>
                <td className="p-3">
                  <ItemContextMenu
                    item={item}
                    onRename={onRename}
                    onDelete={onDelete}
                    onMove={onMove}
                    onCopy={onCopy}
                    onDownload={onDownload}
                    onPreview={onFilePreview}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {items.map(item => (
        <div
          key={item.id}
          onClick={e => handleItemClick(item, e)}
          className={cn(
            'group relative flex flex-col items-center p-4 rounded-lg border border-border/50 hover:border-border hover:bg-accent/50 cursor-pointer transition-all',
            selectedItems.has(item.id) && 'border-primary bg-accent'
          )}
        >
          <button
            onClick={e => toggleSelection(item.id, e)}
            className={cn(
              'absolute top-2 left-2 text-muted-foreground hover:text-foreground transition-opacity',
              selectedItems.has(item.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            {selectedItems.has(item.id) ? (
              <CheckSquare className="h-4 w-4 text-primary" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
          
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ItemContextMenu
              item={item}
              onRename={onRename}
              onDelete={onDelete}
              onMove={onMove}
              onCopy={onCopy}
              onDownload={onDownload}
              onPreview={onFilePreview}
            />
          </div>

          <div className="w-16 h-16 flex items-center justify-center mb-2">
            {item.type === 'folder' ? (
              <Folder className="h-12 w-12 text-primary" />
            ) : thumbnails[item.id] ? (
              <img
                src={thumbnails[item.id]}
                alt={item.name}
                className="w-full h-full object-cover rounded"
              />
            ) : (
              getFileIcon(item.mimeType)
            )}
          </div>

          <span className="text-sm text-center truncate w-full" title={item.name}>
            {item.name}
          </span>
          
          {isFile(item) && (
            <span className="text-xs text-muted-foreground mt-1">
              {formatFileSize(item.size)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

interface ItemContextMenuProps {
  item: Item;
  onRename: (item: Item) => void;
  onDelete: (item: Item) => void;
  onMove: (item: Item) => void;
  onCopy: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onPreview: (file: FileItem) => void;
}

function ItemContextMenu({
  item,
  onRename,
  onDelete,
  onMove,
  onCopy,
  onDownload,
  onPreview,
}: ItemContextMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          className="p-1 rounded hover:bg-accent transition-colors"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isFile(item) && (
          <>
            <DropdownMenuItem onClick={() => onPreview(item)}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload(item)}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => onRename(item)}>
          <Edit2 className="h-4 w-4 mr-2" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMove(item)}>
          <Move className="h-4 w-4 mr-2" />
          Move
        </DropdownMenuItem>
        {isFile(item) && (
          <DropdownMenuItem onClick={() => onCopy(item)}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(item)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
