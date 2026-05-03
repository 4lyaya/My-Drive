'use client';

import { useState, useEffect } from 'react';
import { X, Folder, AlertTriangle } from 'lucide-react';
import { useAllFolders } from '@/hooks/use-file-manager';
import type { FolderItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DialogBaseProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function DialogBase({ isOpen, title, onClose, children }: DialogBaseProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-card border border-border rounded-lg shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// New Folder Dialog
interface NewFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export function NewFolderDialog({ isOpen, onClose, onSubmit }: NewFolderDialogProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen) setName('');
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
      onClose();
    }
  };

  return (
    <DialogBase isOpen={isOpen} title="New Folder" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="p-4">
          <label className="block text-sm font-medium mb-2">Folder name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter folder name"
            autoFocus
            className="w-full px-3 py-2 text-sm bg-muted rounded-lg border border-transparent focus:border-ring focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border bg-muted/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </form>
    </DialogBase>
  );
}

// Rename Dialog
interface RenameDialogProps {
  isOpen: boolean;
  currentName: string;
  onClose: () => void;
  onSubmit: (newName: string) => void;
}

export function RenameDialog({ isOpen, currentName, onClose, onSubmit }: RenameDialogProps) {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (isOpen) setName(currentName);
  }, [isOpen, currentName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && name.trim() !== currentName) {
      onSubmit(name.trim());
    }
    onClose();
  };

  return (
    <DialogBase isOpen={isOpen} title="Rename" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="p-4">
          <label className="block text-sm font-medium mb-2">New name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            className="w-full px-3 py-2 text-sm bg-muted rounded-lg border border-transparent focus:border-ring focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border bg-muted/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Rename
          </button>
        </div>
      </form>
    </DialogBase>
  );
}

// Delete Confirmation Dialog
interface DeleteDialogProps {
  isOpen: boolean;
  itemName: string;
  itemType: 'file' | 'folder';
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteDialog({ isOpen, itemName, itemType, onClose, onConfirm }: DeleteDialogProps) {
  return (
    <DialogBase isOpen={isOpen} title="Delete Item" onClose={onClose}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
          <div>
            <p className="text-sm">
              Are you sure you want to delete <strong>{itemName}</strong>?
            </p>
            {itemType === 'folder' && (
              <p className="text-sm text-muted-foreground mt-1">
                This will also delete all files and folders inside it.
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              This action cannot be undone.
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 p-4 border-t border-border bg-muted/50">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="px-4 py-2 text-sm rounded-lg bg-destructive text-white hover:bg-destructive/90 transition-colors"
        >
          Delete
        </button>
      </div>
    </DialogBase>
  );
}

// Move/Copy Dialog
interface MoveDialogProps {
  isOpen: boolean;
  itemName: string;
  currentFolderId: string | null;
  excludeFolderId?: string;
  onClose: () => void;
  onSubmit: (targetFolderId: string | null) => void;
}

export function MoveDialog({
  isOpen,
  itemName,
  currentFolderId,
  excludeFolderId,
  onClose,
  onSubmit,
}: MoveDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const allFolders = useAllFolders();

  useEffect(() => {
    if (isOpen) setSelectedFolderId(null);
  }, [isOpen]);

  const filteredFolders = allFolders.filter(f => f.id !== excludeFolderId);

  return (
    <DialogBase isOpen={isOpen} title={`Move "${itemName}"`} onClose={onClose}>
      <div className="p-4">
        <p className="text-sm text-muted-foreground mb-3">Select destination folder:</p>
        <div className="max-h-60 overflow-auto border border-border rounded-lg">
          <button
            onClick={() => setSelectedFolderId(null)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors',
              selectedFolderId === null && 'bg-accent'
            )}
          >
            <Folder className="h-4 w-4 text-blue-400" />
            <span>Root (My Files)</span>
          </button>
          {filteredFolders.map(folder => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              disabled={folder.id === currentFolderId}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                selectedFolderId === folder.id && 'bg-accent'
              )}
            >
              <Folder className="h-4 w-4 text-blue-400" />
              <span className="truncate">{folder.name}</span>
              {folder.id === currentFolderId && (
                <span className="text-xs text-muted-foreground">(current)</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 p-4 border-t border-border bg-muted/50">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onSubmit(selectedFolderId);
            onClose();
          }}
          className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Move Here
        </button>
      </div>
    </DialogBase>
  );
}

// Clear Data Confirmation
interface ClearDataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ClearDataDialog({ isOpen, onClose, onConfirm }: ClearDataDialogProps) {
  return (
    <DialogBase isOpen={isOpen} title="Clear All Data" onClose={onClose}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
          <div>
            <p className="text-sm">
              Are you sure you want to delete <strong>all files and folders</strong>?
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              This action cannot be undone. Consider exporting a backup first.
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 p-4 border-t border-border bg-muted/50">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="px-4 py-2 text-sm rounded-lg bg-destructive text-white hover:bg-destructive/90 transition-colors"
        >
          Delete Everything
        </button>
      </div>
    </DialogBase>
  );
}
