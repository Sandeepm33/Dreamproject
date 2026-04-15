'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, Plus, Trash2, ArrowLeft, Loader2, PlayCircle, Video, Calendar, User } from 'lucide-react';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';

interface Post {
  _id: string;
  title?: string;
  description: string;
  imageUrl: string;
  createdBy: {
    name: string;
    role: string;
  };
  createdAt: string;
}

export default function GalleryManagementPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPosts = async () => {
    try {
      const response = await api.getPosts();
      setPosts(response.data);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    setDeletingId(id);
    try {
      const res = await api.deletePost(id);
      if (res.success) {
        setPosts(posts.filter(p => p._id !== id));
      }
    } catch (err) {
      alert('Failed to delete post');
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const isVideo = (url: string) => {
    return url.match(/\.(mp4|webm|ogg|mov)$|^data:video/i);
  };

  const getMediaUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    const base = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${base}${url}`;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 280, padding: '40px', transition: 'margin 0.3s', minHeight: '100vh' }}>
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div 
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8"
            style={{ marginBottom: '60px' }}
          >
            <div className="flex items-center gap-6">
              <button 
                onClick={() => router.back()} 
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 hover:border-accent/40 text-gray-400 hover:text-accent transition-all duration-300 shadow-lg"
              >
                <ArrowLeft size={22} />
              </button>
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight font-sans">Village Gallery</h1>
                <p className="text-gray-400 text-sm mt-2 font-medium">Manage visual updates, photos and video highlights for your village.</p>
              </div>
            </div>
            
            <button 
              onClick={() => router.push('/dashboard/admin/gallery/new')}
              className="btn-primary flex items-center gap-3 px-8 py-4 shadow-[0_10px_30px_rgba(45,106,79,0.3)] hover:scale-105 active:scale-95 transition-all text-base"
            >
              <Plus size={20} strokeWidth={3} />
              <span>Add New Update</span>
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col justify-center items-center h-[50vh] gap-4">
              <div className="w-10 h-10 border-2 border-primary-light/30 border-t-primary-light rounded-full animate-spin"></div>
              <p className="text-text-muted text-xs uppercase tracking-widest font-semibold">Loading Gallery...</p>
            </div>
          ) : posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {posts.map((post) => (
                <div key={post._id} className="glass-card overflow-hidden flex flex-col h-full border-white/5 shadow-2xl group hover:border-accent/30 transition-all duration-500 hover:-translate-y-2">
                  {/* Media Container */}
                  <div className="relative h-60 overflow-hidden bg-black">
                    {isVideo(post.imageUrl) ? (
                      <div className="w-full h-full relative">
                        <video 
                          src={getMediaUrl(post.imageUrl)} 
                          className="w-full h-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                          muted
                          playsInline
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-all">
                          <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                             <PlayCircle size={32} className="text-white fill-white/10" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={getMediaUrl(post.imageUrl)} 
                        alt={post.title} 
                        className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 opacity-90 group-hover:opacity-100 "
                        onError={(e) => { (e.target as HTMLImageElement).src = '/village-placeholder.jpg' }}
                      />
                    )}
                    
                    {/* Delete Button - Overlay */}
                    <div className="absolute top-4 right-4 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <button 
                        onClick={() => handleDelete(post._id)}
                        disabled={deletingId === post._id}
                        className="w-10 h-10 flex items-center justify-center bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-xl backdrop-blur-md transition-all border border-red-500/20 shadow-xl"
                      >
                        {deletingId === post._id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={18} />}
                      </button>
                    </div>

                    <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                       <Calendar size={12} className="text-accent" />
                       <span className="text-[10px] font-black text-white uppercase tracking-widest">
                         {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                       </span>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="flex flex-col flex-1" style={{ padding: '25px 25px 25px 25px' }}>
                    <h3 className="text-xl font-extrabold text-white mb-4 line-clamp-1 group-hover:text-accent transition-colors tracking-tight">
                      {post.title || 'Village Update'}
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed mb-8 line-clamp-3 font-medium">
                      {post.description}
                    </p>
                    
                    <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-black text-sm shadow-inner group-hover:scale-110 transition-transform">
                          {post.createdBy?.name?.charAt(0) || 'A'}
                        </div>
                        <div>
                          <p className="text-xs font-black text-white leading-none mb-1.5">{post.createdBy?.name || 'Admin'}</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Village Admin</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div 
                className="glass-card w-full max-w-2xl text-center relative overflow-hidden group"
                style={{ padding: '60px 60px' }}
              >
                {/* Visual accents */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-accent to-transparent"></div>
                
                <div className="flex flex-col items-center relative z-10">
                  <div className="w-24 h-24 bg-primary-light/10 rounded-[32px]   border border-primary-light/20 flex items-center justify-center mb-14 group-hover:scale-110 transition-all duration-700" style={{marginBottom:"40px"}}>
                   
                    <ImageIcon size={48} className="text-primary-light" />
                  </div>
                  
                  <h2 className="text-4xl font-black text-white mb-6  mt-12 tracking-tight">No Visual Updates</h2>
                  <p 
                    className="text-gray-400 text-lg mb-14 max-w-lg mx-auto font-medium"
                    style={{ lineHeight: '2.5', letterSpacing: '0.01em' }}
                  >
                    Your gallery is currently empty. Start building your village's digital legacy by sharing photos or videos of progress and local events.
                  </p>
                  
                  <button 
                    onClick={() => router.push('/dashboard/admin/gallery/new')}
                    className="btn-primary flex items-center gap-3 px-10 py-4 shadow-xl group"
                  >
                    <Plus size={20} className="text-white group-hover:rotate-90 transition-transform duration-300" strokeWidth={3} />
                    <span>Post First Gallery Item</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
