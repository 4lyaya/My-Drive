'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus } from 'lucide-react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { FileGrid } from './file-grid';
import { UploadModal } from './upload-modal';
import { FilePreview } from './file-preview';
import { SettingsModal, PinLockScreen } from './settings-modal';
import {
  NewFolderDialog,
  RenameDialog,
  DeleteDialog,
  MoveDialog,
  ClearDataDialog,
} from './dialogs';
import { db, initializeSettings, updateSettings } from '@/lib/db';
import {
  useFiles,
  useFolders,
  createFolder,
  deleteFile,
  deleteFolder,
  renameItem as renameItemInDb,
  moveFile,
  moveFolder,
  copyFile,
  getBreadcrumbs,
  searchFiles,
  searchFolders,
  clearAllData,
} from '@/hooks/use-file-manager';
import { exportBackup, importBackup, exportSelectedAsZip } from '@/lib/backup';
import { useToast } from '@/components/toast-provider';
import type { FileItem, FolderItem, Item, BreadcrumbItem, SortConfig, SortField, AppSettings } from '@/lib/types';
import { isFile } from '@/lib/types';
import { saveAs } from 'file-saver';
import { cn } from '@/lib/utils';

const SIDEBAR_COLLAPSED_KEY = 'file-manager-sidebar-collapsed';

