'use client';

import { useState, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  HardDrive,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Upload,
  FolderPlus,
  Grid3X3,
  List,
  Download,
  Trash2,
  Moon,
  Sun,
  Lock,
  X,
} from 'lucide-react';
import { useAllFolders, useStorageUsed } from '@/hooks/use-file-manager';
import type { FolderItem } from '@/lib/types';
import { formatFileSize } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SidebarProps {
  currentFolderId: string | null;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  viewMode: 'grid' | 'list';
  darkMode: boolean;
  onFolderSelect: (folderId: string | null) => void;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onUploadClick: () => void;
  onNewFolderClick: () => void;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onClearData: () => void;
  onDarkModeToggle: () => void;
  onPinLockClick: () => void;
}

interface FolderTreeItemProps {
  folder: FolderItem;
  allFolders: FolderItem[];
  currentFolderId: string | null;
  isCollapsed: boolean;
  onFolderSelect: (folderId: string | null) => void;
  level: number;
}

function FolderTreeItem({
  folder,
  allFolders,
  currentFolderId,
  isCollapsed,
  onFolderSelect,
  level,
}: FolderTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const children = allFolders.filter(f => f.parentId !== null && f.parentId === folder.id);
  const hasChildren = children.length > 0;
  const isSelected = currentFolderId === folder.id;

  if (isCollapsed) return null;

  return (
    <div>
      <button
        onClick={() => onFolderSelect(folder.id)}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg transition-colors',
          'hover:bg-accent/50',
          isSelected && 'bg-primary/10 text-primary'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={e => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 hover:bg-accent rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        {isExpanded || isSelected ? (
          <FolderOpen className="h-4 w-4 text-primary shrink-0" />
        ) : (
          <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="truncate">{folder.name}</span>
      </button>
      {isExpanded && hasChildren && (
        <div>
          {children.map(child => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              allFolders={allFolders}
              currentFolderId={currentFolderId}
              isCollapsed={isCollapsed}
              onFolderSelect={onFolderSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarButton({
  icon: Icon,
  label,
  isCollapsed,
  isActive,
  variant = 'default',
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  isCollapsed: boolean;
  isActive?: boolean;
  variant?: 'default' | 'primary' | 'danger';
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200',
        isCollapsed && 'justify-center px-2',
        variant === 'default' && 'hover:bg-accent/50',
        variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'danger' && 'text-destructive hover:bg-destructive/10',
        isActive && variant === 'default' && 'bg-accent text-accent-foreground'
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!isCollapsed && <span>{label}</span>}
    </button>
  );
}

function SidebarSection({
  title,
  isCollapsed,
  children,
}: {
  title: string;
  isCollapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      {!isCollapsed && (
        <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </p>
      )}
      {isCollapsed && <div className="h-px bg-border mx-2 my-2" />}
      {children}
    </div>
  );
}

export function Sidebar({
  currentFolderId,
  isCollapsed,
  isMobileOpen,
  viewMode,
  darkMode,
  onFolderSelect,
  onToggleCollapse,
  onCloseMobile,
  onUploadClick,
  onNewFolderClick,
  onViewModeChange,
  onExportBackup,
  onImportBackup,
  onClearData,
  onDarkModeToggle,
  onPinLockClick,
}: SidebarProps) {
  const allFolders = useAllFolders();
  const storageUsed = useStorageUsed();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const rootFolders = allFolders.filter(f => f.parentId === null || f.parentId === undefined);
  const maxStorage = 500 * 1024 * 1024; // 500MB virtual limit
  const usagePercent = Math.min((storageUsed / maxStorage) * 100, 100);

  if (!mounted) return null;

  const sidebarContent = (
    <aside
      className={cn(
        'flex flex-col h-full bg-card border-r border-border transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center border-b border-border h-14 shrink-0',
        isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
      )}>
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <HardDrive className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">My Drive</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-accent transition-colors hidden md:flex"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="p-2 rounded-lg hover:bg-accent transition-colors md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-2 space-y-4">
        {/* File Actions */}
        <SidebarSection title="File Actions" isCollapsed={isCollapsed}>
          <SidebarButton
            icon={Upload}
            label="Upload File"
            isCollapsed={isCollapsed}
            variant="primary"
            onClick={onUploadClick}
          />
          <SidebarButton
            icon={FolderPlus}
            label="New Folder"
            isCollapsed={isCollapsed}
            onClick={onNewFolderClick}
          />
        </SidebarSection>

        {/* View Controls */}
        <SidebarSection title="View" isCollapsed={isCollapsed}>
          <SidebarButton
            icon={Grid3X3}
            label="Grid View"
            isCollapsed={isCollapsed}
            isActive={viewMode === 'grid'}
            onClick={() => onViewModeChange('grid')}
          />
          <SidebarButton
            icon={List}
            label="List View"
            isCollapsed={isCollapsed}
            isActive={viewMode === 'list'}
            onClick={() => onViewModeChange('list')}
          />
        </SidebarSection>

        {/* Folders */}
        {!isCollapsed && rootFolders.length > 0 && (
          <div className="space-y-1">
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Folders
            </p>
            <button
              onClick={() => onFolderSelect(null)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors',
                'hover:bg-accent/50',
                currentFolderId === null && 'bg-primary/10 text-primary'
              )}
            >
              <HardDrive className="h-4 w-4" />
              <span>All Files</span>
            </button>
            {rootFolders.map(folder => (
              <FolderTreeItem
                key={folder.id}
                folder={folder}
                allFolders={allFolders}
                currentFolderId={currentFolderId}
                isCollapsed={isCollapsed}
                onFolderSelect={onFolderSelect}
                level={0}
              />
            ))}
          </div>
        )}

        {/* Data Management */}
        <SidebarSection title="Data" isCollapsed={isCollapsed}>
          <SidebarButton
            icon={Download}
            label="Backup Export"
            isCollapsed={isCollapsed}
            onClick={onExportBackup}
          />
          <SidebarButton
            icon={Upload}
            label="Backup Import"
            isCollapsed={isCollapsed}
            onClick={onImportBackup}
          />
          <SidebarButton
            icon={Trash2}
            label="Clear All Data"
            isCollapsed={isCollapsed}
            variant="danger"
            onClick={onClearData}
          />
        </SidebarSection>

        {/* App Settings */}
        <SidebarSection title="Settings" isCollapsed={isCollapsed}>
          <SidebarButton
            icon={darkMode ? Sun : Moon}
            label={darkMode ? 'Light Mode' : 'Dark Mode'}
            isCollapsed={isCollapsed}
            onClick={onDarkModeToggle}
          />
          <SidebarButton
            icon={Lock}
            label="PIN Lock"
            isCollapsed={isCollapsed}
            onClick={onPinLockClick}
          />
        </SidebarSection>
      </div>

      {/* Storage indicator */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border shrink-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Storage</span>
            <span>{formatFileSize(storageUsed)} / 500 MB</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                usagePercent > 90 ? 'bg-destructive' : usagePercent > 70 ? 'bg-warning' : 'bg-primary'
              )}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      )}
    </aside>
  );

  // Mobile: render as overlay
  if (isMobileOpen) {
    return (
      <>
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={onCloseMobile}
        />
        <div className="fixed inset-y-0 left-0 z-50 md:hidden">
          {sidebarContent}
        </div>
      </>
    );
  }

  // Desktop: render normally
  return <div className="hidden md:block">{sidebarContent}</div>;
}
