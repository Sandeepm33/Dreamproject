'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, Plus, Trash2, ArrowLeft, Loader2, PlayCircle, Video, Calendar, User, X } from 'lucide-react';
import { api, getFullImageUrl } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';

interface Post {
  _id: string;
  title?: string;
  description: string;
  imageUrl: string;
  createdBy: {
    _id: string;
    name: string;
    role: string;
  };
  createdAt: string;
}

// Sub-component for Gallery Card
const GalleryItemCard = ({ 
  post, 
  user, 
  deletingId, 
  onDelete, 
  onSelect 
}: { 
  post: Post, 
  user: any, 
  deletingId: string | null, 
  onDelete: (id: string) => void,
  onSelect: (post: Post) => void 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideo = post.imageUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) || post.imageUrl.startsWith('data:video');


  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div 
      className="glass-card overflow-hidden flex flex-col h-full border-white/5 shadow-2xl group hover:border-accent/30 transition-all duration-500 hover:-translate-y-2 cursor-pointer"
      onClick={() => onSelect(post)}
    >
      {/* Media Container */}
      <div className="relative h-60 overflow-hidden bg-black">
        {isVideo ? (
          <div className="w-full h-full relative" onClick={togglePlay}>
            <video 
              ref={videoRef}
              src={getFullImageUrl(post.imageUrl)} 
              className="w-full h-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
              muted
              loop
              playsInline
            />
            <div className={`absolute inset-0 flex items-center justify-center transition-all ${isPlaying ? 'bg-transparent' : 'bg-black/40'}`}>
              {!isPlaying ? (
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center scale-110 shadow-2xl">
                   <PlayCircle size={40} className="text-white fill-white/10" />
                </div>
              ) : (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                   <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center">
                      <div className="flex gap-1.5">
                        <div className="w-1.5 h-6 bg-white rounded-full"></div>
                        <div className="w-1.5 h-6 bg-white rounded-full"></div>
                      </div>
                   </div>
                </div>
              )}
            </div>
            {/* Status Label */}
            <div className="absolute bottom-4 left-4 z-10">
              <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${isPlaying ? 'bg-green-500/20 text-green-400 border-green-500/20' : 'bg-white/5 text-white/50 border-white/10'}`}>
                {isPlaying ? 'Playing Preview' : 'Preview Paused'}
              </span>
            </div>
          </div>
        ) : (
          <img 
            src={getFullImageUrl(post.imageUrl)} 
            alt={post.title} 
            className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 opacity-90 group-hover:opacity-100 "
            onError={(e) => { (e.target as HTMLImageElement).src = '/village-placeholder.jpg' }}
          />
        )}
        
        {/* Delete Button - Overlay */}
        {((user?.role === 'collector' || user?.role === 'secretariat_office') || post.createdBy?._id === user?._id) && (
          <div className="absolute top-4 right-4 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-20">
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(post._id); }}
              disabled={deletingId === post._id}
              className="w-10 h-10 flex items-center justify-center bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-xl backdrop-blur-md transition-all border border-red-500/20 shadow-xl"
            >
              {deletingId === post._id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={18} />}
            </button>
          </div>
        )}

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
  );
};

export default function GalleryManagementPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

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
    return url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) || url.startsWith('data:video');
  };


  return (
    <div className="animate-fade-in">
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
            
            {(user?.role === 'collector' || user?.role === 'secretariat_office') && (
              <button 
                onClick={() => router.push('/dashboard/admin/gallery/new')}
                className="btn-primary flex items-center gap-3 px-8 py-4 shadow-[0_10px_30px_rgba(45,106,79,0.3)] hover:scale-105 active:scale-95 transition-all text-base"
              >
                <Plus size={20} strokeWidth={3} />
                <span>Add New Update</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col justify-center items-center h-[50vh] gap-4">
              <div className="w-10 h-10 border-2 border-primary-light/30 border-t-primary-light rounded-full animate-spin"></div>
              <p className="text-text-muted text-xs uppercase tracking-widest font-semibold">Loading Gallery...</p>
            </div>
          ) : posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {posts.map((post) => (
                <GalleryItemCard 
                  key={post._id} 
                  post={post} 
                  user={user} 
                  deletingId={deletingId} 
                  onDelete={handleDelete} 
                  onSelect={setSelectedPost} 
                />
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
                  
                  {(user?.role === 'collector' || user?.role === 'secretariat_office') && (
                    <button 
                      onClick={() => router.push('/dashboard/admin/gallery/new')}
                      className="btn-primary flex items-center gap-3 px-10 py-4 shadow-xl group"
                    >
                      <Plus size={20} className="text-white group-hover:rotate-90 transition-transform duration-300" strokeWidth={3} />
                      <span>Post First Gallery Item</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      {/* Lightbox / Media Modal */}
      {selectedPost && (
        <div 
          className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setSelectedPost(null)}
        >
          <button 
            className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors p-3 bg-white/5 rounded-full hover:bg-white/10"
            onClick={(e) => { e.stopPropagation(); setSelectedPost(null); }}
          >
            <X size={28} />
          </button>

          <div 
            className="relative max-w-5xl w-full flex flex-col gap-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full rounded-3xl overflow-hidden shadow-2xl bg-black border border-white/10">
              {isVideo(selectedPost.imageUrl) ? (
                <video 
                  src={getFullImageUrl(selectedPost.imageUrl)}
                  controls
                  autoPlay
                  className="w-full max-h-[70vh] block"
                />
              ) : (
                <img 
                  src={getFullImageUrl(selectedPost.imageUrl)}
                  alt={selectedPost.title}
                  className="w-full max-h-[70vh] object-contain block"
                />
              )}
            </div>

            <div className="text-center px-4">
              {selectedPost.title && <h2 className="text-3xl font-extrabold text-white mb-4 tracking-tight">{selectedPost.title}</h2>}
              <p className="text-gray-400 text-lg leading-relaxed max-w-2xl mx-auto">{selectedPost.description}</p>
              
              <div className="mt-8 flex items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white font-black">
                  {selectedPost.createdBy?.name?.charAt(0) || 'A'}
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-white leading-tight">{selectedPost.createdBy?.name}</p>
                  <p className="text-[10px] text-accent font-black uppercase tracking-widest mt-1">Village Admin</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
