'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import WeatherWidget from '@/components/WeatherWidget';
import MapComponent from '@/components/MapComponent';
import { Activity, Users, Shield, ArrowRight, Image as ImageIcon, PlayCircle, Map, X, Globe, Calendar } from 'lucide-react';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { PanchayatSahayak } from '@/components/PanchayatSahayak';

// Type for Post
interface Post {
  _id: string;
  title?: string;
  description: string;
  imageUrl: string;
  createdBy: {
    _id?: string;
    name: string;
    role: string;
  };
  createdAt: string;
}

// Sub-component for Gallery Card
const GalleryCard = ({ post, onSelect }: { post: Post, onSelect: (post: Post) => void }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const isVideo = post.imageUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) || post.imageUrl.startsWith('data:video');
  const mediaUrl = post.imageUrl.startsWith('http') ? post.imageUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${post.imageUrl}`;

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
      style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 20 }}
      onClick={() => onSelect(post)}
    >
      <div style={{ position: 'relative', height: 256, width: '100%', overflow: 'hidden', background: '#000' }}>
        {isVideo ? (
          <div style={{ width: '100%', height: '100%', position: 'relative' }} onClick={togglePlay}>
            <video
              ref={videoRef}
              src={mediaUrl}
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isPlaying ? 1 : 0.7, transition: 'opacity 0.3s' }}
              muted
              loop
              playsInline
            />
            <div 
              style={{ 
                position: 'absolute', 
                inset: 0, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: isPlaying ? 'transparent' : 'rgba(0,0,0,0.4)', 
                transition: 'all 0.3s ease' 
              }}
            >
              {!isPlaying ? (
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'scale(1.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                  <PlayCircle size={40} color="white" fill="rgba(255,255,255,0.1)" />
                </div>
              ) : (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <div style={{ width: 4, height: 18, background: 'white', borderRadius: 2 }}></div>
                      <div style={{ width: 4, height: 18, background: 'white', borderRadius: 2 }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Status Label */}
            <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 10 }}>
              <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 10px', borderRadius: 99, border: isPlaying ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255,255,255,0.1)', background: isPlaying ? 'rgba(20, 83, 45, 0.4)' : 'rgba(0,0,0,0.4)', color: isPlaying ? '#4ade80' : 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)' }}>
                {isPlaying ? 'Playing Preview' : 'Preview Paused'}
              </span>
            </div>
          </div>
        ) : (
          <img
            src={mediaUrl}
            alt={post.title || "Gallery Post"}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 1s ease' }}
            className="group-hover:scale-110"
            onError={(e) => { (e.target as HTMLImageElement).src = '/village-placeholder.jpg' }}
          />
        )}
        <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', padding: '6px 12px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={12} color="#4ade80" />
          <span style={{ fontSize: 10, fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 12, letterSpacing: '-0.01em' }}>
          {post.title || 'Village Update'}
        </h3>
        <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.7, marginBottom: 24, flex: 1 }}>
          {post.description}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #14532d, #064e3b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
              {post.createdBy?.name?.charAt(0) || 'A'}
            </div>
            <div>
              <p style={{ fontSize: 12, color: 'white', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{post.createdBy?.name || 'Admin'}</p>
              <p style={{ fontSize: 10, color: '#4ade80', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 0.5, margin: 0 }}>{post.createdBy?.role || 'Admin'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function HomePage() {
  const { user, loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    // If logged in, we redirect to dashboard on mobile for better UX
    // But we use a check to ensure we don't redirect if the user purposefully came back to home
    if (!loading && user) {
      const dashboardRole = (user.role === 'panchayat_secretary' || user.role === 'collector') ? 'admin' : user.role;
      router.push(`/dashboard/${dashboardRole}`);
      return;
    }

    const fetchPosts = async () => {
      try {
        const response = await api.getPosts();
        setPosts(response.data);
      } catch (err) {
        console.error('Failed to fetch posts:', err);
      } finally {
        setLoadingPosts(false);
      }
    };
    fetchPosts();
  }, [user, loading, router]);

  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div style={{ backgroundColor: '#0a0f0d', minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column', fontFamily: '"Inter", sans-serif' }}>
      <PublicNavbar />

      {/* Hero Section */}
      <section id="home" style={{ position: 'relative', minHeight: '100vh', padding: '180px 0 100px 0', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        {/* Background Elements */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
          {/* Main Background Video */}
          <video
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 50
            }}
          >
            <source src="/homebanner.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          {/* Overlay to ensure text readability */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10, 15, 13, 0.7) 0%, rgba(10, 15, 13, 0.4) 50%, rgba(10, 15, 13, 0.9) 100%)', zIndex: 1 }}></div>
          {/* Accent glow blobs */}
          <div className="animate-float" style={{ position: 'absolute', top: '15%', left: '5%', width: '40%', height: '40%', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', filter: 'blur(120px)' }}></div>
          <div className="animate-float" style={{ position: 'absolute', bottom: '10%', right: '5%', width: '35%', height: '35%', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.08)', filter: 'blur(120px)', animationDelay: '1s' }}></div>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 10, width: '100%' }}>
          <div className="animate-fade-in-up" style={{ textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
            <div className="glass-card" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 999, marginBottom: 32, border: '1px solid rgba(34, 197, 94, 0.4)', background: 'rgba(20, 83, 45, 0.2)' }}>
              <span className="animate-pulse-glow" style={{ display: 'block', height: 8, width: 8, borderRadius: '50%', background: '#22c55e' }}></span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: 1.5 }}>{t('digitalRevolution')}</span>
            </div>

            <h1 style={{ fontSize: 'clamp(44px, 7vw, 84px)', fontWeight: 800, marginBottom: 28, letterSpacing: '-0.03em', lineHeight: 1.05, fontFamily: 'Poppins' }}>
              {t('transforming')} <span style={{ color: '#4ade80' }}>{t('rural')}</span> <br />
              <span style={{ background: 'linear-gradient(to right, #4ade80, #f59e0b, #4ade80)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'gradient-shift 5s linear infinite' }}>
                {t('governanceHero')}
              </span>
            </h1>

            <p style={{ fontSize: 'clamp(17px, 2.2vw, 22px)', color: '#d1d5db', marginBottom: 48, maxWidth: 720, margin: '0 auto 48px auto', lineHeight: 1.6, fontWeight: 400 }}>
              {t('heroSub')}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 20, minHeight: 64 }}>
              {loading ? (
                <div style={{ width: 40, height: 40, border: '3px solid rgba(34, 197, 94, 0.3)', borderTopColor: '#4ade80', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              ) : user ? (
                <button
                  onClick={() => {
                    const dashboardRole = (user.role === 'panchayat_secretary' || user.role === 'collector') ? 'admin' : user.role;
                    router.push(`/dashboard/${dashboardRole}`);
                  }}
                  className="btn-primary"
                  style={{ padding: '18px 40px', fontSize: 17, display: 'flex', alignItems: 'center', gap: 12, borderRadius: 16, background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)', boxShadow: '0 10px 30px rgba(34, 197, 94, 0.4)', transition: 'all 0.3s ease' }}
                >
                  {t('enterDashboard')} <ArrowRight size={22} />
                </button>
              ) : (
                <button onClick={() => router.push('/login')} className="btn-primary" style={{ padding: '18px 40px', fontSize: 17, display: 'flex', alignItems: 'center', gap: 12, borderRadius: 16, background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)', boxShadow: '0 10px 30px rgba(34, 197, 94, 0.4)', transition: 'all 0.3s ease' }}>
                  {t('getStarted')} <ArrowRight size={22} />
                </button>
              )}
              <button
                onClick={() => { document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }) }}
                className="btn-primary"
                style={{ padding: '18px 40px', fontSize: 17, display: 'flex', alignItems: 'center', gap: 12, borderRadius: 16, background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)', boxShadow: '0 10px 30px rgba(34, 197, 94, 0.4)', transition: 'all 0.3s ease' }}
              >
                {t('learnMore')}
              </button>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#4ade80', opacity: 0.6 }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>{t('explore')}</span>
          <div className="animate-float" style={{ width: 2, height: 40, background: 'linear-gradient(to bottom, #4ade80, transparent)', borderRadius: 1 }}></div>
        </div>
      </section>

      {/* Weather Forecast Section */}
      <section style={{ padding: '80px 0 0', backgroundColor: '#0c120f', position: 'relative', borderTop: '1px solid rgba(20, 83, 45, 0.3)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: 8, color: '#38bdf8', fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase' }}>{t('liveUpdates')}</div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, marginBottom: 16, fontFamily: 'Poppins', color: 'white' }}>{t('meteorological')} <span style={{ color: '#38bdf8' }}>{t('forecast')}</span></h2>
              <p style={{ color: '#9ca3af', maxWidth: 650, margin: '0 auto', fontSize: 16, lineHeight: 1.6 }}>{t('weatherSub')}</p>
            </div>
            <div style={{ width: '100%' }}>
              <WeatherWidget />
            </div>
          </div>
        </div>
      </section>


      {/* Services/Features Section */}
      <section id="services" style={{ padding: '120px 0', backgroundColor: '#0c120f', position: 'relative' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <div style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 8, color: '#f59e0b', fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase' }}>{t('resources')}</div>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, marginBottom: 20, fontFamily: 'Poppins', color: 'white' }}>{t('smart')} <span style={{ color: '#f59e0b' }}>{t('egovTitle')}</span></h2>
            <p style={{ color: '#9ca3af', maxWidth: 650, margin: '0 auto', fontSize: 18, lineHeight: 1.7 }}>{t('egovSub')}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 32 }}>
            {/* Feature 1 */}
            <div className="glass-card glass-card-hover group" style={{ padding: '54px 40px', borderRadius: 28, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: '#60a5fa' }}></div>
              <div style={{ width: 70, height: 70, borderRadius: 20, background: 'rgba(30, 58, 138, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 36, transition: 'all 0.5s ease' }} className="group-hover:scale-110">
                <Shield size={36} color="#60a5fa" />
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: 'white' }}>{t('issueTracking')}</h3>
              <p style={{ color: '#9ca3af', lineHeight: 1.8, fontSize: 16 }}>
                {t('issueTrackingSub')}
              </p>
            </div>
            {/* Feature 2 */}
            <div className="glass-card glass-card-hover group" style={{ padding: '54px 40px', borderRadius: 28, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: '#fbbf24' }}></div>
              <div style={{ width: 70, height: 70, borderRadius: 20, background: 'rgba(120, 53, 15, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 36, transition: 'all 0.5s ease' }} className="group-hover:scale-110">
                <Activity size={36} color="#fbbf24" />
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: 'white' }}>{t('smartPolling')}</h3>
              <p style={{ color: '#9ca3af', lineHeight: 1.8, fontSize: 16 }}>
                {t('smartPollingSub')}
              </p>
            </div>
            {/* Feature 3 */}
            <div className="glass-card glass-card-hover group" style={{ padding: '54px 40px', borderRadius: 28, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: '#4ade80' }}></div>
              <div style={{ width: 70, height: 70, borderRadius: 20, background: 'rgba(20, 83, 45, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 36, transition: 'all 0.5s ease' }} className="group-hover:scale-110">
                <Users size={36} color="#4ade80" />
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: 'white' }}>{t('adminPortalLanding')}</h3>
              <p style={{ color: '#9ca3af', lineHeight: 1.8, fontSize: 16 }}>
                {t('adminPortalSub')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" style={{ padding: '120px 0', position: 'relative', background: '#0a0f0d' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 64 }}>
            {/* Image Side */}
            <div style={{ flex: '1 1 450px', position: 'relative' }}>
              <div className="animate-float" style={{ position: 'absolute', top: -20, left: -20, width: 100, height: 100, border: '2px solid rgba(74, 222, 128, 0.2)', borderRadius: 20, zIndex: 0 }}></div>
              <div className="animate-float" style={{ position: 'absolute', bottom: -20, right: -20, width: 150, height: 150, background: 'rgba(245, 158, 11, 0.05)', borderRadius: '50%', filter: 'blur(40px)', zIndex: 0, animationDelay: '1.5s' }}></div>

              <div style={{ position: 'relative', zIndex: 1, borderRadius: 32, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <img
                  src={language === 'te' ? "/about-us-te.png" : "/about-us.png"}
                  alt={t('adminAlt')}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,15,13,0.4), transparent)' }}></div>
              </div>

              <div className="glass-card shadow-xl" style={{ position: 'absolute', top: 20, right: 20, padding: '24px 32px', zIndex: 2, borderRadius: 20, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#f59e0b', marginBottom: 4 }}>100%</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>{t('digitalTransparency')}</div>
              </div>
            </div>

            {/* Text Side */}
            <div style={{ flex: '1 1 500px' }}>
              <div style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: 8, color: '#4ade80', fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase' }}>{t('ourMission')}</div>
              <h2 style={{ fontSize: 'clamp(32px, 4.5vw, 44px)', fontWeight: 800, marginBottom: 24, lineHeight: 1.2 }}>{t('pioneeringDigital')} <br /><span style={{ color: '#4ade80' }}>{t('villageGov')}</span></h2>

              <p style={{ color: '#9ca3af', fontSize: 17, lineHeight: 1.8, marginBottom: 24 }}>
                {t('missionPart1')}
              </p>

              <p style={{ color: '#9ca3af', fontSize: 17, lineHeight: 1.8, marginBottom: 32 }}>
                {t('missionPart2')}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ color: '#4ade80', paddingTop: 4 }}><Shield size={20} /></div>
                  <div>
                    <h4 style={{ color: 'white', fontWeight: 700, marginBottom: 4 }}>{t('secured')}</h4>
                    <p style={{ color: '#6b7280', fontSize: 13 }}>{t('securedSub')}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ color: '#f59e0b', paddingTop: 4 }}><Users size={20} /></div>
                  <div>
                    <h4 style={{ color: 'white', fontWeight: 700, marginBottom: 4 }}>{t('inclusive')}</h4>
                    <p style={{ color: '#6b7280', fontSize: 13 }}>{t('inclusiveSub')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Gallery Section */}
      <section id="gallery" style={{ padding: '96px 0', position: 'relative' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48 }}>
            <div>
              <h2 style={{ fontSize: 'clamp(30px, 4vw, 40px)', fontWeight: 800, marginBottom: 16, fontFamily: 'Poppins', color: 'white' }}>{t('villageLabelGallery')} <span style={{ color: '#22c55e' }}>{t('galleryLabel')}</span></h2>
              <p style={{ color: '#9ca3af', maxWidth: 600, fontSize: 16, lineHeight: 1.6 }}>{t('gallerySub')}</p>
            </div>
            <div style={{ marginTop: 24 }}>
              {/* Gallery management moved to dashboard */}
            </div>
          </div>

          {loadingPosts ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256 }}>
              <div style={{ width: 48, height: 48, border: '4px solid rgba(34, 197, 94, 0.3)', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
          ) : posts.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 32 }}>
              {posts.map((post) => (
                <GalleryCard key={post._id} post={post} onSelect={setSelectedPost} />
              ))}
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 48, textAlign: 'center', borderRadius: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(20, 83, 45, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <ImageIcon size={32} color="rgba(34, 197, 94, 0.5)" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 8 }}>{t('noPostsYet')}</h3>
              <p style={{ color: '#9ca3af' }}>{t('postsAppearing')}</p>
            </div>
          )}
        </div>
      </section>



      <PublicFooter />

      {/* Floating Map Toggle Button */}
      {!isChatOpen && (
        <button
          onClick={() => setShowMap(!showMap)}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 32,
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: showMap ? '#ef4444' : 'linear-gradient(135deg, #22c55e, #14532d)',
            border: 'none',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 9999,
            boxShadow: showMap ? '0 10px 40px rgba(239, 68, 68, 0.4)' : '0 10px 40px rgba(34, 197, 94, 0.4)',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
          className="hover-scale"
          title={showMap ? t('close') : t('clickForMap')}
        >
          {showMap ? <X size={28} /> : <Globe size={28} />}
        </button>
      )}

      {/* Floating Map Section / Modal */}
      {showMap && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          backgroundColor: 'rgba(5, 10, 8, 0.95)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          padding: '40px',
          animation: 'fade-in 0.4s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: 'white' }}>{t('villageLabelGallery')} <span style={{ color: '#22c55e' }}>{t('digitalTwinLabel')}</span></h2>
              <p style={{ color: '#9ca3af' }}>{t('geoViz')}</p>
            </div>
            <button
              onClick={() => setShowMap(false)}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px 24px', borderRadius: 12, cursor: 'pointer', fontWeight: 600 }}
            >
              {t('closeView')}
            </button>
          </div>
          <div style={{ flex: 1, borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
            <MapComponent />
          </div>
        </div>
      )}
      {/* Lightbox / Media Modal */}
      {selectedPost && (
        <div 
          className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setSelectedPost(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 10000, backgroundColor: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <button 
            style={{ position: 'absolute', top: 40, right: 40, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10001, transition: 'all 0.3s' }}
            onMouseOver={(e) => e.currentTarget.style.color = 'white'}
            onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
            onClick={(e) => { e.stopPropagation(); setSelectedPost(null); }}
          >
            <X size={32} />
          </button>

          <div 
            style={{ position: 'relative', maxWidth: '1100px', width: '100%', display: 'flex', flexDirection: 'column', gap: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: '100%', borderRadius: 32, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.8)', background: '#000', border: '1px solid rgba(255,255,255,0.1)' }}>
              {selectedPost.imageUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) || selectedPost.imageUrl.startsWith('data:video') ? (
                <video 
                  src={selectedPost.imageUrl.startsWith('http') ? selectedPost.imageUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${selectedPost.imageUrl}`}
                  controls
                  autoPlay
                  style={{ width: '100%', maxHeight: '70vh', display: 'block' }}
                />
              ) : (
                <img 
                  src={selectedPost.imageUrl.startsWith('http') ? selectedPost.imageUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${selectedPost.imageUrl}`}
                  alt={selectedPost.title}
                  style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', display: 'block' }}
                />
              )}
            </div>

            <div style={{ textAlign: 'center', padding: '0 20px' }}>
              {selectedPost.title && <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: 'white', marginBottom: 16, letterSpacing: '-0.02em' }}>{selectedPost.title}</h2>}
              <p style={{ color: '#9ca3af', fontSize: 'clamp(16px, 2vw, 18px)', lineHeight: 1.8, maxWidth: 850, margin: '0 auto' }}>{selectedPost.description}</p>
              
              <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg, #14532d, #064e3b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'white', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }}>
                  {selectedPost.createdBy?.name?.charAt(0) || 'A'}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 16, fontWeight: 900, color: 'white', margin: 0 }}>{selectedPost.createdBy?.name}</p>
                  <p style={{ fontSize: 12, color: '#4ade80', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>{selectedPost.createdBy?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <PanchayatSahayak onToggle={setIsChatOpen} />
    </div>
  );
}
