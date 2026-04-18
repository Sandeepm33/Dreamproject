'use client';
import { useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function FaviconUpdater() {
  const { language } = useLanguage();

  useEffect(() => {
    const href = language === 'te' ? '/logo-te.png' : '/logo-en.png';
    let link = document.getElementById('dynamic-favicon') as HTMLLinkElement;
    
    if (!link) {
      link = document.createElement('link');
      link.id = 'dynamic-favicon';
      link.rel = 'icon';
      link.type = 'image/png';
      document.head.appendChild(link);
    }
    
    // Force update
    link.href = href + '?v=' + Date.now();
  }, [language]);

  return null;
}
