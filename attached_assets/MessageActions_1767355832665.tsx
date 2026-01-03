/**
 * FyreOne AI - Message Action Buttons
 * 
 * Action buttons that appear on each assistant message:
 * - Thumbs up (helpful)
 * - Thumbs down (not helpful)
 * - Copy to clipboard
 * - Save to notebook
 */

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Copy, Bookmark, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '@/utils/export';
import { SaveToNotebookModal } from './SaveToNotebookModal';

interface MessageActionsProps {
  content: string;
  conversationId: string;
  messageIndex: number;
  onFeedback?: (type: 'positive' | 'negative') => void;
}

export function MessageActions({
  content,
  conversationId,
  messageIndex,
  onFeedback,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFeedback = (type: 'positive' | 'negative') => {
    setFeedback(type);
    onFeedback?.(type);
  };

  return (
    <>
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Thumbs Up */}
        <button
          onClick={() => handleFeedback('positive')}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            feedback === 'positive'
              ? 'bg-green-100 text-green-600'
              : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
          )}
          title="Helpful"
        >
          <ThumbsUp className="w-4 h-4" />
        </button>

        {/* Thumbs Down */}
        <button
          onClick={() => handleFeedback('negative')}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            feedback === 'negative'
              ? 'bg-red-100 text-red-600'
              : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
          )}
          title="Not helpful"
        >
          <ThumbsDown className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* Copy */}
        <button
          onClick={handleCopy}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            copied
              ? 'bg-green-100 text-green-600'
              : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
          )}
          title={copied ? 'Copied!' : 'Copy to clipboard'}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>

        {/* Save to Notebook */}
        <button
          onClick={() => setShowSaveModal(true)}
          className="p-1.5 rounded-md hover:bg-orange-100 text-gray-400 hover:text-orange-600 transition-colors"
          title="Save to notebook"
        >
          <Bookmark className="w-4 h-4" />
        </button>
      </div>

      {/* Save to Notebook Modal */}
      <SaveToNotebookModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        content={content}
        conversationId={conversationId}
        messageIndex={messageIndex}
      />
    </>
  );
}

export default MessageActions;