export function FileManager() {
  // State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: 'My Files' }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'name', direction: 'asc' });
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // App settings
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  
  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [clearDataDialogOpen, setClearDataDialogOpen] = useState(false);
  
  // Rename/Delete/Move state
  const [itemToRename, setItemToRename] = useState<Item | null>(null);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
  const [moveItem, setMoveItem] = useState<Item | null>(null);
  
  // Search results
  const [searchResults, setSearchResults] = useState<{ files: FileItem[]; folders: FolderItem[] } | null>(null);
  
  // Operation loading state
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  
  // Import file input ref
  const importInputRef = useRef<HTMLInputElement>(null);
  
  const { showToast } = useToast();
  
  // Data from IndexedDB
  const files = useFiles(currentFolderId);
  const folders = useFolders(currentFolderId);
  
  // Live settings query
  const liveSettings = useLiveQuery(() => db.settings.get('app-settings'));

  // Initialize app and load sidebar preference
  useEffect(() => {
    // Load sidebar preference
    const savedCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (savedCollapsed !== null) {
      setSidebarCollapsed(savedCollapsed === 'true');
    }
    
    // Initialize settings
    initializeSettings().then(s => {
      setSettings(s);
      if (!s.pinCode) {
        setIsLocked(false);
      }
    });
  }, []);

  // Sync live settings
  useEffect(() => {
    if (liveSettings) {
      setSettings(liveSettings);
    }
  }, [liveSettings]);

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setMobileSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (settings?.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings?.darkMode]);

  // Update breadcrumbs when folder changes
  useEffect(() => {
    getBreadcrumbs(currentFolderId).then(setBreadcrumbs);
  }, [currentFolderId]);

  // Search handling
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    
    const timer = setTimeout(async () => {
      const [foundFiles, foundFolders] = await Promise.all([
        searchFiles(searchQuery),
        searchFolders(searchQuery),
      ]);
      setSearchResults({ files: foundFiles, folders: foundFolders });
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sidebar handlers
  const handleToggleSidebarCollapse = useCallback(() => {
    setSidebarCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
      return newValue;
    });
  }, []);

  const handleOpenMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(true);
  }, []);

  const handleCloseMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  // Handlers
  const handleFolderSelect = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSelectedItems(new Set());
    setSearchQuery('');
    if (isMobile) setMobileSidebarOpen(false);
  }, [isMobile]);

  const handleViewModeChange = useCallback((mode: 'grid' | 'list') => {
    if (settings) {
      updateSettings({ viewMode: mode });
    }
  }, [settings]);

  const handleDarkModeToggle = useCallback(() => {
    if (settings) {
      updateSettings({ darkMode: !settings.darkMode });
    }
  }, [settings]);

  const handleSortChange = useCallback((field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleCreateFolder = useCallback(async (name: string) => {
    setIsOperationLoading(true);
    try {
      await createFolder(name, currentFolderId);
      showToast(`Folder "${name}" created`, 'success');
    } catch {
      showToast('Failed to create folder', 'error');
    } finally {
      setIsOperationLoading(false);
    }
  }, [currentFolderId, showToast]);

  const handleRename = useCallback(async (newName: string) => {
    if (!itemToRename) return;
    setIsOperationLoading(true);
    try {
      await renameItemInDb(itemToRename.id, newName, itemToRename.type);
      showToast('Renamed successfully', 'success');
    } catch {
      showToast('Failed to rename', 'error');
    } finally {
      setIsOperationLoading(false);
      setItemToRename(null);
    }
  }, [itemToRename, showToast]);

  const handleDelete = useCallback(async () => {
    if (!deleteItem) return;
    setIsOperationLoading(true);
    try {
      if (isFile(deleteItem)) {
        await deleteFile(deleteItem.id);
      } else {
        await deleteFolder(deleteItem.id);
      }
      showToast('Deleted successfully', 'success');
      setSelectedItems(prev => {
        const next = new Set(prev);
        next.delete(deleteItem.id);
        return next;
      });
    } catch {
      showToast('Failed to delete', 'error');
    } finally {
      setIsOperationLoading(false);
      setDeleteItem(null);
    }
  }, [deleteItem, showToast]);

  const handleMove = useCallback(async (targetFolderId: string | null) => {
    if (!moveItem) return;
    setIsOperationLoading(true);
    try {
      if (isFile(moveItem)) {
        await moveFile(moveItem.id, targetFolderId);
      } else {
        await moveFolder(moveItem.id, targetFolderId);
      }
      showToast('Moved successfully', 'success');
    } catch {
      showToast('Failed to move', 'error');
    } finally {
      setIsOperationLoading(false);
      setMoveItem(null);
    }
  }, [moveItem, showToast]);

  const handleCopy = useCallback(async (file: FileItem) => {
    setIsOperationLoading(true);
    try {
      await copyFile(file.id, currentFolderId);
      showToast('File copied', 'success');
    } catch {
      showToast('Failed to copy', 'error');
    } finally {
      setIsOperationLoading(false);
    }
  }, [currentFolderId, showToast]);

  const handleDownload = useCallback((file: FileItem) => {
    saveAs(file.data, file.name);
    showToast('Download started', 'success');
  }, [showToast]);

  const handleExportBackup = useCallback(async () => {
    try {
      await exportBackup();
      showToast('Backup exported successfully', 'success');
    } catch {
      showToast('Failed to export backup', 'error');
    }
  }, [showToast]);

  const handleImportBackup = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const result = await importBackup(file);
      showToast(`Imported ${result.filesCount} files and ${result.foldersCount} folders`, 'success');
    } catch {
      showToast('Failed to import backup', 'error');
    }
    e.target.value = '';
  }, [showToast]);

  const handleClearData = useCallback(async () => {
    try {
      await clearAllData();
      setCurrentFolderId(null);
      showToast('All data cleared', 'success');
    } catch {
      showToast('Failed to clear data', 'error');
    }
  }, [showToast]);

  const handleSettingsSave = useCallback(async (updates: Partial<AppSettings>) => {
    try {
      await updateSettings(updates);
      showToast('Settings saved', 'success');
    } catch {
      showToast('Failed to save settings', 'error');
    }
  }, [showToast]);

  const handleDownloadSelected = useCallback(async () => {
    if (selectedItems.size === 0) return;
    
    const fileIds = Array.from(selectedItems);
    try {
      await exportSelectedAsZip(fileIds);
      showToast('Download started', 'success');
    } catch {
      showToast('Failed to download files', 'error');
    }
  }, [selectedItems, showToast]);

  // Show PIN lock screen if locked
  if (settings?.pinCode && isLocked) {
    return <PinLockScreen correctPin={settings.pinCode} onUnlock={() => setIsLocked(false)} />;
  }

  // Loading state
  if (!settings) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayFiles = searchResults ? searchResults.files : files;
  const displayFolders = searchResults ? searchResults.folders : folders;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Hidden import input */}
      <input
        ref={importInputRef}
        type="file"
        accept=".zip"
        onChange={handleImportFile}
        className="hidden"
      />

      {/* Sidebar */}
      <Sidebar
        currentFolderId={currentFolderId}
        isCollapsed={sidebarCollapsed}
        isMobileOpen={mobileSidebarOpen}
        viewMode={settings.viewMode}
        darkMode={settings.darkMode}
        onFolderSelect={handleFolderSelect}
        onToggleCollapse={handleToggleSidebarCollapse}
        onCloseMobile={handleCloseMobileSidebar}
        onUploadClick={() => {
          setUploadModalOpen(true);
          if (isMobile) setMobileSidebarOpen(false);
        }}
        onNewFolderClick={() => {
          setNewFolderDialogOpen(true);
          if (isMobile) setMobileSidebarOpen(false);
        }}
        onViewModeChange={handleViewModeChange}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onClearData={() => {
          setClearDataDialogOpen(true);
          if (isMobile) setMobileSidebarOpen(false);
        }}
        onDarkModeToggle={handleDarkModeToggle}
        onPinLockClick={() => {
          setSettingsModalOpen(true);
          if (isMobile) setMobileSidebarOpen(false);
        }}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          breadcrumbs={breadcrumbs}
          sortConfig={sortConfig}
          searchQuery={searchQuery}
          onBreadcrumbClick={handleFolderSelect}
          onSearchChange={setSearchQuery}
          onSortChange={handleSortChange}
          onToggleSidebar={handleOpenMobileSidebar}
        />

        {/* Selection toolbar */}
        {selectedItems.size > 0 && (
          <div className="flex items-center gap-4 px-4 py-2 bg-primary/5 border-b border-border">
            <span className="text-sm font-medium">{selectedItems.size} selected</span>
            <button
              onClick={handleDownloadSelected}
              className="text-sm text-primary hover:underline"
            >
              Download as ZIP
            </button>
            <button
              onClick={() => setSelectedItems(new Set())}
              className="text-sm text-muted-foreground hover:text-foreground ml-auto"
            >
              Clear selection
            </button>
          </div>
        )}

        {/* File grid */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {searchQuery && (
            <p className="text-sm text-muted-foreground mb-4">
              Search results for &ldquo;{searchQuery}&rdquo;
            </p>
          )}
          <FileGrid
            files={displayFiles}
            folders={displayFolders}
            viewMode={settings.viewMode}
            sortConfig={sortConfig}
            selectedItems={selectedItems}
            isLoading={isOperationLoading}
            onFolderOpen={handleFolderSelect}
            onFilePreview={setPreviewFile}
            onRename={setItemToRename}
            onDelete={setDeleteItem}
            onMove={setMoveItem}
            onCopy={handleCopy}
            onDownload={handleDownload}
            onSelectionChange={setSelectedItems}
          />
        </main>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={handleOpenMobileSidebar}
        className={cn(
          'fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg',
          'flex items-center justify-center transition-all duration-200',
          'hover:scale-105 hover:shadow-xl active:scale-95',
          'md:hidden',
          mobileSidebarOpen && 'scale-0 opacity-0'
        )}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Modals */}
      <UploadModal
        isOpen={uploadModalOpen}
        folderId={currentFolderId}
        onClose={() => setUploadModalOpen(false)}
        onUploadComplete={() => showToast('Files uploaded successfully', 'success')}
      />

      <FilePreview
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        settings={settings}
        onClose={() => setSettingsModalOpen(false)}
        onSave={handleSettingsSave}
      />

      <NewFolderDialog
        isOpen={newFolderDialogOpen}
        onClose={() => setNewFolderDialogOpen(false)}
        onSubmit={handleCreateFolder}
      />

      <RenameDialog
        isOpen={!!itemToRename}
        currentName={itemToRename?.name || ''}
        onClose={() => setItemToRename(null)}
        onSubmit={handleRename}
      />

      <DeleteDialog
        isOpen={!!deleteItem}
        itemName={deleteItem?.name || ''}
        itemType={deleteItem?.type || 'file'}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
      />

      <MoveDialog
        isOpen={!!moveItem}
        itemName={moveItem?.name || ''}
        currentFolderId={moveItem && isFile(moveItem) ? moveItem.folderId : moveItem && !isFile(moveItem) ? moveItem.parentId : null}
        excludeFolderId={moveItem && !isFile(moveItem) ? moveItem.id : undefined}
        onClose={() => setMoveItem(null)}
        onSubmit={handleMove}
      />

      <ClearDataDialog
        isOpen={clearDataDialogOpen}
        onClose={() => setClearDataDialogOpen(false)}
        onConfirm={handleClearData}
      />
    </div>
  );
}
