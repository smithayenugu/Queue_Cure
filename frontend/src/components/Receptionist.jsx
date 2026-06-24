import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

function Receptionist() {
  const navigate = useNavigate();
  const { queueState, addPatient, callNext, setAvgTime, toggleQueue, pauseQueue, resumeQueue } = useSocket();
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [avgTimeInput, setAvgTimeInput] = useState('15');
  const [totalServed, setTotalServed] = useState(0);
  const [lastToken, setLastToken] = useState(null);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const { queue, currentToken, avgConsultationTime, queueOpen, queuePauseReason, queuePauseDelay } = queueState;

  // Track when a new token becomes current (someone was served)
  useEffect(() => {
    if (currentToken && currentToken.token !== lastToken) {
      if (lastToken !== null) {
        setTotalServed(prev => prev + 1);
      }
      setLastToken(currentToken.token);
    }
  }, [currentToken]);

  // Check if password exists on first load
  useEffect(() => {
    const savedPassword = localStorage.getItem('queueCurePassword');
    if (savedPassword) {
      setIsSettingPassword(false);
    } else {
      setIsSettingPassword(true);
    }
  }, []);

  const handleAddPatient = () => {
    if (!queueOpen) {
      alert('Queue is closed! Start the queue to add patients.');
      return;
    }
    const name = patientName.trim();
    if (!name) {
      alert('Please enter a patient name.');
      return;
    }
    const phone = patientPhone.trim();
    if (phone && !/^\d{10}$/.test(phone)) {
      alert('Please enter a valid 10-digit phone number or leave it empty.');
      return;
    }
    addPatient({ name, phone });
    setPatientName('');
    setPatientPhone('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleAddPatient();
  };

  const handleSetAvgTime = () => {
    const minutes = parseInt(avgTimeInput);
    if (!minutes || minutes < 1) {
      alert('Please enter a valid time (1-60 minutes).');
      return;
    }
    setAvgTime(minutes);
  };

  const handlePauseOption = (reason) => {
    pauseQueue(reason);
    setShowPauseModal(false);
  };

  const handleResume = () => {
    resumeQueue();
  };

  const handleSetPassword = () => {
    if (password.length < 4) {
      setPasswordError('Password must be at least 4 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match. Please try again.');
      return;
    }
    localStorage.setItem('queueCurePassword', password);
    setIsSettingPassword(false);
    setIsAuthorized(true);
    setPasswordError('');
    setPassword('');
    setConfirmPassword('');
  };

  const handlePasswordSubmit = () => {
    const savedPassword = localStorage.getItem('queueCurePassword');
    if (password === savedPassword) {
      setIsAuthorized(true);
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  const handlePasswordKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (isSettingPassword) handleSetPassword();
      else handlePasswordSubmit();
    }
  };

  const handleLogout = () => {
    setIsAuthorized(false);
    setPassword('');
    navigate('/');
  };

  const handleResetPassword = () => {
    if (window.confirm('Reset password? This will clear your saved password.')) {
      localStorage.removeItem('queueCurePassword');
      setIsSettingPassword(true);
      setPassword('');
      setConfirmPassword('');
      setPasswordError('');
    }
  };

  const pauseReasonText = {
    'doctor-late': '👨‍⚕️ Doctor is late — +45 min delay',
    'lunch-break': '🍽️ Lunch break — +1 hour delay',
    'clinic-closed': '🔴 Clinic closed for the day'
  };

  // ======= PASSWORD SETUP MODAL =======
  const passwordSetupModal = isSettingPassword && !isAuthorized ? (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000
    }}>
      <div className="card" style={{
        maxWidth: '420px', width: '90%', padding: '40px', textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🔐</div>
        <h2 style={{ color: '#444', marginBottom: '10px' }}>Set Your Password</h2>
        <p style={{ color: '#888', marginBottom: '20px' }}>
          Create a password to secure the receptionist dashboard.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '15px' }}>
          <input
            type="password"
            placeholder="Create a password (min 4 chars)..."
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
            onKeyDown={handlePasswordKeyDown}
            autoFocus
            style={{ padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', textAlign: 'center', outline: 'none' }}
          />
          <input
            type="password"
            placeholder="Confirm password..."
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
            onKeyDown={handlePasswordKeyDown}
            style={{ padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', textAlign: 'center', outline: 'none' }}
          />
        </div>
        {passwordError && (
          <p style={{ color: '#e53e3e', fontSize: '0.9rem', marginBottom: '10px' }}>{passwordError}</p>
        )}
        <button
          className="btn btn-success btn-lg"
          onClick={handleSetPassword}
          disabled={!password.trim() || !confirmPassword.trim()}
          style={{ width: '100%' }}
        >
          ✅ Set Password & Enter
        </button>
      </div>
    </div>
  ) : null;

  // ======= PASSWORD LOGIN MODAL =======
  const passwordLoginModal = !isSettingPassword && !isAuthorized ? (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000
    }}>
      <div className="card" style={{
        maxWidth: '420px', width: '90%', padding: '40px', textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🔐</div>
        <h2 style={{ color: '#444', marginBottom: '10px' }}>Receptionist Login</h2>
        <p style={{ color: '#888', marginBottom: '20px' }}>
          Enter your password to access the dashboard.
        </p>
        <div className="input-group" style={{ justifyContent: 'center' }}>
          <input
            type="password"
            placeholder="Enter password..."
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
            onKeyDown={handlePasswordKeyDown}
            autoFocus
            style={{ maxWidth: '220px', textAlign: 'center', fontSize: '1.1rem' }}
          />
        </div>
        {passwordError && (
          <p style={{ color: '#e53e3e', fontSize: '0.9rem', marginBottom: '10px' }}>{passwordError}</p>
        )}
        <button
          className="btn btn-primary btn-lg"
          onClick={handlePasswordSubmit}
          disabled={!password.trim()}
          style={{ width: '100%' }}
        >
          🔓 Unlock Dashboard
        </button>
        <button
          className="btn"
          onClick={handleResetPassword}
          style={{ marginTop: '15px', color: '#888', fontSize: '0.85rem', textDecoration: 'underline', background: 'none', cursor: 'pointer', border: 'none' }}
        >
          Forgot password? Reset it
        </button>
      </div>
    </div>
  ) : null;

  // ======= PAUSE MODAL =======
  const pauseModal = showPauseModal ? (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000
    }}>
      <div className="card" style={{
        maxWidth: '500px', width: '90%', padding: '40px', textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>⏸️</div>
        <h2 style={{ color: '#444', marginBottom: '10px' }}>Why are you pausing the queue?</h2>
        <p style={{ color: '#888', marginBottom: '25px' }}>
          Select a reason. Patients will be notified automatically.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            className="btn btn-warning btn-lg"
            onClick={() => handlePauseOption('doctor-late')}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            👨‍⚕️ Doctor hasn't arrived — Add 45 min delay
          </button>
          <button
            className="btn btn-warning btn-lg"
            onClick={() => handlePauseOption('lunch-break')}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            🍽️ Lunch Break — Add 1 hour delay
          </button>
          <button
            className="btn btn-danger btn-lg"
            onClick={() => handlePauseOption('clinic-closed')}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            🔴 Clinic Closed — Ask patients to come tomorrow
          </button>
        </div>

        <div style={{ marginTop: '20px' }}>
          <button
            className="btn btn-primary"
            onClick={() => setShowPauseModal(false)}
            style={{ padding: '8px 20px', fontSize: '0.9rem' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="container">
      {passwordSetupModal}
      {passwordLoginModal}
      {pauseModal}

      <div className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'left' }}>
            <h1>🖥️ Receptionist Dashboard</h1>
            <p>Manage the queue in real-time</p>
          </div>
          <button
            className="btn"
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.15)', color: 'white',
              padding: '6px 16px', fontSize: '0.8rem', borderRadius: '8px'
            }}
          >
            🔒 Logout
          </button>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
          <span
            className={`status-badge ${queueOpen ? 'active' : 'waiting'}`}
            style={{ fontSize: '1rem', padding: '8px 24px' }}
          >
            {queueOpen ? '🟢 Queue Open' : '🔴 Queue Closed'}
          </span>
          {!queuePauseReason ? (
            <button
              className="btn btn-warning"
              onClick={() => setShowPauseModal(true)}
              style={{ padding: '8px 20px', fontSize: '0.9rem' }}
            >
              ⏸️ Pause Queue
            </button>
          ) : (
            <button
              className="btn btn-success"
              onClick={handleResume}
              style={{ padding: '8px 20px', fontSize: '0.9rem' }}
            >
              ▶️ Resume Queue
            </button>
          )}
          {queuePauseReason && (
            <span className="status-badge waiting" style={{ fontSize: '0.9rem', padding: '6px 16px' }}>
              {pauseReasonText[queuePauseReason]}
            </span>
          )}
        </div>
      </div>

      {/* Add Patient */}
      <div className="card">
        <div className="card-title">➕ Add New Patient</div>
        <div className="input-group">
          <input
            type="text"
            placeholder={queueOpen ? "Enter patient name..." : "Queue is closed"}
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={!queueOpen}
            style={{ flex: '2' }}
          />
          <input
            type="tel"
            placeholder={queueOpen ? "Phone number..." : ""}
            value={patientPhone}
            onChange={(e) => setPatientPhone(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={!queueOpen}
            style={{ flex: '1.5' }}
          />
          <button
            className="btn btn-primary"
            onClick={handleAddPatient}
            disabled={!queueOpen}
          >
            Add to Queue
          </button>
        </div>
        {!queueOpen && (
          <p style={{ color: '#e53e3e', fontSize: '0.9rem', marginTop: '8px' }}>
            🔴 Queue is closed. Start the queue to add new patients.
          </p>
        )}
      </div>

      {/* Current Token */}
      <div className="card">
        <div className="card-title">🔄 Currently Serving</div>
        <div className="token-display">
          {currentToken ? (
            <>
              <div className="token-label">Now Serving</div>
              <div className="token-number">{currentToken.token}</div>
              <div className="token-name">{currentToken.name}</div>
              <span className="status-badge active" style={{ marginTop: '10px' }}>
                🟢 In Consultation
              </span>
            </>
          ) : (
            <>
              <div className="token-label">Token</div>
              <div className="token-number">---</div>
              <div className="token-name">No patient being seen</div>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="card-title">⚙️ Queue Controls</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-success btn-lg"
            onClick={callNext}
            style={{ flex: 1 }}
            disabled={queue.length === 0 || !queueOpen || queuePauseReason !== null}
          >
            📞 Call Next Token{!queueOpen ? ' (Queue Closed)' : queuePauseReason ? ' (Paused)' : ''}
          </button>
        </div>
        <div style={{ marginTop: '15px' }}>
          <label style={{ fontWeight: 600, color: '#555', display: 'block', marginBottom: '8px' }}>
            Average Consultation Time (minutes):
          </label>
          <div className="input-group">
            <input
              type="number"
              value={avgTimeInput}
              onChange={(e) => setAvgTimeInput(e.target.value)}
              min="1"
              max="60"
            />
            <button className="btn btn-warning" onClick={handleSetAvgTime}>
              Set Time
            </button>
          </div>
        </div>
      </div>

      {/* Queue Stats */}
      <div className="card">
        <div className="card-title">📊 Queue Overview</div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{totalServed}</div>
            <div className="stat-label">Total Served</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{queue.length}</div>
            <div className="stat-label">Waiting</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{avgConsultationTime}</div>
            <div className="stat-label">Avg Time (min)</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{queue.length * avgConsultationTime + queuePauseDelay}</div>
            <div className="stat-label">Total Est. Wait{queuePauseDelay > 0 ? ` (+${queuePauseDelay} min delay)` : ''}</div>
          </div>
        </div>
      </div>

      {/* Queue List */}
      <div className="card">
        <div className="card-title">📋 Waiting Queue</div>
        {queue.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>Queue is empty. Add patients to get started!</p>
          </div>
        ) : (
          <ul className="queue-list">
            {queue.map((patient, index) => (
              <li className="queue-item" key={patient.token}>
                <span className="token-badge">#{patient.token}</span>
                <span className="patient-name">
                  {patient.name}
                  {patient.phone && <span style={{ color: '#888', fontSize: '0.85rem', marginLeft: '8px' }}>📞 {patient.phone}</span>}
                </span>
                <span className="wait-time">
                  ⏱ ~{(index + 1) * avgConsultationTime + queuePauseDelay} min
                  {queuePauseDelay > 0 ? ` (+${queuePauseDelay} min delay)` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="nav-links">
        <Link to="/" className="btn btn-primary">🏠 Home</Link>
        <Link to="/waiting-room" className="btn btn-success">👥 Patient View</Link>
      </div>
    </div>
  );
}

export default Receptionist;