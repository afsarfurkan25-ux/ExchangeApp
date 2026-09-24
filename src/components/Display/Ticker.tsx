import { useExchange } from '../../hooks/useExchange';

const Ticker: React.FC = () => {
  const { tickerItems } = useExchange();

  return (
    <div style={{
      flex: 1,
      overflow: 'hidden',
      margin: '0 20px',
      position: 'relative'
    }}>
      <div className="ticker-container" style={{
        display: 'flex',
        gap: '40px',
        justifyContent: 'center',
        whiteSpace: 'nowrap'
      }}>
        {tickerItems.filter(item => item.isVisible !== false).map((item, index) => (
          <div key={index} className="ticker-item" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#8B97B8'
          }}>
            <span style={{ fontWeight: 600, color: '#C8D4E8' }}>{item.name}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F5D56E', fontWeight: 600 }}>
              {item.value}
            </span>
            <span style={{ color: item.isUp ? '#22C55E' : '#EF4444' }}>
              {item.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Ticker;
