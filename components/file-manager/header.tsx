'use client';

import { useState } from 'react';
import {
  Search,
  Menu,
  ChevronRight,
  Home,
  ArrowUpDown,
} from 'lucide-react';
import type { BreadcrumbItem, SortConfig, SortField } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  breadcrumbs: BreadcrumbItem[];
  sortConfig: SortConfig;
  searchQuery: string;
  onBreadcrumbClick: (folderId: string | null) => void;
  onSearchChange: (query: string) => void;
  onSortChange: (field: SortField) => void;
  onToggleSidebar: () => void;
}

export function Header({
  breadcrumbs,
  sortConfig,
  searchQuery,
  onBreadcrumbClick,
  onSearchChange,
  onSortChange,
  onToggleSidebar,
}: HeaderProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-3 px-4 h-14">
        {/* Mobile menu button */}
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumbs - Desktop */}
        <nav className="hidden sm:flex items-center gap-0.5 text-sm flex-shrink-0">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id ?? 'root'} className="flex items-center">
              {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-0.5" />}
              <button
                onClick={() => onBreadcrumbClick(crumb.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors',
                  index === breadcrumbs.length - 1
                    ? 'text-foreground font-medium bg-accent/50'
                    : 'text-muted-foreground'
                )}
              >
                {index === 0 && <Home className="h-4 w-4" />}
                <span className="max-w-[150px] truncate">{crumb.name}</span>
              </button>
            </div>
          ))}
        </nav>

        {/* Breadcrumbs - Mobile (compact) */}
        <div className="flex sm:hidden items-center gap-1 text-sm flex-shrink-0">
          {breadcrumbs.length > 1 && (
            <button
              onClick={() => onBreadcrumbClick(breadcrumbs[breadcrumbs.length - 2]?.id ?? null)}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </button>
          )}
          <span className="font-medium truncate max-w-[180px]">
            {breadcrumbs[breadcrumbs.length - 1]?.name || 'My Files'}
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div className={cn(
          'relative transition-all duration-200',
          isSearchFocused ? 'w-full max-w-md' : 'w-48 sm:w-64'
        )}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-muted/50 rounded-lg border border-transparent focus:bg-background focus:border-ring focus:outline-none transition-all"
          />
        </div>

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="p-2 rounded-lg hover:bg-accent transition-colors shrink-0" 
              title="Sort options"
            >
              <ArrowUpDown className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onSortChange('name')}>
              <span className="flex-1">Name</span>
              {sortConfig.field === 'name' && (
                <span className="text-primary">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortChange('createdAt')}>
              <span className="flex-1">Date</span>
              {sortConfig.field === 'createdAt' && (
                <span className="text-primary">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortChange('size')}>
              <span className="flex-1">Size</span>
              {sortConfig.field === 'size' && (
                <span className="text-primary">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
