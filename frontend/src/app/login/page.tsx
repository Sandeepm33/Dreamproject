'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Lock, Smartphone, User, Home, ArrowRight, ShieldCheck, Mail, Globe, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { api } from '@/lib/api';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', mobile: '', email: '', password: '', confirmPassword: '', role: 'citizen', village: '', department: '', district: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  
  const { login, register } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();

  const [districts, setDistricts] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    if (isRegister) {
      api.getDistricts().then(res => setDistricts(res.districts || []));
    }
  }, [isRegister]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value;
    // Strictly allow only numbers for mobile during registration
    if (e.target.name === 'mobile' && isRegister) {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setForm(f => ({ ...f, [e.target.name]: value }));
    setError('');
  };

  const handleDistrictChange = async (districtId: string) => {
    setForm(f => ({ ...f, district: districtId, village: '' }));
    try {
      const res = await api.getVillages({ district: districtId });
      setVillages(res.villages || []);
    } catch (err) {
      console.error('Failed to fetch villages');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let loggedInUser;
      if (isRegister) {
        if (!form.name || form.name.length < 3) {
          setError('Name must be at least 3 characters');
          setLoading(false);
          return;
        }
        if (!/^\d{10}$/.test(form.mobile)) {
          setError('Mobile number must be exactly 10 digits');
          setLoading(false);
          return;
        }
        if (form.password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        if (form.password !== form.confirmPassword) { 
          setError('Passwords do not match'); 
          setLoading(false); 
          return; 
        }
        if (!form.district || !form.village) {
          setError('Please select Distict and Village');
          setLoading(false);
          return;
        }
        loggedInUser = await register(form);
      } else {
        loggedInUser = await login(form.mobile, form.password);
      }
      
      // Redirect based on role
      const role = loggedInUser.role;
      if (role === 'collector') {
        router.push('/dashboard/admin/users');
      } else if (role === 'admin' || role === 'panchayat_secretary') {
        router.push('/dashboard/admin');
      } else if (role === 'officer') {
        router.push('/dashboard/officer');
      } else if (role === 'citizen') {
        router.push('/dashboard/citizen');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="village-container">
      <div className="village-bg" style={{ backgroundImage: 'url("/bg-telangana-village.png")' }}>
        <div className="village-overlay" />
      </div>

      <div className="leaf leaf-1">🍃</div>
      <div className="leaf leaf-2">🌿</div>
      <div className="leaf leaf-3">🍃</div>

      <div className="login-content-wrapper">
        <button 
          onClick={() => isRegister ? setIsRegister(false) : router.push('/')}
          className="back-btn"
          title={isRegister ? t('signin') : t('home')}
        >
          <ArrowLeft size={18} />
          <span>{t('back')}</span>
        </button>
        <div className={`auth-card-container ${isRegister ? 'is-register' : ''}`}>
          <div className="auth-visual-side">
            <div className="brand-badge" style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 60 }}>
              <div style={{ width: 60, height: 60, background: 'rgba(255,255,255,0.05)', borderRadius: 20, border: '1px solid rgba(245, 158, 11, 0.3)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={language === 'te' ? '/logo-te.png' : '/logo-en.png'} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div className="badge-text">
                <span className="brand-name">
                  {language === 'en' ? (
                    <>Mana<span style={{ color: '#fff' }}>gramam</span></>
                  ) : (
                    <><span>మన</span><span style={{ color: '#fff' }}>గ్రామం</span></>
                  )}
                </span>
                <span className="brand-tag">{t('governanceRedefined')}</span>
              </div>
            </div>
            <div className="visual-message">
              <h2 className="welcome-text">{isRegister ? t('join') : t('welcome')}</h2>
              <p className="sub-text">{isRegister ? t('joinVibe') : t('welcomeVibe')}</p>
            </div>
            <div className="visual-footer">
              <div className="trust-item"><ShieldCheck size={18} /><span>{t('secureEgov')}</span></div>
            </div>
          </div>

          <div className="auth-form-side shadow-2xl">
            <div className="form-inner">
              <div className="form-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3>{isRegister ? t('createAccount') : t('accessPortal')}</h3>
                  <div className="lang-switcher">
                    <button onClick={() => setLanguage('en')} className={language === 'en' ? 'active' : ''}>EN</button>
                    <button onClick={() => setLanguage('te')} className={language === 'te' ? 'active' : ''}>తెలుగు</button>
                  </div>
                </div>
                <p>{isRegister ? t('digitalCitizenJourney') : t('panchayatDashboardLogin')}</p>
              </div>

              <form onSubmit={handleSubmit} className="village-form">
                {isRegister && (
                  <>
                    <div className="input-group animate-in">
                      <label className="v-label"><User size={14} /> {t('fullName')}</label>
                      <input name="name" value={form.name} onChange={handleChange} className="v-input" placeholder="Rajesh Kumar" required minLength={3} />
                    </div>
                    <div className="input-row animate-in">
                      <div className="input-group">
                        <label className="v-label"><Globe size={14} /> {t('district')}</label>
                        <select 
                          className="v-input" 
                          name="district" 
                          value={(form as any).district} 
                          onChange={(e) => handleDistrictChange(e.target.value)} 
                          required
                        >
                          <option value="">{t('selectDistrict')}</option>
                          {districts.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                        </select>
                      </div>
                      <div className="input-group">
                        <label className="v-label"><Home size={14} /> {t('village')}</label>
                        <select 
                          className="v-input" 
                          name="village" 
                          value={form.village} 
                          onChange={handleChange} 
                          required
                          disabled={!(form as any).district}
                        >
                          <option value="">{t('village')}</option>
                          {villages.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div className="input-group">
                  <label className="v-label"><Smartphone size={14} /> {isRegister ? t('mobileNumber') : t('mobileOrEmail')}</label>
                  <input name="mobile" value={form.mobile} onChange={handleChange} className="v-input" placeholder={isRegister ? "10 digit mobile number" : "Mobile or Email"} required type="text" minLength={isRegister ? 10 : undefined} maxLength={isRegister ? 10 : undefined} pattern={isRegister ? "[0-9]{10}" : undefined} title={isRegister ? "10 digit mobile number" : undefined} />
                </div>

                {isRegister && (
                  <div className="input-group animate-in">
                    <label className="v-label"><Mail size={14} /> {t('emailAddr')}</label>
                    <input name="email" value={form.email} onChange={handleChange} className="v-input" placeholder="example@gmail.com" required type="email" />
                  </div>
                )}

                <div className="input-group">
                  <label className="v-label"><Lock size={14} /> {t('password')}</label>
                  <input name="password" value={form.password} onChange={handleChange} className="v-input" placeholder="••••••••" required type="password" minLength={6} />
                </div>

                {isRegister && (
                  <div className="input-group animate-in">
                    <label className="v-label"><Lock size={14} /> {t('confirmPassword')}</label>
                    <input name="confirmPassword" value={form.confirmPassword} onChange={handleChange} className="v-input" placeholder="••••••••" required type="password" minLength={6} />
                  </div>
                )}

                {error && (
                  <div className="error-box">
                     ⚠️ {error}
                  </div>
                )}

                <button type="submit" className="v-btn-primary" disabled={loading}>
                  {loading ? (
                    <div className="spinner" />
                  ) : (
                    <>
                      <span>{isRegister ? t('register') : t('signin')}</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <div className="form-footer">
                <p>
                  {isRegister ? t('alreadyHaveAccount') : t('dontHaveAccount')}{' '}
                  <button type="button" onClick={() => setIsRegister(!isRegister)} className="toggle-btn">
                    {isRegister ? t('signin') : t('register')}
                  </button>
                </p>
              </div>


            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .village-container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          font-family: 'Poppins', sans-serif;
          overflow: hidden;
          background: #0a0f0d;
        }

        .village-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          z-index: 0;
          transform: scale(1.05);
          filter: brightness(0.7);
        }

        .village-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(10, 15, 13, 0.7) 0%, rgba(10, 15, 13, 0.9) 100%);
        }

        .login-content-wrapper {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 1000px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .back-btn {
          align-self: flex-start;
          margin-bottom: 20px;
          margin-left: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(22, 32, 25, 0.8);
          border: 1px solid rgba(45, 106, 79, 0.3);
          color: #86efac;
          padding: 10px 20px;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
          font-weight: 600;
          font-size: 14px;
          z-index: 20;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .back-btn:hover {
          background: rgba(45, 106, 79, 0.2);
          color: #f59e0b;
          border-color: #f59e0b;
          transform: translateX(-5px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .auth-card-container {
          display: flex;
          background: rgba(22, 32, 25, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(45, 106, 79, 0.3);
          border-radius: 24px;
          overflow: hidden;
          width: 100%;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .auth-visual-side {
          flex: 1;
          padding: 60px;
          display: flex;
          flex-direction: column;
          background: linear-gradient(to bottom right, rgba(26, 71, 42, 0.6), rgba(13, 36, 22, 0.9));
          border-right: 1px solid rgba(45, 106, 79, 0.2);
          position: relative;
        }

        .brand-badge {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 60px;
        }

        .badge-icon {
          font-size: 40px;
          padding: 15px;
          background: rgba(245, 158, 11, 0.15);
          border-radius: 20px;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .brand-name {
          display: block;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: 1px;
          color: #f59e0b;
        }

        .brand-tag {
          font-size: 14px;
          color: #86efac;
          opacity: 0.8;
        }

        .welcome-text {
          font-size: 38px;
          font-weight: 700;
          color: white;
          line-height: 1.2;
          margin-bottom: 20px;
        }

        .sub-text {
          font-size: 16px;
          color: #86efac;
          line-height: 1.6;
          max-width: 400px;
        }

        .visual-footer {
          margin-top: auto;
        }

        .trust-item {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #f59e0b;
          font-size: 14px;
          font-weight: 500;
        }

        /* Form Side */
        .auth-form-side {
          flex: 1.2;
          padding: 60px;
          background: #111a14;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .lang-switcher {
          display: flex;
          gap: 4px;
          background: rgba(255,255,255,0.05);
          padding: 4px;
          border-radius: 8px;
          border: 1px solid rgba(45, 106, 79, 0.3);
        }

        .lang-switcher button {
          background: none;
          border: none;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
          color: #6b7280;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .lang-switcher button.active {
          background: #f59e0b;
          color: #0d2416;
        }

        .form-header h3 {
          font-size: 28px;
          font-weight: 700;
          color: white;
          margin-bottom: 8px;
        }

        .form-header p {
          color: #6b7280;
          font-size: 15px;
          margin-bottom: 35px;
        }

        .village-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .v-label {
          font-size: 13px;
          font-weight: 600;
          color: #86efac;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .v-input {
          background: rgba(10, 15, 13, 0.8);
          border: 1px solid rgba(45, 106, 79, 0.4);
          border-radius: 12px;
          padding: 14px 18px;
          color: white;
          font-size: 15px;
          outline: none;
          transition: all 0.3s ease;
        }

        .v-input:focus {
          border-color: #f59e0b;
          background: rgba(26, 71, 42, 0.2);
          box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.1);
        }

        select.v-input {
          color-scheme: dark;
        }

        .v-input option {
          background: #111a14;
          color: white;
        }

        .error-box {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          padding: 12px 16px;
          border-radius: 12px;
          color: #ef4444;
          font-size: 14px;
        }

        .v-btn-primary {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #0d2416;
          padding: 16px;
          border-radius: 14px;
          border: none;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s ease;
          margin-top: 10px;
        }

        .v-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(245, 158, 11, 0.3);
        }

        .v-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .form-footer {
          margin-top: 25px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
        }

        .toggle-btn {
          background: none;
          border: none;
          color: #f59e0b;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          font-size: 14px;
        }

        .toggle-btn:hover {
          text-decoration: underline;
        }



        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(13, 36, 22, 0.3);
          border-top-color: #0d2416;
          border-radius: 50%;
          animation: v-spin 0.8s linear infinite;
        }

        .leaf {
          position: fixed;
          font-size: 24px;
          pointer-events: none;
          z-index: 5;
          opacity: 0.6;
        }

        .leaf-1 { top: 10%; left: 5%; animation: float 6s ease-in-out infinite; }
        .leaf-2 { top: 20%; right: 10%; animation: float 8s ease-in-out infinite reverse; }
        .leaf-3 { bottom: 15%; left: 15%; animation: float 5s ease-in-out infinite; }

        @keyframes v-spin { to { transform: rotate(360deg); } }
        
        @keyframes v-fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(10px, -20px) rotate(15deg); }
        }

        .animate-in {
          animation: v-fadeInUp 0.4s ease forwards;
        }

        @media (max-width: 900px) {
          .auth-card-container {
            flex-direction: column;
            max-width: 500px;
          }
          .auth-visual-side {
            padding: 40px;
          }
          .auth-form-side {
            padding: 40px;
          }
          .welcome-text {
            font-size: 30px;
          }
          .input-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
