'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, ArrowRight, ArrowLeft, ShieldCheck, Lock, Hash } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & Password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false);
  
  const { t, language } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await api.forgotPassword(email);
      if (res.success) {
        setMessage(t('checkEmailForLink') || 'OTP sent to your email');
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch') || 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError(t('passwordMinLength') || 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.resetPasswordWithOtp({ email, otp, password });
      if (res.success) {
        setMessage(t('passwordResetSuccess') || 'Password reset successful!');
        setStep(3); // Success step
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
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

      <div className="login-content-wrapper">
        <button 
          onClick={() => step === 2 ? setStep(1) : router.push('/login')}
          className="back-btn"
        >
          <ArrowLeft size={18} />
          <span>{t('back')}</span>
        </button>
        
        <div className="auth-card-container">
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
              <h2 className="welcome-text">{step === 1 ? t('forgotPassword') : step === 2 ? 'Verify OTP' : 'Success!'}</h2>
              <p className="sub-text">
                {step === 1 
                  ? t('enterRegisteredEmail') 
                  : step === 2 
                  ? 'Please enter the 6-digit OTP sent to your email and choose a new password.' 
                  : 'Your password has been reset successfully. You can now log in to your account.'}
              </p>
            </div>
            <div className="visual-footer">
              <div className="trust-item"><ShieldCheck size={18} /><span>{t('secureEgov')}</span></div>
            </div>
          </div>

          <div className="auth-form-side shadow-2xl">
            <div className="form-inner">
              <div className="form-header">
                <h3>{step === 3 ? 'Done' : t('resetPassword')}</h3>
                <p>{step === 1 ? t('verifyEmail') : step === 2 ? 'Security Verification' : 'Access Restored'}</p>
              </div>

              {step === 1 && (
                <form onSubmit={handleSendOtp} className="village-form">
                  <div className="input-group">
                    <label className="v-label"><Mail size={14} /> {t('emailAddr')}</label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      className="v-input" 
                      placeholder="example@gmail.com" 
                      required 
                    />
                  </div>

                  {error && <div className="error-box">⚠️ {error}</div>}

                  <button type="submit" className="v-btn-primary" disabled={loading}>
                    {loading ? <div className="spinner" /> : (
                      <>
                        <span>{t('sendResetLink') || 'Send OTP'}</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleResetPassword} className="village-form">
                  <div className="input-group">
                    <label className="v-label"><Hash size={14} /> Enter 6-Digit OTP</label>
                    <input 
                      type="text" 
                      value={otp} 
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                      className="v-input" 
                      placeholder="123456" 
                      required 
                      maxLength={6}
                      minLength={6}
                    />
                  </div>

                  <div className="input-group">
                    <label className="v-label"><Lock size={14} /> {t('newPassword')}</label>
                    <input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="v-input" 
                      placeholder="••••••••" 
                      required 
                      minLength={6}
                    />
                  </div>

                  <div className="input-group">
                    <label className="v-label"><Lock size={14} /> {t('confirmNewPassword')}</label>
                    <input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      className="v-input" 
                      placeholder="••••••••" 
                      required 
                      minLength={6}
                    />
                  </div>

                  {error && <div className="error-box">⚠️ {error}</div>}
                  {message && <div className="success-box" style={{ padding: '10px', fontSize: '14px', marginBottom: '10px' }}>✅ {message}</div>}

                  <button type="submit" className="v-btn-primary" disabled={loading}>
                    {loading ? <div className="spinner" /> : (
                      <>
                        <span>{t('updatePassword') || 'Reset Password'}</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {step === 3 && (
                <div className="success-box">
                  ✅ {message}
                  <button onClick={() => router.push('/login')} className="v-btn-primary" style={{ marginTop: 20 }}>
                    {t('backToLogin')}
                  </button>
                </div>
              )}
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
          transition: all 0.3s;
          backdrop-filter: blur(10px);
          font-weight: 600;
          font-size: 14px;
        }

        .back-btn:hover {
          background: rgba(45, 106, 79, 0.2);
          color: #f59e0b;
          border-color: #f59e0b;
          transform: translateX(-5px);
        }

        .auth-card-container {
          display: flex;
          background: rgba(22, 32, 25, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(45, 106, 79, 0.3);
          border-radius: 24px;
          overflow: hidden;
          width: 100%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .auth-visual-side {
          flex: 1;
          padding: 60px;
          display: flex;
          flex-direction: column;
          background: linear-gradient(to bottom right, rgba(26, 71, 42, 0.6), rgba(13, 36, 22, 0.9));
          border-right: 1px solid rgba(45, 106, 79, 0.2);
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

        .auth-form-side {
          flex: 1.2;
          padding: 60px;
          background: #111a14;
          display: flex;
          flex-direction: column;
          justify-content: center;
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

        .error-box {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          padding: 12px 16px;
          border-radius: 12px;
          color: #ef4444;
          font-size: 14px;
        }

        .success-box {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid #22c55e;
          padding: 20px;
          border-radius: 12px;
          color: #22c55e;
          font-size: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
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
          width: 100%;
        }

        .v-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(245, 158, 11, 0.3);
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(13, 36, 22, 0.3);
          border-top-color: #0d2416;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

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
        }
      `}</style>
    </div>
  );
}
