/**
 * FyreOne AI - Save to Notebook Modal
 * 
 * Modal for saving a response snippet to a notebook.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X,
  BookOpen,
  Plus,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SaveToNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  conversationId: string;
  messageIndex: number;
}

export function SaveToNotebookModal({
  isOpen,
  onClose,
  content,
  conversationId,
  messageIndex,
}: SaveToNotebookModalProps) {
  const queryClient = useQueryClient();
  
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showNotebookDropdown, setShowNotebookDropdown] = useState(false);

  // Fetch user's notebooks
  const { data: notebooks = [] } = useQuery({
    queryKey: ['notebooks'],
    queryFn: async () => {
      const response = await fetch('/api/notebooks');
      if (!response.ok) throw new Error('Failed to fetch notebooks');
      return response.json();
    },
    enabled: isOpen,
  });

  // Fetch existing tags for autocomplete
  const { data: existingTags = [] } = useQuery({
    queryKey: ['snippet-tags'],
    queryFn: async () => {
      const response = await fetch('/api/snippets/tags');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isOpen,
  });

  // Create notebook mutation
  const createNotebookMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error('Failed to create notebook');
      return response.json();
    },
    onSuccess: (newNotebook) => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
      setSelectedNotebookId(newNotebook.id);
      setIsCreatingNotebook(false);
      setNewNotebookName('');
    },
  });

  // Save snippet mutation
  const saveSnippetMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notebookId: selectedNotebookId,
          conversationId,
          messageIndex,
          content,
          title: title || null,
          notes: notes || null,
          tags,
        }),
      });
      if (!response.ok) throw new Error('Failed to save snippet');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
      onClose();
      // Reset form
      setSelectedNotebookId(null);
      setTitle('');
      setNotes('');
      setTags([]);
      // Show toast notification (implement with your toast library)
      // toast.success('Snippet saved to notebook');
    },
  });

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleCreateNotebook = () => {
    if (newNotebookName.trim()) {
      createNotebookMutation.mutate(newNotebookName.trim());
    }
  };

  const handleSave = () => {
    if (selectedNotebookId) {
      saveSnippetMutation.mutate();
    }
  };

  // Auto-suggest title from first line of content
  const suggestedTitle = content.split('\n')[0].slice(0, 60).replace(/^[#\-*]+\s*/, '');

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-orange-500" />
              Save to Notebook
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preview
              </label>
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 max-h-24 overflow-y-auto">
                {content.slice(0, 200)}
                {content.length > 200 && '...'}
              </div>
            </div>

            {/* Notebook Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notebook
              </label>
              
              {isCreatingNotebook ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNotebookName}
                    onChange={(e) => setNewNotebookName(e.target.value)}
                    placeholder="New notebook name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateNotebook}
                    disabled={!newNotebookName.trim() || createNotebookMutation.isPending}
                    className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setIsCreatingNotebook(false);
                      setNewNotebookName('');
                    }}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setShowNotebookDropdown(!showNotebookDropdown)}
                    className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <span className={selectedNotebookId ? 'text-gray-800' : 'text-gray-400'}>
                      {selectedNotebookId
                        ? notebooks.find((n: any) => n.id === selectedNotebookId)?.name
                        : 'Select a notebook'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {showNotebookDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {notebooks.map((notebook: any) => (
                        <button
                          key={notebook.id}
                          onClick={() => {
                            setSelectedNotebookId(notebook.id);
                            setShowNotebookDropdown(false);
                          }}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50',
                            selectedNotebookId === notebook.id && 'bg-orange-50 text-orange-600'
                          )}
                        >
                          <BookOpen className="w-4 h-4" />
                          {notebook.name}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setIsCreatingNotebook(true);
                          setShowNotebookDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 border-t border-gray-100"
                      >
                        <Plus className="w-4 h-4" />
                        Create new notebook
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={suggestedTitle || 'Enter a title'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-orange-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tags..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  list="tag-suggestions"
                />
                <datalist id="tag-suggestions">
                  {existingTags
                    .filter((t: string) => !tags.includes(t))
                    .map((t: string) => (
                      <option key={t} value={t} />
                    ))}
                </datalist>
                <button
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                  className="px-3 py-2 text-orange-600 hover:bg-orange-50 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  <Tag className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedNotebookId || saveSnippetMutation.isPending}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {saveSnippetMutation.isPending ? 'Saving...' : 'Save Snippet'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default SaveToNotebookModal;
