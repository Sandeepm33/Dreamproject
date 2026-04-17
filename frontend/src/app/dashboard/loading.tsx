export default function DashboardLoading() {
  return (
    <div style={{ padding: '24px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ width: '200px' }}>
          <div className="skeleton" style={{ height: '32px', marginBottom: '8px', borderRadius: '8px' }} />
          <div className="skeleton" style={{ height: '16px', width: '150px', borderRadius: '4px' }} />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="skeleton" style={{ height: '40px', width: '120px', borderRadius: '10px' }} />
          <div className="skeleton" style={{ height: '40px', width: '100px', borderRadius: '10px' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '16px' }} />
        ))}
      </div>

      <div className="skeleton" style={{ height: '400px', width: '100%', borderRadius: '16px' }} />
    </div>
  );
}
