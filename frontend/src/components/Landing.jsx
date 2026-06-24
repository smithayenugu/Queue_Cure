import { Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

function Landing() {
  const { queueState } = useSocket();
  const { queue, currentToken } = queueState;

  const patientsServed = currentToken ? currentToken.token - 1 : 0;
  const hasLiveData = queue.length > 0 || currentToken !== null;

  return (
    <div className="container">
      <div className="header">
        <h1>🩺 Queue Cure</h1>
        <p>Smart Queue Management for Indian Clinics</p>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '50px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🏥</div>
        <h2 style={{ marginBottom: '15px', color: '#444' }}>Welcome to Queue Cure</h2>
        <p style={{ color: '#888', marginBottom: '30px', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
          Replace paper token slips with a real-time digital queue. 
          Patients get visibility, doctors get control, clinics go digital.
        </p>
        
        <div className="nav-links">
          <Link to="/receptionist" className="btn btn-primary btn-lg">
            🖥️ Receptionist Dashboard
          </Link>
          <Link to="/waiting-room" className="btn btn-success btn-lg">
            👥 Patient Waiting Room
          </Link>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">76%</div>
          <div className="stat-label">Clinics on Paper</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">2-3hr</div>
          <div className="stat-label">Avg Wait Time</div>
        </div>
        <div className="stat-card" style={{ border: hasLiveData ? '2px solid #48bb78' : 'none' }}>
          <div className="stat-value" style={{ color: hasLiveData ? '#48bb78' : '#667eea' }}>
            {hasLiveData ? `${patientsServed} served, ${queue.length} waiting` : '0'}
          </div>
          <div className="stat-label">
            {hasLiveData ? 'Live Queue Status' : 'Visibility Today'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value">∞</div>
          <div className="stat-label">Potential Impact</div>
        </div>
      </div>
    </div>
  );
}

export default Landing;