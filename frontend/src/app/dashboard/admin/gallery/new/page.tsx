'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Image as ImageIcon, CheckCircle, XCircle, ArrowLeft, Upload, Loader2, Film } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';

export default function NewGalleryPostPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && !(user.role === 'collector' || user.role === 'secretariat_office')) {
      router.replace('/dashboard/admin/gallery');
    }
  }, [user, router]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!selectedFile) {
      setError('Please select a media file for the post.');
      return;
    }
    
    if (!formData.description) {
      setError('Please enter a description.');
      return;
    }

    setLoading(true);
    
    try {
      // 1. Upload the image/video first
      const uploadRes = await api.uploadFiles([selectedFile]);
      
      if (!uploadRes.success || !uploadRes.files || uploadRes.files.length === 0) {
        throw new Error('Upload failed');
      }
      
      const imageUrl = uploadRes.files[0].url;
      
      // 2. Create the post
      const postRes = await api.createPost({
        title: formData.title,
        description: formData.description,
        imageUrl: imageUrl
      });
      
      if (postRes.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard/admin/gallery');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div className="flex items-center gap-5 mb-10">
            <button 
              onClick={() => router.back()} 
              className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
            >
              <ArrowLeft size={20} className="text-gray-400 group-hover:text-white group-hover:-translate-x-0.5 transition-all" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Add Gallery Post</h1>
              <p className="text-gray-400 text-sm mt-1">Share new updates with your community.</p>
            </div>
          </div>

          <div className="glass-card relative overflow-hidden" style={{ padding: '40px', width: '100%' }}>
            {/* Background decorative glow */}
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-green-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            {error && (
              <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-fade-in">
                <XCircle size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-sm font-medium">{error}</p>
              </div>
            )}

            {success ? (
              <div className="flex flex-col items-center justify-center py-12 animate-fade-in text-center">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                  <CheckCircle size={40} className="text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Post Published!</h2>
                <p className="text-gray-400">The post is now live on the public gallery.</p>
                <div className="mt-6 flex items-center gap-2 text-gray-500 text-sm">
                  <div className="w-4 h-4 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
                  <span>Redirecting to gallery...</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                {/* Media Upload Area */}
                <div>
                  <label className="label mb-3">Upload Media*</label>
                  <div 
                    className={`border-2 border-dashed rounded-2xl transition-all duration-300 relative overflow-hidden flex flex-col items-center justify-center bg-[#0a120f] ${
                      previewUrl ? 'border-green-500/30' : 'border-green-900/40 hover:border-green-600/60 hover:bg-green-900/10 cursor-pointer min-h-[280px]'
                    }`}
                    onClick={() => !previewUrl && fileInputRef.current?.click()}
                  >
                    {previewUrl ? (
                      <div className="relative w-full">
                        {selectedFile?.type.startsWith('video') ? (
                          <video src={previewUrl} className="w-full max-h-96 object-contain bg-black/50" controls />
                        ) : (
                          <img src={previewUrl} alt="Preview" className="w-full max-h-96 object-contain bg-black/50" />
                        )}
                        <div className="absolute top-4 right-4 flex gap-2 font-sans">
                           <button 
                             type="button" 
                             onClick={(e) => { e.stopPropagation(); setPreviewUrl(''); setSelectedFile(null); }}
                             className="p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full shadow-lg backdrop-blur-md transition-all"
                           >
                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                           </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-full bg-green-900/30 flex items-center justify-center mb-4 text-green-400">
                          <Camera size={32} />
                        </div>
                        <p className="text-white font-medium mb-1">Click to browse or drag file here</p>
                        <p className="text-gray-500 text-xs">Supports JPG, PNG, WEBP, MP4 (Max 50MB)</p>
                      </>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/*,video/*" 
                      className="hidden" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="label">Title (Optional)</label>
                    <input
                      type="text"
                      placeholder="E.g., New Village Road Completed"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="label">Description*</label>
                    <textarea
                      rows={4}
                      placeholder="Share details about this update..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="input-field resize-none"
                      required
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex flex-col-reverse md:flex-row justify-end gap-4">
                  <button 
                    type="button" 
                    onClick={() => router.back()} 
                    className="btn-ghost"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading || !selectedFile} 
                    className="btn-primary flex items-center gap-3 justify-center min-w-[160px]"
                  >
                    {loading ? (
                       <Loader2 size={20} className="animate-spin" />
                    ) : (
                       <>
                         <Upload size={20} />
                         <span>Publish Update</span>
                       </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
    </div>
  );
}
