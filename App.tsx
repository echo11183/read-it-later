
import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Search, Bookmark, BookOpen, Layers, Trash2, Link as LinkIcon, Type as TypeIcon, LogOut, Key, Mail, Lock, Loader2, AlertTriangle, Cloud, CloudOff, ExternalLink, ShieldCheck, Trash } from 'lucide-react';
import { LinkItem, FilterType, Language } from './types';
import { getLinkMetadata } from './services/geminiService';
import { LinkItemCard } from './components/LinkItemCard';
import { BrutalCard } from './components/GlassCard';

const SUPABASE_URL = 'https://vevyfntxqnmspfcqssxt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZldnlmbnR4cW5tc3BmY3Fzc3h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMTI0MjYsImV4cCI6MjA4MzY4ODQyNn0.yxpCmTzM0ajQ8AFubKCBGcS7ZifD0dcmvvFIqb3X_8s';

const isProductionConfigured = 
  SUPABASE_URL.startsWith('https://') && 
  !SUPABASE_URL.includes('your-project-id') &&
  SUPABASE_ANON_KEY.length > 50;

const supabase = isProductionConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const [links, setLinks] = useState<LinkItem[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [language, setLanguage] = useState<Language>('zh');
  const [error, setError] = useState<string | null>(null);

  const translations = {
    zh: {
      title: 'Read it later',
      subtitle: isProductionConfigured ? '云端同步模式' : '本地存储模式',
      loginTitle: '身份验证',
      signUpTitle: '注册新账号',
      emailLabel: '邮箱地址',
      passwordLabel: '登录密码',
      loginBtn: '立即进入',
      signUpBtn: '立即注册',
      switchLogin: '已有账号？去登录',
      switchSignUp: '没有账号？去注册',
      logout: '退出登录',
      urlPlaceholder: 'https://...',
      titlePlaceholder: '链接标题 (可选)',
      addBtn: '保存',
      analyzing: '处理中...',
      searchPlaceholder: '搜索...',
      filterAll: '全部',
      filterUnread: '未读',
      filterRead: '已读',
      filterTrash: '回收站',
      listTitle: '收藏清单',
      noItems: '这里空空如也',
      noItemsDesc: '还没有任何收藏，去添加一个吧！',
      confirmDelete: '确定要彻底删除吗？',
      confirmEmpty: '确定要清空回收站的所有内容吗？此操作无法撤销。',
      emptyTrash: '清空回收站',
      errorUrl: '无效的 URL 或网络错误',
      saveContent: '新建',
      quickSearch: '查找',
      poweredBy: isProductionConfigured ? 'SUPABASE CLOUD' : 'BROWSER CACHE',
      itemsCount: '共 {count} 项',
      welcome: '你好, {name}',
      statusCloud: '云端同步已开启',
      statusLocal: '仅本地存储'
    },
    en: {
      title: 'Read it later',
      subtitle: isProductionConfigured ? 'Cloud Sync Mode' : 'Local Mode',
      loginTitle: 'AUTHENTICATION',
      signUpTitle: 'CREATE ACCOUNT',
      emailLabel: 'EMAIL',
      passwordLabel: 'PASSWORD',
      loginBtn: 'ENTER',
      signUpBtn: 'SIGN UP',
      switchLogin: 'HAVE ACCOUNT? LOGIN',
      switchSignUp: 'NEED ACCOUNT? JOIN',
      logout: 'LOGOUT',
      urlPlaceholder: 'https://...',
      titlePlaceholder: 'Title (Optional)',
      addBtn: 'SAVE',
      analyzing: 'SYNCING...',
      searchPlaceholder: 'Search...',
      filterAll: 'ALL',
      filterUnread: 'TODO',
      filterRead: 'DONE',
      filterTrash: 'TRASH',
      listTitle: 'MY LINKS',
      noItems: 'NO DATA',
      noItemsDesc: 'Your list is empty.',
      confirmDelete: 'DELETE PERMANENTLY?',
      confirmEmpty: 'EMPTY TRASH PERMANENTLY?',
      emptyTrash: 'EMPTY ALL',
      errorUrl: 'INVALID URL',
      saveContent: 'ADD',
      quickSearch: 'FIND',
      poweredBy: isProductionConfigured ? 'SUPABASE CLOUD' : 'BROWSER CACHE',
      itemsCount: '{count} ITEMS',
      welcome: 'Hi, {name}',
      statusCloud: 'CLOUD ENABLED',
      statusLocal: 'LOCAL ONLY'
    }
  };

  const t = translations[language];

  useEffect(() => {
    if (!supabase) {
      const localSession = localStorage.getItem('brutal-local-session');
      if (localSession) setSession(JSON.parse(localSession));
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchLinks();
  }, [session]);

  const fetchLinks = async () => {
    if (!supabase) {
      const saved = localStorage.getItem(`brutal-links-${session.user.id}`);
      if (saved) setLinks(JSON.parse(saved));
      return;
    }
    try {
      const { data, error } = await supabase.from('links').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setLinks(data.map((item: any) => ({
        id: item.id,
        url: item.url,
        title: item.title,
        description: item.description,
        summary: item.summary,
        isRead: item.is_read,
        isDeleted: item.is_deleted,
        createdAt: new Date(item.created_at).getTime(),
      })));
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  // Implemented handleAuth function to fix the reported error
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError(null);

    try {
      if (supabase) {
        const { data, error } = isSignUp 
          ? await supabase.auth.signUp({ email, password })
          : await supabase.auth.signInWithPassword({ email, password });

        if (error) throw error;
        
        if (isSignUp && !data.session) {
          setError(language === 'zh' ? '请检查邮箱以验证您的账号' : 'Check your email for verification');
        } else if (data.session) {
          setSession(data.session);
        }
      } else {
        // Local simulation if Supabase is not available
        const mockUser = { id: 'local-user', email: email };
        const mockSession = { user: mockUser, access_token: 'local-token' };
        localStorage.setItem('brutal-local-session', JSON.stringify(mockSession));
        setSession(mockSession);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const syncLinks = (newLinks: LinkItem[]) => {
    setLinks(newLinks);
    if (session) localStorage.setItem(`brutal-links-${session.user.id}`, JSON.stringify(newLinks));
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    let processedUrl = urlInput.trim();
    if (!/^https?:\/\//i.test(processedUrl)) processedUrl = `https://${processedUrl}`;

    try {
      setIsLoading(true);
      setError(null);
      const metadata = await getLinkMetadata(processedUrl);
      
      if (supabase) {
        const { data, error } = await supabase.from('links').insert([{
          user_id: session.user.id,
          url: processedUrl,
          title: titleInput.trim() || metadata.title,
          description: metadata.description,
          summary: metadata.summary
        }]).select();
        if (error) throw error;
        const newItem: LinkItem = {
          id: data[0].id,
          url: data[0].url,
          title: data[0].title,
          description: data[0].description,
          summary: data[0].summary,
          isRead: data[0].is_read,
          isDeleted: data[0].is_deleted,
          createdAt: new Date(data[0].created_at).getTime()
        };
        syncLinks([newItem, ...links]);
      } else {
        const newItem: LinkItem = {
          id: crypto.randomUUID(),
          url: processedUrl,
          title: titleInput.trim() || metadata.title,
          description: metadata.description,
          summary: metadata.summary,
          isRead: false,
          isDeleted: false,
          createdAt: Date.now()
        };
        syncLinks([newItem, ...links]);
      }
      setUrlInput('');
      setTitleInput('');
    } catch (err) {
      setError(t.errorUrl);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTitle = async (id: string, newTitle: string) => {
    if (supabase) await supabase.from('links').update({ title: newTitle }).eq('id', id);
    syncLinks(links.map(link => link.id === id ? { ...link, title: newTitle } : link));
  };

  const toggleRead = async (id: string) => {
    const item = links.find(l => l.id === id);
    if (!item) return;
    if (supabase) await supabase.from('links').update({ is_read: !item.isRead }).eq('id', id);
    syncLinks(links.map(link => link.id === id ? { ...link, isRead: !link.isRead } : link));
  };

  const deleteToTrash = async (id: string) => {
    if (supabase) await supabase.from('links').update({ is_deleted: true }).eq('id', id);
    syncLinks(links.map(link => link.id === id ? { ...link, isDeleted: true } : link));
  };

  const restoreFromTrash = async (id: string) => {
    if (supabase) await supabase.from('links').update({ is_deleted: false }).eq('id', id);
    syncLinks(links.map(link => link.id === id ? { ...link, isDeleted: false } : link));
  };

  const permanentDelete = async (id: string) => {
    if (window.confirm(t.confirmDelete)) {
      if (supabase) await supabase.from('links').delete().eq('id', id);
      syncLinks(links.filter(link => link.id !== id));
    }
  };

  const emptyTrash = async () => {
    const trashItems = links.filter(l => l.isDeleted);
    if (trashItems.length === 0) return;
    if (window.confirm(t.confirmEmpty)) {
      if (supabase) {
        await supabase.from('links').delete().eq('is_deleted', true).eq('user_id', session.user.id);
      }
      syncLinks(links.filter(link => !link.isDeleted));
    }
  };

  const filteredLinks = useMemo(() => {
    return links
      .filter(link => {
        const matchesSearch = link.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             link.url.toLowerCase().includes(searchQuery.toLowerCase());
        if (activeFilter === 'trash') return link.isDeleted && matchesSearch;
        if (link.isDeleted) return false;
        const matchesFilter = activeFilter === 'all' || 
                             (activeFilter === 'read' && link.isRead) || 
                             (activeFilter === 'unread' && !link.isRead);
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [links, searchQuery, activeFilter]);

  const stats = useMemo(() => {
    const activeOnes = links.filter(l => !l.isDeleted);
    return {
      total: activeOnes.length,
      unread: activeOnes.filter(l => !l.isRead).length,
      // Fixed: property access from .read to .isRead
      read: activeOnes.filter(l => l.isRead).length,
      trash: links.filter(l => l.isDeleted).length
    };
  }, [links]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <BrutalCard bgColor="bg-[#fff33b]" className="max-w-md w-full animate-slide-up">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-black text-[#00ff66] brutal-border flex items-center justify-center rotate-3 shadow-[4px_4px_0_0_#000]">
              <Key size={28} strokeWidth={3} />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase italic leading-none tracking-tighter">{t.title}</h1>
              <p className="text-[10px] font-bold uppercase text-black/50">{isProductionConfigured ? 'DATABASE SYNC READY' : 'LOCAL CACHE MODE'}</p>
            </div>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase flex items-center gap-1">
                <Mail size={12} /> {t.emailLabel}
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white border-black px-4 py-3 text-sm focus:outline-none text-black font-bold brutal-border" required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase flex items-center gap-1">
                <Lock size={12} /> {t.passwordLabel}
              </label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white border-black px-4 py-3 text-sm focus:outline-none text-black font-bold brutal-border" required />
            </div>
            {error && <div className="bg-red-100 p-2 brutal-border border-red-600"><p className="text-[10px] text-red-600 font-bold uppercase">{error}</p></div>}
            <button type="submit" disabled={authLoading} className="w-full brutal-button-press brutal-border brutal-shadow-sm bg-[#00ff66] text-black font-black py-4 text-sm uppercase tracking-widest flex items-center justify-center gap-2">
              {authLoading && <Loader2 size={16} className="animate-spin" />}
              {isSignUp ? t.signUpBtn : t.loginBtn}
            </button>
          </form>
          <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-4 text-[11px] font-black uppercase underline hover:no-underline">
            {isSignUp ? t.switchLogin : t.switchSignUp}
          </button>
        </BrutalCard>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto h-screen p-4 md:p-8 flex flex-col gap-6 overflow-hidden">
      <header className="brutal-border brutal-shadow bg-black p-6 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#fff33b] brutal-border flex items-center justify-center text-black rotate-2">
            <LinkIcon size={32} strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tighter text-white uppercase italic leading-none">{t.title}</h1>
            <div className="flex items-center gap-2 mt-1">
               <span className={`text-[10px] px-2 py-0.5 font-bold uppercase ${isProductionConfigured ? 'bg-[#00ff66] text-black' : 'bg-red-500 text-white'}`}>
                 {isProductionConfigured ? t.statusCloud : t.statusLocal}
               </span>
               <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">VERSION 1.2.0</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2 mr-4 bg-white/10 p-1 pr-3 brutal-border border-white/20">
            <div className="w-8 h-8 brutal-border flex items-center justify-center bg-[#ff60d4] text-black font-bold text-xs">
              {session.user.email?.charAt(0).toUpperCase()}
            </div>
            <span className="text-[10px] font-bold text-white uppercase max-w-[120px] truncate">
              {session.user.email?.split('@')[0]}
            </span>
            <button onClick={async () => { if(supabase) await supabase.auth.signOut(); setSession(null); }} className="ml-2 p-1 hover:bg-red-500 hover:text-white text-red-400 transition-colors">
              <LogOut size={14} strokeWidth={3} />
            </button>
          </div>

          <button onClick={() => setLanguage(l => l === 'zh' ? 'en' : 'zh')} className="brutal-button-press brutal-border brutal-shadow-sm bg-white text-black px-4 py-2 text-xs font-bold uppercase">
            {language.toUpperCase()}
          </button>
          
          <div className="flex gap-2">
             {[
               {id: 'all', count: stats.total, label: t.filterAll, color: 'bg-white'},
               {id: 'unread', count: stats.unread, label: t.filterUnread, color: 'bg-[#ff60d4]'},
               {id: 'read', count: stats.read, label: t.filterRead, color: 'bg-[#32d6ff]'},
               {id: 'trash', count: stats.trash, label: t.filterTrash, color: 'bg-red-500', text: 'text-white'}
             ].map(filter => (
               <button key={filter.id} onClick={() => setActiveFilter(filter.id as FilterType)} className={`brutal-button-press brutal-border brutal-shadow-sm px-3 py-2 text-xs font-bold uppercase ${activeFilter === filter.id ? 'translate-x-1 translate-y-1 shadow-none bg-black text-white' : `${filter.color} ${filter.text || 'text-black'}`}`}>
                 {filter.label} <span className="ml-1 opacity-50">[{filter.count}]</span>
               </button>
             ))}
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8 overflow-hidden min-h-0">
        <div className="lg:col-span-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
          <BrutalCard bgColor="bg-[#32d6ff]">
            <div className="flex items-center gap-2 mb-4">
              <Search size={18} strokeWidth={3} />
              <h2 className="text-xs font-bold uppercase">{t.quickSearch}</h2>
            </div>
            <input type="text" placeholder={t.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border-black px-4 py-3 text-sm focus:outline-none font-bold" />
          </BrutalCard>

          <BrutalCard bgColor="bg-[#fff33b]">
            <div className="flex items-center gap-2 mb-4">
              <Plus size={18} strokeWidth={3} />
              <h2 className="text-xs font-bold uppercase">{t.saveContent}</h2>
            </div>
            <form onSubmit={handleAddLink} className="space-y-4">
              <input type="text" placeholder={t.titlePlaceholder} value={titleInput} onChange={(e) => setTitleInput(e.target.value)} className="w-full bg-white border-black px-4 py-3 text-sm focus:outline-none font-bold" disabled={isLoading} />
              <input type="text" placeholder={t.urlPlaceholder} value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="w-full bg-white border-black px-4 py-3 text-sm focus:outline-none font-bold" disabled={isLoading} />
              <button type="submit" disabled={isLoading || !urlInput.trim()} className="w-full brutal-button-press brutal-border brutal-shadow-sm bg-[#00ff66] text-black font-bold py-3 text-sm uppercase tracking-widest flex items-center justify-center gap-2">
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : t.addBtn}
              </button>
              {error && <p className="text-[10px] text-red-600 font-bold uppercase">{error}</p>}
            </form>
          </BrutalCard>

          {activeFilter === 'trash' && stats.trash > 0 && (
            <button onClick={emptyTrash} className="brutal-button-press brutal-border brutal-shadow-sm bg-red-600 text-white font-black py-4 text-xs uppercase flex items-center justify-center gap-2">
              <Trash size={16} /> {t.emptyTrash}
            </button>
          )}
        </div>

        <div className="lg:col-span-3 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between px-2 shrink-0">
            <h2 className="text-xl font-black uppercase flex items-center gap-2">
              <Layers size={20} />
              {activeFilter === 'trash' ? t.filterTrash : t.listTitle}
            </h2>
            <span className="text-[10px] font-bold uppercase opacity-50 bg-black text-white px-2 py-1">
              {t.itemsCount.replace('{count}', filteredLinks.length.toString())}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 pb-12">
            {filteredLinks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredLinks.map((link) => (
                  <LinkItemCard 
                    key={link.id} 
                    item={link} 
                    onToggleRead={toggleRead} 
                    onDelete={deleteToTrash}
                    onRestore={restoreFromTrash}
                    onPermanentDelete={permanentDelete}
                    onEditTitle={handleEditTitle}
                    lang={language}
                  />
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-4 opacity-20 py-20">
                <Bookmark size={80} strokeWidth={1} />
                <div className="text-center">
                  <p className="text-2xl font-black uppercase tracking-tighter">{t.noItems}</p>
                  <p className="text-sm font-bold uppercase">{t.noItemsDesc}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <footer className="shrink-0 pt-4 border-t-4 border-black flex flex-col md:flex-row justify-between items-center gap-2">
        <div className="text-[10px] font-black uppercase flex items-center gap-2">
          <div className="w-2 h-2 bg-[#00ff66] rounded-full animate-pulse"></div>
          {isProductionConfigured ? "CONNECTED TO SUPABASE REALTIME" : "RUNNING IN BROWSER CACHE MODE"}
        </div>
        <div className="flex items-center gap-4">
           <span className="text-[10px] font-black opacity-30 italic uppercase">© 2024 BRUTAL_READ_LATER</span>
           <div className="flex gap-1.5">
             <div className="w-3 h-3 bg-[#fff33b] brutal-border"></div>
             <div className="w-3 h-3 bg-[#ff60d4] brutal-border"></div>
             <div className="w-3 h-3 bg-[#32d6ff] brutal-border"></div>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
