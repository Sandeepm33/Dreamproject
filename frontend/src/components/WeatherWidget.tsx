'use client';
import { useEffect, useState } from 'react';
import { Sun, Cloud, CloudRain, CloudLightning, Wind, Droplets, MapPin, Thermometer, Calendar } from 'lucide-react';

interface WeatherData {
  temperature: number;
  windspeed: number;
  weathercode: number;
  is_day: number;
  time: string;
}

interface DailyData {
  time: string[];
  weathercode: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationName, setLocationName] = useState('New Delhi');

  // WMO Weather interpretation codes (WW)
  const getWeatherIcon = (code: number, isDay: number, size = 48) => {
    switch (code) {
      case 0:
      case 1:
        return <Sun size={size} color={isDay ? "#fbbf24" : "#9ca3af"} />;
      case 2:
      case 3:
        return <Cloud size={size} color="#9ca3af" />;
      case 45:
      case 48:
        return <Cloud size={size} color="#6b7280" />;
      case 51: case 53: case 55: case 56: case 57:
      case 61: case 63: case 65: case 66: case 67:
      case 80: case 81: case 82:
        return <CloudRain size={size} color="#60a5fa" />;
      case 71: case 73: case 75: case 77: case 85: case 86:
        return <CloudRain size={size} color="#e5e7eb" />; // Snow
      case 95: case 96: case 99:
        return <CloudLightning size={size} color="#f87171" />;
      default:
        return <Sun size={size} color="#fbbf24" />;
    }
  };

  const getWeatherDescription = (code: number) => {
    switch (code) {
      case 0: return 'Clear sky';
      case 1: return 'Mainly clear';
      case 2: return 'Partly cloudy';
      case 3: return 'Overcast';
      case 45: case 48: return 'Fog';
      case 51: case 53: case 55: return 'Drizzle';
      case 61: case 63: case 65: return 'Rain';
      case 71: case 73: case 75: return 'Snow fall';
      case 95: case 96: case 99: return 'Thunderstorm';
      default: return 'Variable';
    }
  };

  const getDayName = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  }

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        setLoading(true);
        // Using Open-Meteo free API with daily forecast included
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setWeather(data.current_weather);
        setForecast(data.daily);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Attempt Geolocation first
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
          setLocationName('Your Location');
        },
        (error) => {
          // Fallback to New Delhi
          fetchWeather(28.6139, 77.2090);
        }
      );
    } else {
      // Fallback
      fetchWeather(28.6139, 77.2090);
    }
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', width: '100%' }}>
         {[1, 2, 3].map((i) => (
           <div key={i} className="glass-card" style={{ padding: '24px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(56, 189, 248, 0.3)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
           </div>
         ))}
      </div>
    );
  }

  if (error || !weather || !forecast || forecast.time.length < 3) {
    return (
      <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', textAlign: 'center', color: '#f87171', width: '100%' }}>
        Could not load weather data.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', width: '100%' }}>
      
      {/* TODAY CARD */}
      <div className="glass-card overflow-hidden glass-card-hover" style={{ borderRadius: '24px', position: 'relative', background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(30, 58, 138, 0.2))', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '32px' }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '150px', height: '150px', background: 'rgba(56, 189, 248, 0.15)', borderRadius: '50%', filter: 'blur(50px)' }}></div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', marginBottom: '4px' }}>
                <MapPin size={16} />
                <span style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>{locationName}</span>
              </div>
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>Today, {getDayName(forecast.time[0])}</div>
            </div>
            <div>
              {getWeatherIcon(forecast.weathercode[0], 1, 56)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '56px', fontWeight: 800, color: 'white', lineHeight: 1 }}>
              {Math.round(forecast.temperature_2m_max[0])}°
            </span>
            <span style={{ fontSize: '20px', color: '#9ca3af', fontWeight: 500 }}>/ {Math.round(forecast.temperature_2m_min[0])}°C</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 500, color: '#e0e7ff', marginBottom: '32px' }}>
            {getWeatherDescription(forecast.weathercode[0])}
          </div>
          {/* Current Live Stats for Today */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px', marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(14, 165, 233, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wind size={20} color="#38bdf8" />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '2px' }}>Wind</div>
                <div style={{ fontSize: '15px', color: 'white', fontWeight: 600 }}>{weather.windspeed} km/h</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Thermometer size={20} color="#fbbf24" />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '2px' }}>Current</div>
                <div style={{ fontSize: '15px', color: 'white', fontWeight: 600 }}>{weather.temperature}°</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOMORROW CARD */}
      <div className="glass-card overflow-hidden glass-card-hover" style={{ borderRadius: '24px', position: 'relative', background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.05)', padding: '32px' }}>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e0e7ff', marginBottom: '4px' }}>
                <Calendar size={16} />
                <span style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Tomorrow</span>
              </div>
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>{getDayName(forecast.time[1])}</div>
            </div>
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', paddingBottom: '24px' }}>
            {getWeatherIcon(forecast.weathercode[1], 1, 84)}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '42px', fontWeight: 800, color: 'white', lineHeight: 1, marginBottom: '8px' }}>
                {Math.round(forecast.temperature_2m_max[1])}° <span style={{ fontSize: '24px', color: '#9ca3af', fontWeight: 500 }}>/ {Math.round(forecast.temperature_2m_min[1])}°C</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 500, color: '#e0e7ff' }}>
                {getWeatherDescription(forecast.weathercode[1])}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* NEXT DAY CARD */}
      <div className="glass-card overflow-hidden glass-card-hover" style={{ borderRadius: '24px', position: 'relative', background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.05)', padding: '32px' }}>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e0e7ff', marginBottom: '4px' }}>
                <Calendar size={16} />
                <span style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Day After</span>
              </div>
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>{getDayName(forecast.time[2])}</div>
            </div>
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', paddingBottom: '24px' }}>
            {getWeatherIcon(forecast.weathercode[2], 1, 84)}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '42px', fontWeight: 800, color: 'white', lineHeight: 1, marginBottom: '8px' }}>
                 {Math.round(forecast.temperature_2m_max[2])}° <span style={{ fontSize: '24px', color: '#9ca3af', fontWeight: 500 }}>/ {Math.round(forecast.temperature_2m_min[2])}°C</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 500, color: '#e0e7ff' }}>
                {getWeatherDescription(forecast.weathercode[2])}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
