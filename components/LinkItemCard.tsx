
import React, { useState } from 'react';
import { LinkItem } from '../types';
import { ExternalLink, CheckCircle, Trash2, RotateCcw, Clock, RefreshCw, Edit2, X, Check, Copy } from 'lucide-react';

interface LinkItemCardProps {
  item: LinkItem;
  onToggleRead: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
  onEditTitle?: (id: string, newTitle: string) => void;
  lang: 'zh' | 'en';
}

export const LinkItemCard: React.FC<LinkItemCardProps> = ({ 
  item, 
  onToggleRead, 
  onDelete, 
  onRestore, 
  onPermanentDelete,
  onEditTitle,
  lang 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(item.title);
  const [copied, setCopied] = useState(false);

  const t = {
    visit: lang === 'zh' ? '查看' : 'OPEN',
    read: lang === 'zh' ? '已读' : 'DONE',
    restore: lang === 'zh' ? '还原' : 'RESTORE',
    delete: lang === 'zh' ? '删除' : 'DELETE',
    save: lang === 'zh' ? '保存' : 'SAVE',
    cancel: lang === 'zh' ? '取消' : 'CANCEL',
    copy: lang === 'zh' ? '复制' : 'COPY'
  };

  const statusBg = item.isRead ? 'bg-slate-200' : 'bg-[#00ff66]';

  const handleSaveEdit = () => {
    if (onEditTitle && editedTitle.trim()) {
      onEditTitle(item.id, editedTitle.trim());
      setIsEditing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(item.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`animate-slide-up brutal-border brutal-shadow-sm p-4 flex flex-col h-full bg-white transition-all group hover:-translate-y-1 ${item.isRead ? 'opacity-80' : ''}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-3">
          <div className={`brutal-border px-2 py-0.5 text-[10px] font-bold ${statusBg} text-black uppercase tracking-tighter`}>
            {item.isRead ? t.read : (lang === 'zh' ? '未读' : 'TODO')}
          </div>
          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 ml-auto">
            <Clock size={10} />
            {new Date(item.createdAt).toLocaleDateString()}
          </span>
        </div>
        
        {isEditing ? (
          <div className="mb-2 flex flex-col gap-2">
            <input 
              type="text" 
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-full brutal-border px-2 py-1 text-sm font-bold bg-white text-black uppercase focus:outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              <button 
                onClick={handleSaveEdit}
                className="brutal-button-press brutal-border brutal-shadow-sm bg-[#00ff66] px-2 py-1 text-[10px] font-bold flex items-center gap-1"
              >
                <Check size={12} strokeWidth={3} /> {t.save}
              </button>
              <button 
                onClick={() => setIsEditing(false)}
                className="brutal-button-press brutal-border brutal-shadow-sm bg-red-400 px-2 py-1 text-[10px] font-bold flex items-center gap-1"
              >
                <X size={12} strokeWidth={3} /> {t.cancel}
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <h3 className="text-lg font-bold leading-tight mb-2 text-black line-clamp-2 uppercase pr-8">
              {item.title}
            </h3>
            {!item.isDeleted && (
              <button 
                onClick={() => setIsEditing(true)}
                className="absolute right-0 top-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100 brutal-border border-transparent hover:border-black"
              >
                <Edit2 size={14} className="text-slate-400 hover:text-black" />
              </button>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-2 bg-slate-100 p-1 border-l-4 border-black mb-4 overflow-hidden">
          <p className="text-[11px] font-medium text-slate-600 truncate flex-1">
            {item.url}
          </p>
          <button onClick={handleCopy} className="p-1 hover:bg-white brutal-border border-transparent hover:border-black transition-all">
            {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} className="text-slate-400" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t-2 border-black mt-2">
        {!item.isDeleted ? (
          <a 
            href={item.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="brutal-button-press brutal-border brutal-shadow-sm bg-[#fff33b] px-3 py-1.5 text-xs font-bold text-black flex items-center gap-1.5"
          >
            <ExternalLink size={14} strokeWidth={3} />
            {t.visit}
          </a>
        ) : (
          <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-1 brutal-border border-red-600 uppercase">
            {lang === 'zh' ? '回收站' : 'TRASH'}
          </span>
        )}

        <div className="flex items-center gap-2">
          {!item.isDeleted ? (
            <>
              <button
                onClick={() => onToggleRead(item.id)}
                className={`brutal-button-press brutal-border brutal-shadow-sm p-1.5 ${item.isRead ? 'bg-[#32d6ff]' : 'bg-white'}`}
                title={item.isRead ? 'Mark as Unread' : 'Mark as Read'}
              >
                {item.isRead ? <RotateCcw size={16} strokeWidth={3} /> : <CheckCircle size={16} strokeWidth={3} />}
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="brutal-button-press brutal-border brutal-shadow-sm bg-red-400 p-1.5"
                title="Move to Trash"
              >
                <Trash2 size={16} strokeWidth={3} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onRestore?.(item.id)}
                className="brutal-button-press brutal-border brutal-shadow-sm bg-[#00ff66] p-1.5"
                title="Restore"
              >
                <RefreshCw size={16} strokeWidth={3} />
              </button>
              <button
                onClick={() => onPermanentDelete?.(item.id)}
                className="brutal-button-press brutal-border brutal-shadow-sm bg-red-600 text-white p-1.5"
                title="Delete Permanently"
              >
                <Trash2 size={16} strokeWidth={3} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

