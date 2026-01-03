/**
 * FyreOne AI - Collapsible Sidebar
 * 
 * A responsive sidebar with sections for conversations, projects, and notebooks.
 * - Mobile: Slide-in overlay triggered by hamburger menu
 * - Desktop: Always visible, can collapse to icons-only
 */

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Star,
  Clock,
  Folder,
  BookOpen,
  Settings,
  Menu,
  X,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  Edit2,
  FolderPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// SIDEBAR CONTEXT
// ============================================================================

interface SidebarContextType {
  isOpen: boolean;
  isCollapsed: boolean;
  setIsOpen: (open: boolean) => void;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  toggleCollapse: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
}

interface SidebarProviderProps {
  children: ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fyreone-sidebar-collapsed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('fyreone-sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        isCollapsed,
        setIsOpen,
        setIsCollapsed,
        toggleSidebar,
        toggleCollapse,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

// ============================================================================
// COLLAPSIBLE SECTION
// ============================================================================

interface CollapsibleSectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  action?: ReactNode;
  storageKey: string;
}

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
  action,
  storageKey,
}: CollapsibleSectionProps) {
  const { isCollapsed } = useSidebar();
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`fyreone-section-${storageKey}`);
      return stored !== null ? stored === 'true' : defaultOpen;
    }
    return defaultOpen;
  });

  useEffect(() => {
    localStorage.setItem(`fyreone-section-${storageKey}`, String(isExpanded));
  }, [isExpanded, storageKey]);

  if (isCollapsed) {
    return (
      <div className="py-2">
        <div className="flex justify-center text-gray-400">{icon}</div>
      </div>
    );
  }

  return (
    <div className="py-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
        </div>
        {action && (
          <div onClick={(e) => e.stopPropagation()}>{action}</div>
        )}
      </button>
      {isExpanded && (
        <div className="mt-1 ml-4 space-y-0.5 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CONVERSATION ITEM
// ============================================================================

interface ConversationItemProps {
  id: string;
  title: string;
  date: Date;
  isActive: boolean;
  isFavorite?: boolean;
  onClick: () => void;
}

function ConversationItem({
  id,
  title,
  date,
  isActive,
  isFavorite,
  onClick,
}: ConversationItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (d: Date) => {
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
        isActive
          ? 'bg-orange-50 border-l-2 border-orange-500'
          : 'hover:bg-gray-50'
      )}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowMenu(true);
      }}
    >
      <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 truncate">{title || 'New conversation'}</p>
        <p className="text-xs text-gray-400">{formatDate(date)}</p>
      </div>
      {isFavorite && <Star className="w-3 h-3 text-orange-400 fill-orange-400" />}
      <button
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
      >
        <MoreHorizontal className="w-4 h-4 text-gray-400" />
      </button>

      {/* Context Menu - implement with shadcn/ui DropdownMenu */}
      {showMenu && (
        <div
          className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          onMouseLeave={() => setShowMenu(false)}
        >
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Edit2 className="w-4 h-4" /> Rename
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Star className="w-4 h-4" /> {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <FolderPlus className="w-4 h-4" /> Move to project
          </button>
          <hr className="my-1" />
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN SIDEBAR COMPONENT
// ============================================================================

export function Sidebar() {
  const { isOpen, isCollapsed, setIsOpen, toggleCollapse } = useSidebar();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch conversations - replace with your actual API call
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      // Replace with actual API call
      // const response = await fetch('/api/conversations');
      // return response.json();
      return [];
    },
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      // Replace with actual API call
      return [];
    },
  });

  // Fetch notebooks
  const { data: notebooks = [] } = useQuery({
    queryKey: ['notebooks'],
    queryFn: async () => {
      // Replace with actual API call
      return [];
    },
  });

  // Filter conversations
  const favoriteConversations = conversations.filter((c: any) => c.isFavorite);
  const recentConversations = conversations
    .filter((c: any) => !c.isFavorite && !c.projectId)
    .slice(0, 10);

  const handleNewChat = () => {
    // Create new conversation and navigate
    setLocation('/');
    setIsOpen(false);
  };

  const handleConversationClick = (id: string) => {
    setLocation(`/chat/${id}`);
    setIsOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-1 font-bold text-lg">
            <span className="text-orange-500">FYRE</span>
            <span className="text-gray-800">ONE</span>
          </Link>
        )}
        <button
          onClick={toggleCollapse}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors hidden md:block"
        >
          <Menu className="w-5 h-5 text-gray-500" />
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={handleNewChat}
          className={cn(
            'flex items-center justify-center gap-2 w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors',
            isCollapsed && 'px-2'
          )}
        >
          <Plus className="w-5 h-5" />
          {!isCollapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <button
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors',
            isCollapsed && 'justify-center'
          )}
        >
          <Search className="w-4 h-4" />
          {!isCollapsed && <span className="text-sm">Search</span>}
        </button>
      </div>

      {/* Scrollable Sections */}
      <div className="flex-1 overflow-y-auto px-2">
        {/* Favorites */}
        <CollapsibleSection
          title="Favorites"
          icon={<Star className="w-4 h-4 text-orange-400" />}
          storageKey="favorites"
        >
          {favoriteConversations.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-2">No favorites yet</p>
          ) : (
            favoriteConversations.map((conv: any) => (
              <ConversationItem
                key={conv.id}
                id={conv.id}
                title={conv.title}
                date={new Date(conv.updatedAt)}
                isActive={location === `/chat/${conv.id}`}
                isFavorite
                onClick={() => handleConversationClick(conv.id)}
              />
            ))
          )}
        </CollapsibleSection>

        {/* Recent */}
        <CollapsibleSection
          title="Recent"
          icon={<Clock className="w-4 h-4 text-gray-400" />}
          storageKey="recent"
        >
          {recentConversations.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-2">No recent chats</p>
          ) : (
            recentConversations.map((conv: any) => (
              <ConversationItem
                key={conv.id}
                id={conv.id}
                title={conv.title}
                date={new Date(conv.updatedAt)}
                isActive={location === `/chat/${conv.id}`}
                onClick={() => handleConversationClick(conv.id)}
              />
            ))
          )}
        </CollapsibleSection>

        {/* Projects */}
        <CollapsibleSection
          title="Projects"
          icon={<Folder className="w-4 h-4 text-blue-400" />}
          storageKey="projects"
          action={
            <button className="p-1 hover:bg-gray-200 rounded">
              <Plus className="w-3 h-3 text-gray-400" />
            </button>
          }
        >
          {projects.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-2">No projects yet</p>
          ) : (
            projects.map((project: any) => (
              <div key={project.id} className="px-3 py-2 text-sm text-gray-600">
                {project.name}
              </div>
            ))
          )}
        </CollapsibleSection>

        {/* Notebooks */}
        <CollapsibleSection
          title="Notebooks"
          icon={<BookOpen className="w-4 h-4 text-green-400" />}
          storageKey="notebooks"
          action={
            <button className="p-1 hover:bg-gray-200 rounded">
              <Plus className="w-3 h-3 text-gray-400" />
            </button>
          }
        >
          {notebooks.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-2">No notebooks yet</p>
          ) : (
            notebooks.map((notebook: any) => (
              <Link
                key={notebook.id}
                href={`/notebooks/${notebook.id}`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <BookOpen className="w-4 h-4 text-gray-400" />
                {notebook.name}
              </Link>
            ))
          )}
        </CollapsibleSection>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors',
            isCollapsed && 'justify-center'
          )}
        >
          <Settings className="w-4 h-4" />
          {!isCollapsed && <span className="text-sm">Settings</span>}
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 transition-all duration-300 ease-in-out',
          // Mobile: slide in/out
          isOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: always visible
          'md:translate-x-0 md:relative',
          // Width
          isCollapsed ? 'w-16' : 'w-72'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

// ============================================================================
// SIDEBAR TRIGGER (for mobile header)
// ============================================================================

export function SidebarTrigger() {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      onClick={toggleSidebar}
      className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
      aria-label="Toggle sidebar"
    >
      <Menu className="w-5 h-5 text-gray-600" />
    </button>
  );
}
