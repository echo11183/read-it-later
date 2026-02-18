
import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Search, Bookmark, Layers, Trash2, Link as LinkIcon, LogOut, Key, Mail, Lock, Loader2, ShieldCheck, Trash, RefreshCw, ZapOff, Database, Code, XCircle, ExternalLink, Settings } from 'lucide-react';
import { LinkItem, FilterType, Language } from './types';
import { getLinkMetadata } from './services/geminiService';
import { LinkItemCard } from './components/LinkItemCard';
import { BrutalCard } from './components/GlassCard';

const SUPABASE_URL = 'https://nfwyuwfgwznhygtpmfku.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5md3l1d2Znd3puaHlndHBtZmt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzOTI1NDQsImV4cCI6MjA4Njk2ODU0NH0.IL0XhR7AjU7XMXBDYGCM1Fz2-2EOdridh9OdRXcGw5k'; 

const isConfigured = SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 50;
const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

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
  const [showSetupManual, setShowSetupManual] = useState(false);
  const [error, setError] = useState<{message: string, isTableMissing?: boolean} | null>(null);

  const translations = {
    zh: {
      title: 'Read it later',
      loginBtn: '登录',
      signUpBtn: '注册',
      emailLabel: '邮箱',
      passwordLabel: '密码',
      logout: '退出',
      urlPlaceholder: '粘贴网址 https://...',
      titlePlaceholder: '自定义标题 (可选)',
      addBtn: '立即收藏',
      searchPlaceholder: '搜索收藏...',
      filterAll: '全部链接',
      filterUnread: '待读清单',
      filterRead: '已读归档',
      filterTrash: '回收站',
      noItems: '暂无收藏',
      noItemsDesc: '开始添加你的第一个灵感链接吧！',
      confirmDelete: '彻底删除？',
      emptyTrash: '清空回收站',
      tableMissing: '数据库初始化',
      copyScript: '复制代码',
      scriptReady: '已复制！',
      localModeBtn: '游客模式',
      statusCloud: '云端同步',
      statusLocal: '本地存储'
    },
    en: {
      title: 'Read it later',
      loginBtn: 'Login',
      signUpBtn: 'Sign Up',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      logout: 'Logout',
      urlPlaceholder: 'https://...',
      titlePlaceholder: 'Title (Optional)',
      addBtn: 'Save Link',
      searchPlaceholder: 'Search...',
      filterAll: 'All Items',
      filterUnread: 'Unread',
      filterRead: 'Read',
      filterTrash: 'Trash',
      noItems: 'Empty List',
      noItemsDesc: 'No links found here.',
      confirmDelete: 'Delete Forever?',
      emptyTrash: 'Empty Trash',
      tableMissing: 'Init Database',
      copyScript: 'Copy SQL',
      scriptReady: 'Copied!',
      localModeBtn: 'Guest Mode',
      statusCloud: 'Cloud Sync',
      statusLocal: 'Local'
    }
  };

  const t = translations[language];

  const sqlScript = `create table if not exists links (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  url text not null,
  title text,
  description text,
  summary text,
  is_read boolean default false,
  is_deleted boolean default false,
  created_at timestamp with time zone default now()
);
alter table links enable row level security;
drop policy if exists "Users can manage own links" on links;
create policy "Users can manage own links" on links for all using (auth.uid() = user_id) with check (auth.uid() = user_id);`;

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
    if (!supabase || session.user.id === 'local-user') {
      const saved = localStorage.getItem(`brutal-links-${session.user.id}`);
      if (saved) setLinks(JSON.parse(saved));
      return;
    }
    try {
      const { data, error: fetchError } = await supabase.from('links').select('*').order('created_at', { ascending: false });
      if (fetchError) {
        if (fetchError.code === '42P01' || fetchError.message.includes('relation')) {
          setError({ message: 'Table missing', isTableMissing: true });
          setShowSetupManual(true);
          return;
        }
        throw fetchError;
      }
      setLinks(data.map((item: any) => ({
        id: item.id, url: item.url, title: item.title, description: item.description,
        summary: item.summary, isRead: item.is_read, isDeleted: item.is_deleted, createdAt: new Date(item.created_at).getTime(),
      })));
      setError(null);
    } catch (err) { console.error(err); }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (supabase) {
        const { data, error: authError } = isSignUp 
          ? await supabase.auth.signUp({ email, password })
          : await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        if (data.session) setSession(data.session);
      } else { enterLocalMode(); }
    } catch (err: any) { setError({ message: err.message }); }
    finally { setAuthLoading(false); }
  };

  const enterLocalMode = () => {
    const mockSession = { user: { id: 'local-user', email: 'GUEST@LOCAL' } };
    localStorage.setItem('brutal-local-session', JSON.stringify(mockSession));
    setSession(mockSession);
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    let processedUrl = urlInput.trim();
    if (!/^https?:\/\//i.test(processedUrl)) processedUrl = `https://${processedUrl}`;

    try {
      setIsLoading(true);
      const metadata = await getLinkMetadata(processedUrl);
      if (supabase && session.user.id !== 'local-user') {
        const { data, error: insErr } = await supabase.from('links').insert([{
          user_id: session.user.id, url: processedUrl, title: titleInput.trim() || metadata.title,
          description: metadata.description, summary: metadata.summary
        }]).select();
        if (insErr) {
          if (insErr.code === '42P01') { setShowSetupManual(true); return; }
          throw insErr;
        }
        syncLinks([{ id: data[0].id, url: data[0].url, title: data[0].title, description: data[0].description, summary: data[0].summary, isRead: data[0].is_read, isDeleted: data[0].is_deleted, createdAt: new Date(data[0].created_at).getTime() }, ...links]);
      } else {
        syncLinks([{ id: crypto.randomUUID(), url: processedUrl, title: titleInput.trim() || metadata.title, description: metadata.description, summary: metadata.summary, isRead: false, isDeleted: false, createdAt: Date.now() }, ...links]);
      }
      setUrlInput(''); setTitleInput('');
    } catch (err: any) { setError({ message: err.message }); }
    finally { setIsLoading(false); }
  };

  const syncLinks = (newLinks: LinkItem[]) => {
    setLinks(newLinks);
    localStorage.setItem(`brutal-links-${session.user.id}`, JSON.stringify(newLinks));
  };

  const handleEditTitle = async (id: string, nt: string) => {
    if (supabase && session.user.id !== 'local-user') await supabase.from('links').update({ title: nt }).eq('id', id);
    syncLinks(links.map(l => l.id === id ? { ...l, title: nt } : l));
  };

  const toggleRead = async (id: string) => {
    const item = links.find(l => l.id === id);
    if (!item) return;
    if (supabase && session.user.id !== 'local-user') await supabase.from('links').update({ is_read: !item.isRead }).eq('id', id);
    syncLinks(links.map(l => l.id === id ? { ...l, isRead: !l.isRead } : l));
  };

  const deleteToTrash = async (id: string) => {
    if (supabase && session.user.id !== 'local-user') await supabase.from('links').update({ is_deleted: true }).eq('id', id);
    syncLinks(links.map(l => l.id === id ? { ...l, isDeleted: true } : l));
  };

  const filteredLinks = useMemo(() => {
    return links.filter(l => {
      const matchSearch = (l.title + l.url).toLowerCase().includes(searchQuery.toLowerCase());
      if (activeFilter === 'trash') return l.isDeleted && matchSearch;
      if (l.isDeleted) return false;
      if (activeFilter === 'unread') return !l.isRead && matchSearch;
      if (activeFilter === 'read') return l.isRead && matchSearch;
      return matchSearch;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [links, searchQuery, activeFilter]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <BrutalCard bgColor="bg-[#fff33b]" className="max-w-md w-full animate-slide-up">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-black text-[#00ff66] brutal-border flex items-center justify-center rotate-3 shadow-[4px_4px_0_0_#000]">
              <Key size={28} strokeWidth={3} />
            </div>
            <h1 className="text-3xl font-black uppercase italic italic tracking-tighter">{t.title}</h1>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white px-4 py-3 text-sm font-bold brutal-border" placeholder={t.emailLabel} required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white px-4 py-3 text-sm font-bold brutal-border" placeholder={t.passwordLabel} required />
            <button type="submit" disabled={authLoading} className="w-full brutal-button-press brutal-border bg-[#00ff66] text-black font-black py-4 uppercase">
              {authLoading ? <Loader2 className="animate-spin mx-auto" /> : (isSignUp ? t.signUpBtn : t.loginBtn)}
            </button>
          </form>
          <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-4 text-[10px] font-black uppercase underline">{isSignUp ? '已有账号？登录' : '没有账号？注册'}</button>
          <button onClick={enterLocalMode} className="w-full mt-4 text-[9px] font-bold uppercase opacity-50 flex items-center justify-center gap-1"><ZapOff size={10} /> {t.localModeBtn}</button>
        </BrutalCard>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#f0f0f0] flex flex-col overflow-hidden">
      {/* 顶部导航 */}
      <header className="bg-black text-white p-4 brutal-border-b flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="bg-[#fff33b] p-2 brutal-border rotate-3 shadow-[2px_2px_0_0_#fff]">
            <LinkIcon size={24} className="text-black" />
          </div>
          <h1 className="text-xl font-black uppercase italic tracking-tighter hidden sm:block">{t.title}</h1>
        </div>

        {/* 顶部筛选器 */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {[
            { id: 'all', label: t.filterAll, color: 'bg-white' },
            { id: 'unread', label: t.filterUnread, color: 'bg-[#ff60d4]' },
            { id: 'read', label: t.filterRead, color: 'bg-[#32d6ff]' },
            { id: 'trash', label: t.filterTrash, color: 'bg-red-500', textColor: 'text-white' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as FilterType)}
              className={`px-3 py-2 text-[10px] sm:text-xs font-black uppercase brutal-border transition-all ${activeFilter === f.id ? 'translate-y-1 bg-black text-white border-white' : `${f.color} ${f.textColor || 'text-black'} shadow-[2px_2px_0_0_#000]`}`}
            >
              {f.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button onClick={() => setLanguage(l => l === 'zh' ? 'en' : 'zh')} className="p-2 brutal-border bg-white text-black text-[10px] font-black">{language.toUpperCase()}</button>
          <button onClick={() => { localStorage.removeItem('brutal-local-session'); setSession(null); supabase?.auth.signOut(); }} className="p-2 brutal-border bg-red-500 text-white"><LogOut size={16} /></button>
        </div>
      </header>

      {/* 主界面 */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* 侧边功能区：搜索与添加 */}
        <aside className="w-full md:w-80 bg-white brutal-border-r p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 shrink-0">
          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase flex items-center gap-2"><Search size={14} /> {t.searchPlaceholder}</label>
             <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-4 py-3 text-sm font-bold brutal-border bg-zinc-50" placeholder="..." />
          </div>

          <BrutalCard bgColor="bg-[#fff33b]" className="p-4">
            <h3 className="text-xs font-black uppercase mb-3 flex items-center gap-2"><Plus size={16} /> {t.addBtn}</h3>
            <form onSubmit={handleAddLink} className="space-y-3">
              <input type="text" value={titleInput} onChange={(e) => setTitleInput(e.target.value)} className="w-full px-3 py-2 text-xs font-bold brutal-border" placeholder={t.titlePlaceholder} />
              <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="w-full px-3 py-2 text-xs font-bold brutal-border" placeholder={t.urlPlaceholder} required />
              <button type="submit" disabled={isLoading} className="w-full py-3 brutal-border bg-[#00ff66] text-black font-black uppercase text-xs shadow-[3px_3px_0_0_#000] brutal-button-press">
                {isLoading ? <Loader2 className="animate-spin mx-auto" size={16} /> : t.addBtn}
              </button>
            </form>
          </BrutalCard>

          <div className="mt-auto hidden md:block pt-6 border-t-2 border-dashed border-black">
             <div className="flex items-center gap-2 text-[10px] font-black uppercase opacity-50">
               <ShieldCheck size={12} />
               <span>{session.user.id !== 'local-user' ? t.statusCloud : t.statusLocal}</span>
             </div>
          </div>
        </aside>

        {/* 内容展示区 */}
        <section className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#e0e0e0]">
          {filteredLinks.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredLinks.map((link) => (
                <LinkItemCard 
                  key={link.id} 
                  item={link} 
                  onToggleRead={toggleRead} 
                  onDelete={deleteToTrash} 
                  onRestore={(id) => syncLinks(links.map(l => l.id === id ? { ...l, isDeleted: false } : l))}
                  onPermanentDelete={(id) => syncLinks(links.filter(l => l.id !== id))}
                  onEditTitle={handleEditTitle}
                  lang={language} 
                />
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-4">
              <Bookmark size={80} strokeWidth={3} />
              <div>
                <p className="text-2xl font-black uppercase tracking-tighter">{t.noItems}</p>
                <p className="text-sm font-bold uppercase">{t.noItemsDesc}</p>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* 初始化弹窗 */}
      {showSetupManual && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="max-w-2xl w-full bg-red-600 brutal-border border-[6px] p-8 text-white brutal-shadow relative">
              <button onClick={() => setShowSetupManual(false)} className="absolute -top-4 -right-4 bg-black p-2 brutal-border text-white">
                <XCircle size={24} />
              </button>
              <h3 className="font-black uppercase text-3xl mb-4 italic tracking-tighter">{t.tableMissing}</h3>
              <p className="bg-black/20 p-4 border-l-4 border-white mb-6 font-bold">请在 Supabase SQL Editor 运行以下代码：</p>
              <div className="bg-zinc-900 p-4 brutal-border text-[10px] text-[#00ff66] overflow-x-auto max-h-48 mb-6">
                <pre>{sqlScript}</pre>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(sqlScript); alert(t.scriptReady); }} className="w-full py-4 brutal-border bg-black text-white font-black uppercase flex items-center justify-center gap-2">
                <Code size={20} /> {t.copyScript}
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
