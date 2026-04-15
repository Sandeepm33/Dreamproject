'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import WeatherWidget from '@/components/WeatherWidget';
import { Activity, Users, Shield, ArrowRight, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { api } from '@/lib/api';

// Type for Post
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

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    // If logged in, we let them view the home page now, but they can click "Go to Dashboard"
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
  }, []);

  return (
    <div style={{ backgroundColor: '#0a0f0d', minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column', fontFamily: '"Inter", sans-serif' }}>
      <PublicNavbar />
      
      {/* Hero Section */}
      <section id="home" style={{ position: 'relative', minHeight: '100vh', padding: '180px 0 100px 0', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        {/* Background Elements */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
          {/* Main Background Image */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url("https://scontent.fhyd2-3.fna.fbcdn.net/v/t39.30808-6/475859664_930808729197206_1196264856624934726_n.jpg?_nc_cat=102&ccb=1-7&_nc_sid=2a1932&_nc_ohc=DaQxBL1xzuQQ7kNvwG1EhBo&_nc_oc=AdrZPsHpuC1sG0opMX-eyYsfwNZs5R2BisImeUThPFGy7qQbEkcoWLojxu-DlzXj7ts&_nc_zt=23&_nc_ht=scontent.fhyd2-3.fna&_nc_gid=2PYdx7WRbVxSUigWoDvGTw&_nc_ss=7a389&oh=00_Af1CaaOSZvXYBkHwaV0kVLEk0sQb3GQf5uVI2D9SirXhvQ&oe=69E53361")', backgroundSize: '100% 100%', backgroundPosition: 'center', }}></div>
          {/* Gradients to blend into the rest of the dark site */}
          {/* <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, transparent 0%, rgba(10, 15, 13, 0.8) 70%, rgba(10, 15, 13, 1) 100%)' }}></div> */}
          {/* Accent glow blobs */}
          <div className="animate-float" style={{ position: 'absolute', top: '15%', left: '5%', width: '40%', height: '40%', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', filter: 'blur(120px)' }}></div>
          <div className="animate-float" style={{ position: 'absolute', bottom: '10%', right: '5%', width: '35%', height: '35%', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.08)', filter: 'blur(120px)', animationDelay: '1s' }}></div>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 10, width: '100%' }}>
          <div className="animate-fade-in-up" style={{ textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
            <div className="glass-card" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 999, marginBottom: 32, border: '1px solid rgba(34, 197, 94, 0.4)', background: 'rgba(20, 83, 45, 0.2)' }}>
              <span className="animate-pulse-glow" style={{ display: 'block', height: 8, width: 8, borderRadius: '50%', background: '#22c55e' }}></span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: 1.5 }}>Digital Revolution in Rural India</span>
            </div>
            
            <h1 style={{ fontSize: 'clamp(44px, 7vw, 84px)', fontWeight: 800, marginBottom: 28, letterSpacing: '-0.03em', lineHeight: 1.05, fontFamily: 'Poppins' }}>
              Transforming <span style={{ color: '#4ade80' }}>Rural</span> <br />
              <span style={{ background: 'linear-gradient(to right, #4ade80, #f59e0b, #4ade80)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'gradient-shift 5s linear infinite' }}>
                Governance
              </span>
            </h1>
            
            <p style={{ fontSize: 'clamp(17px, 2.2vw, 22px)', color: '#d1d5db', marginBottom: 48, maxWidth: 720, margin: '0 auto 48px auto', lineHeight: 1.6, fontWeight: 400 }}>
              Connecting citizens with administration through a unified digital platform. Experience transparency, efficiency, and empowerment at your fingertips.
            </p>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 20 }}>
              {!loading && user ? (
                <button 
                  onClick={() => {
                    const dashboardRole = (user.role === 'panchayat_secretary' || user.role === 'collector') ? 'admin' : user.role;
                    router.push(`/dashboard/${dashboardRole}`);
                  }} 
                  className="btn-primary" 
                  style={{ padding: '18px 40px', fontSize: 17, display: 'flex', alignItems: 'center', gap: 12, borderRadius: 16, boxShadow: '0 10px 30px rgba(34, 197, 94, 0.25)' }}
                >
                  Enter Dashboard <ArrowRight size={22} />
                </button>
              ) : (
                <button onClick={() => router.push('/login')} className="btn-primary" style={{ padding: '18px 40px', fontSize: 17, display: 'flex', alignItems: 'center', gap: 12, borderRadius: 16, boxShadow: '0 10px 30px rgba(34, 197, 94, 0.25)' }}>
                  Get Started Now <ArrowRight size={22} />
                </button>
              )}
              <button 
                onClick={() => {document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}} 
                className="glass-card glass-card-hover" 
                style={{ padding: '18px 40px', fontSize: 17, background: 'rgba(255,255,255,0.03)', color: 'white', fontWeight: 600, cursor: 'pointer', borderRadius: 16 }}
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#4ade80', opacity: 0.6 }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>Explore</span>
          <div className="animate-float" style={{ width: 2, height: 40, background: 'linear-gradient(to bottom, #4ade80, transparent)', borderRadius: 1 }}></div>
        </div>
      </section>

      {/* Weather Forecast Section */}
      <section style={{ padding: '80px 0 0', backgroundColor: '#0c120f', position: 'relative', borderTop: '1px solid rgba(20, 83, 45, 0.3)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: 8, color: '#38bdf8', fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase' }}>Live Updates</div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, marginBottom: 16, fontFamily: 'Poppins', color: 'white' }}>Meteorological <span style={{ color: '#38bdf8' }}>Forecast</span></h2>
              <p style={{ color: '#9ca3af', maxWidth: 650, margin: '0 auto', fontSize: 16, lineHeight: 1.6 }}>Get the latest weather directly from the meteorological department for your region.</p>
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
             <div style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 8, color: '#f59e0b', fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase' }}>Resources</div>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, marginBottom: 20, fontFamily: 'Poppins', color: 'white' }}>Smart <span style={{ color: '#f59e0b' }}>E-Governance</span></h2>
            <p style={{ color: '#9ca3af', maxWidth: 650, margin: '0 auto', fontSize: 18, lineHeight: 1.7 }}>Innovative solutions designed to bridge the gap between people and the administration.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 32 }}>
            {/* Feature 1 */}
            <div className="glass-card glass-card-hover group" style={{ padding: '54px 40px', borderRadius: 28, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: '#60a5fa' }}></div>
              <div style={{ width: 70, height: 70, borderRadius: 20, background: 'rgba(30, 58, 138, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 36, transition: 'all 0.5s ease' }} className="group-hover:scale-110">
                <Shield size={36} color="#60a5fa" />
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: 'white' }}>Issue Tracking</h3>
              <p style={{ color: '#9ca3af', lineHeight: 1.8, fontSize: 16 }}>
                Submit grievances directly to the administration. Track progress in real-time with automated status updates.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="glass-card glass-card-hover group" style={{ padding: '54px 40px', borderRadius: 28, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: '#fbbf24' }}></div>
              <div style={{ width: 70, height: 70, borderRadius: 20, background: 'rgba(120, 53, 15, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 36, transition: 'all 0.5s ease' }} className="group-hover:scale-110">
                <Activity size={36} color="#fbbf24" />
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: 'white' }}>Smart Polling</h3>
              <p style={{ color: '#9ca3af', lineHeight: 1.8, fontSize: 16 }}>
                Have your say in village development. Participate in secure, transparent polls for upcoming local initiatives.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="glass-card glass-card-hover group" style={{ padding: '54px 40px', borderRadius: 28, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: '#4ade80' }}></div>
              <div style={{ width: 70, height: 70, borderRadius: 20, background: 'rgba(20, 83, 45, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 36, transition: 'all 0.5s ease' }} className="group-hover:scale-110">
                <Users size={36} color="#4ade80" />
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: 'white' }}>Admin Portal</h3>
              <p style={{ color: '#9ca3af', lineHeight: 1.8, fontSize: 16 }}>
                A direct link between citizens and officials for announcements, certificates, and important documents.
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
                  src="/about-us.png" 
                  alt="Modern Panchayat Administration" 
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,15,13,0.4), transparent)' }}></div>
              </div>
              
              <div className="glass-card shadow-xl" style={{ position: 'absolute', bottom: -30, right: 20, padding: '24px 32px', zIndex: 2, borderRadius: 20, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#f59e0b', marginBottom: 4 }}>100%</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Digital Transparency</div>
              </div>
            </div>
            
            {/* Text Side */}
            <div style={{ flex: '1 1 500px' }}>
              <div style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: 8, color: '#4ade80', fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase' }}>Our Mission</div>
              <h2 style={{ fontSize: 'clamp(32px, 4.5vw, 44px)', fontWeight: 800, marginBottom: 24, lineHeight: 1.2 }}>Pioneering Digital <br /><span style={{ color: '#4ade80' }}>Village Governance</span></h2>
              
              <p style={{ color: '#9ca3af', fontSize: 17, lineHeight: 1.8, marginBottom: 24 }}>
                The SGPIMS (Smart Gram Panchayat Information Management System) was established with a singular vision: to bring the power of world-class digital governance to the very roots of our nation.
              </p>
              
              <p style={{ color: '#9ca3af', fontSize: 17, lineHeight: 1.8, marginBottom: 32 }}>
                We believe that geography should not be a barrier to service. By digitizing complaints, polls, and community updates, we ensure that every citizen's voice is heard and every concern is tracked from submission to resolution.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ color: '#4ade80', paddingTop: 4 }}><Shield size={20} /></div>
                  <div>
                    <h4 style={{ color: 'white', fontWeight: 700, marginBottom: 4 }}>Secured</h4>
                    <p style={{ color: '#6b7280', fontSize: 13 }}>Enterprise-grade data protection.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                   <div style={{ color: '#f59e0b', paddingTop: 4 }}><Users size={20} /></div>
                  <div>
                    <h4 style={{ color: 'white', fontWeight: 700, marginBottom: 4 }}>Inclusive</h4>
                    <p style={{ color: '#6b7280', fontSize: 13 }}>Built for every member of the village.</p>
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
              <h2 style={{ fontSize: 'clamp(30px, 4vw, 40px)', fontWeight: 800, marginBottom: 16, fontFamily: 'Poppins', color: 'white' }}>Village <span style={{ color: '#22c55e' }}>Gallery</span></h2>
              <p style={{ color: '#9ca3af', maxWidth: 600, fontSize: 16, lineHeight: 1.6 }}>Visual updates and milestones shared directly by the Panchayat Administration.</p>
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
                <div key={post._id} className="glass-card overflow-hidden group cursor-pointer glass-card-hover" style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 16 }}>
                  <div style={{ position: 'relative', height: 256, width: '100%', overflow: 'hidden' }}>
                    <img 
                      src={post.imageUrl.startsWith('http') ? post.imageUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${post.imageUrl}`} 
                      alt={post.title || "Gallery Post"} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.7s ease' }}
                      className="group-hover:scale-110"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/village-placeholder.jpg' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,15,13,0.9), transparent)', opacity: 0, transition: 'opacity 0.3s ease' }} className="group-hover:opacity-100"></div>
                  </div>
                  <div style={{ padding: 24, display: 'flex', flexDirection: 'column', flex: 1 }}>
                    {post.title && <h3 style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 8 }}>{post.title}</h3>}
                    <p style={{ color: '#d1d5db', fontSize: 14, lineHeight: 1.6, marginBottom: 16, flex: 1 }}>
                      {post.description}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(45,106,79,0.3)' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#14532d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>
                             {post.createdBy?.name?.charAt(0) || 'A'}
                          </div>
                          <div>
                            <p style={{ fontSize: 12, color: 'white', fontWeight: 500, margin: 0 }}>{post.createdBy?.name || 'Admin'}</p>
                            <p style={{ fontSize: 10, color: '#4ade80', textTransform: 'capitalize', margin: 0 }}>{post.createdBy?.role || 'Admin'}</p>
                          </div>
                       </div>
                       <span style={{ fontSize: 10, color: '#6b7280' }}>
                         {new Date(post.createdAt).toLocaleDateString()}
                       </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 48, textAlign: 'center', borderRadius: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(20, 83, 45, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                 <ImageIcon size={32} color="rgba(34, 197, 94, 0.5)" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 8 }}>No Gallery Posts Yet</h3>
              <p style={{ color: '#9ca3af' }}>Posts added by the Panchayat Administration will appear here.</p>
            </div>
          )}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
