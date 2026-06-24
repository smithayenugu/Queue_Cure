import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

function WaitingRoom() {
  const { queueState } = useSocket();
  const [myToken, setMyToken] = useState(null);
  const [showTokenPrompt, setShowTokenPrompt] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  const { queue, currentToken, avgConsultationTime, queueOpen, queuePauseReason, queuePauseDelay } = queueState;

  // Track all tokens that have ever been "current" (i.e. called by receptionist)
  const [servedTokenIds, setServedTokenIds] = useState(new Set());

  const openTokenPrompt = useCallback(() => {
    setShowTokenPrompt(true);
  }, []);

  useEffect(() => {
    openTokenPrompt();
  }, [openTokenPrompt]);

  // Track every token that becomes "currently serving"
  useEffect(() => {
    if (currentToken) {
      setServedTokenIds(prev => {
        if (prev.has(currentToken.token)) return prev;
        const newSet = new Set(prev);
        newSet.add(currentToken.token);
        return newSet;
      });
    }
  }, [currentToken]);

  const handleSubmitToken = () => {
    const tokenStr = tokenInput.trim();
    if (tokenStr && !isNaN(parseInt(tokenStr))) {
      const token = parseInt(tokenStr);
      setMyToken(token);
      localStorage.setItem('queueCureMyToken', token);
      setShowTokenPrompt(false);
      setTokenInput('');
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('queueCureMyToken');
    if (savedToken) {
      setTokenInput(savedToken);
    }
  }, []);

  const handleTokenKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmitToken();
  };

  const resetToken = () => {
    localStorage.removeItem('queueCureMyToken');
    setMyToken(null);
    setShowTokenPrompt(true);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 't' || e.key === 'T') {
        resetToken();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ===== DERIVE ALL STATE =====
  const isInQueue = myToken ? queue.some(p => p.token === myToken) : false;
  const isCurrent = myToken && currentToken && currentToken.token === myToken;
  const hasBeenServed = servedTokenIds.has(myToken);
  const hasPassed = currentToken && currentToken.token > myToken;
  const servedOrPassed = hasBeenServed || hasPassed;
  const isComplete = myToken && servedOrPassed && !isInQueue && !isCurrent;

  const isInQueueOrCurrent = isInQueue || isCurrent;
  let positionInQueue = -1;
  let foundMyToken = false;

  if (isCurrent) {
    positionInQueue = -1;
  } else {
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].token === myToken) {
        positionInQueue = i;
        foundMyToken = true;
        break;
      }
    }
  }

  const isCurrentlyServingMe = isCurrent;

  // Pause reason display helper
  const pauseReasonDisplay = {
    'doctor-late': { text: '👨‍⚕️ Doctor is late — +45 min delay', cls: 'waiting' },
    'lunch-break': { text: '🍽️ Lunch break — +1 hour delay', cls: 'waiting' },
    'clinic-closed': { text: '🔴 Clinic closed — Please come tomorrow', cls: '' }
  };

  // ======= TOKEN PROMPT MODAL =======
  const tokenPromptModal = showTokenPrompt ? (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000
    }}>
      <div className="card" style={{
        maxWidth: '450px', width: '90%', padding: '40px', textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🎫</div>
        <h2 style={{ color: '#444', marginBottom: '10px' }}>Enter Your Token Number</h2>
        <p style={{ color: '#888', marginBottom: '25px' }}>
          Enter the token number the receptionist gave you to track your position in the queue.
        </p>
        <div className="input-group" style={{ justifyContent: 'center' }}>
          <input
            type="number"
            placeholder="e.g., 1, 2, 3..."
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onKeyDown={handleTokenKeyDown}
            min="1"
            autoFocus
            style={{ maxWidth: '200px', textAlign: 'center', fontSize: '1.2rem' }}
          />
        </div>
        <button
          className="btn btn-success btn-lg"
          onClick={handleSubmitToken}
          disabled={!tokenInput.trim()}
        >
          ✅ Track My Position
        </button>
        <p style={{ color: '#aaa', fontSize: '0.8rem', marginTop: '15px' }}>
          Don't have a token? Ask the receptionist to add you first!
        </p>
      </div>
    </div>
  ) : null;

  // ======= HEADER =======
  const header = (
    <div className="patient-header" style={{ textAlign: 'center', padding: '20px', color: 'white' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '5px' }}>👥 Patient Waiting Room</h1>
      <p>See real-time queue status — no more guessing when you'll be seen</p>
      <div className="live-indicator" style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: 'rgba(255,255,255,0.15)', padding: '6px 16px',
        borderRadius: '20px', fontSize: '0.85rem', marginTop: '10px'
      }}>
        <span style={{ width: '8px', height: '8px', background: '#48bb78', borderRadius: '50%', animation: 'pulse 1.5s infinite', display: 'inline-block' }}></span>
        <span>Live — Updates automatically</span>
      </div>
      <div style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <span className={`status-badge ${queueOpen ? 'active' : 'waiting'}`}>
          {queueOpen ? '🟢 Clinic Open' : '🔴 Clinic Closed'}
        </span>
        {queuePauseReason && pauseReasonDisplay[queuePauseReason] && (
          <span className={`status-badge ${pauseReasonDisplay[queuePauseReason].cls || ''}`}
            style={queuePauseReason === 'clinic-closed' ? { background: '#fed7d7', color: '#9b2c2c' } : {}}>
            {pauseReasonDisplay[queuePauseReason].text}
          </span>
        )}
        {myToken && (
          <span className="status-badge waiting" style={{ cursor: 'pointer' }} onClick={resetToken}>
            {isComplete ? '✅ Completed Checkup' : `🔄 Tracking Token #${myToken}`} — Click to change
          </span>
        )}
      </div>
    </div>
  );

  // ======= COMPLETION BANNER =======
  const completionBanner = isComplete ? (
    <div className="card" style={{
      border: '3px solid #48bb78',
      background: 'linear-gradient(135deg, #f0fff4, #c6f6d5)',
      textAlign: 'center', padding: '30px', marginBottom: '20px'
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '10px' }}>✅</div>
      <h2 style={{ color: '#276749', marginBottom: '5px' }}>Your Checkup is Complete!</h2>
      <p style={{ color: '#555', marginBottom: '15px', fontSize: '1rem' }}>
        Token #{myToken} — Thank you for visiting. We hope you feel better! 🙏
      </p>
      <div style={{ marginTop: '15px' }}>
        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '10px' }}>
          Press <kbd style={{ background: '#667eea', color: 'white', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>T</kbd> to track a different token
        </p>
        <button className="btn btn-primary" onClick={resetToken} style={{ padding: '8px 20px', fontSize: '0.9rem' }}>
          🔄 Track New Token
        </button>
      </div>
    </div>
  ) : null;

  // ======= NOW SERVING =======
  const nowServingCard = (
    <div className="card" style={{
      background: isComplete
        ? 'linear-gradient(135deg, #48bb78, #38a169)'
        : 'linear-gradient(135deg, #667eea, #764ba2)',
      color: 'white',
      textAlign: 'center', padding: '40px'
    }}>
      <div className="token-label" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem' }}>
        {isComplete ? '✅ Your Appointment' : 'Currently Serving'}
      </div>
      <div className="token-number" style={{ color: 'white', fontSize: '6rem', textShadow: '2px 2px 8px rgba(0,0,0,0.2)' }}>
        {isComplete ? '✅' : (currentToken ? currentToken.token : '---')}
      </div>
      <div className="token-name" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.5rem' }}>
        {isComplete ? 'Done!' : (currentToken ? currentToken.name : 'Waiting for first patient...')}
      </div>
      {isCurrentlyServingMe && !isComplete && (
        <span className="status-badge active" style={{ marginTop: '15px', fontSize: '1rem', padding: '8px 24px' }}>
          👈 You are here!
        </span>
      )}
    </div>
  );

  // ======= STATS =======
  const statsGrid = (
    <div className="stats-grid">
      <div className="stat-card" style={{
        background: isComplete ? '#c6f6d5' : (isCurrentlyServingMe ? '#c6f6d5' : '#f7fafc'),
        borderRadius: '16px', padding: '30px', marginBottom: '20px', textAlign: 'center'
      }}>
        <div className="big-number" style={{ fontSize: '3rem', fontWeight: 800, color: '#667eea' }}>
          {isComplete ? '—' : (isCurrentlyServingMe ? '0' : foundMyToken ? positionInQueue : 'N/A')}
        </div>
        <div className="label" style={{ color: '#888', fontSize: '0.95rem' }}>
          {isComplete ? 'Status' : (isInQueueOrCurrent ? 'People Ahead' : 'Token Not Found')}
        </div>
      </div>
      <div className="stat-card" style={{
        background: isComplete ? '#c6f6d5' : (isCurrentlyServingMe ? '#c6f6d5' : '#f7fafc'),
        borderRadius: '16px', padding: '30px', marginBottom: '20px', textAlign: 'center'
      }}>
        <div className="big-number" style={{ fontSize: '3rem', fontWeight: 800, color: '#667eea' }}>
          {isComplete ? '0' : (isCurrentlyServingMe ? '0' : foundMyToken ? (positionInQueue + 1) * avgConsultationTime + queuePauseDelay : '—')}
        </div>
        <div className="label" style={{ color: '#888', fontSize: '0.95rem' }}>
          {isComplete ? 'Wait (min)' : (isInQueueOrCurrent ? `Est. Wait${queuePauseDelay > 0 ? ' (incl. delay)' : ''}` : '')}
        </div>
      </div>
      <div className="stat-card" style={{
        background: '#f7fafc', borderRadius: '16px', padding: '30px', marginBottom: '20px', textAlign: 'center'
      }}>
        <div className="big-number" style={{ fontSize: '3rem', fontWeight: 800, color: '#667eea' }}>{queue.length}</div>
        <div className="label" style={{ color: '#888', fontSize: '0.95rem' }}>Total in Queue</div>
      </div>
      <div className="stat-card" style={{
        background: '#f7fafc', borderRadius: '16px', padding: '30px', marginBottom: '20px', textAlign: 'center'
      }}>
        <div className="big-number" style={{ fontSize: '3rem', fontWeight: 800, color: '#667eea' }}>{avgConsultationTime}</div>
        <div className="label" style={{ color: '#888', fontSize: '0.95rem' }}>Avg Consult (min)</div>
      </div>
    </div>
  );

  // ======= QUEUE DISPLAY =======
  const queueDisplay = (
    <div className="card">
      <h3 style={{ marginBottom: '15px', color: '#444' }}>📋 Queue Status</h3>
      {queue.length === 0 && !currentToken ? (
        <div className="empty-waiting" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🛋️</div>
          <h3 style={{ color: '#444', marginBottom: '10px' }}>No patients in queue</h3>
          <p style={{ color: '#888' }}>Check back when the clinic starts accepting patients.</p>
        </div>
      ) : (
        <div>
          {currentToken && (
            <div style={{
              display: 'flex', alignItems: 'center', padding: '16px 20px',
              background: isCurrentlyServingMe ? '#c6f6d5' : 'white',
              borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              marginBottom: '10px', borderLeft: '4px solid #48bb78'
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: '#48bb78', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '0.9rem', color: 'white'
              }}>🟢</div>
              <div style={{ flex: 1, marginLeft: '15px' }}>
              <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#333' }}>
                Token #{currentToken.token} — {currentToken.name}
                {currentToken.phone && <span style={{ fontWeight: 400, color: '#555', marginLeft: '8px', fontSize: '0.9rem' }}>📞 {currentToken.phone}</span>}
              </div>
                <div style={{ color: '#276749', fontSize: '0.85rem', marginTop: '2px' }}>
                  Currently in consultation {isCurrentlyServingMe ? '👈 You are here!' : ''}
                  {queuePauseDelay > 0 && !isCurrentlyServingMe && ` (${queuePauseDelay} min delay)`}
                </div>
              </div>
              <span style={{
                background: '#c6f6d5', color: '#276749', padding: '4px 12px',
                borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600
              }}>In Progress</span>
            </div>
          )}

          {queue.map((patient, index) => {
            const isMe = patient.token === myToken;
            const waitMinutes = (index + 1) * avgConsultationTime + queuePauseDelay;
            return (
              <div key={patient.token} style={{
                display: 'flex', alignItems: 'center', padding: '16px 20px',
                background: isMe ? '#eef2ff' : 'white',
                borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                marginBottom: '10px',
                border: isMe ? '2px solid #667eea' : 'none'
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: '#667eea', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.9rem'
                }}>{index + 1}</div>
                <div style={{ flex: 1, marginLeft: '15px' }}>
                  <div style={{ fontWeight: 600, color: '#333' }}>
                    Token #{patient.token} — {patient.name} {isMe ? '👈 (You)' : ''}
                    {patient.phone && <span style={{ fontWeight: 400, color: '#888', marginLeft: '6px', fontSize: '0.85rem' }}>📞 {patient.phone}</span>}
                  </div>
                  <div style={{ color: '#888', fontSize: '0.85rem', marginTop: '2px' }}>
                    Est. wait: ~{waitMinutes} min{queuePauseDelay > 0 ? ` (+${queuePauseDelay} min delay)` : ''}
                  </div>
                </div>
                <span style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
                  background: isMe ? '#c6f6d5' : '#fefcbf',
                  color: isMe ? '#276749' : '#975a16'
                }}>
                  {isMe ? 'Your Turn' : `${index + 1}${index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'} in line`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="container">
      {tokenPromptModal}
      {header}
      {completionBanner}
      {nowServingCard}
      {statsGrid}
      {queueDisplay}

      <div className="nav-links">
        <Link to="/" className="btn btn-primary">🏠 Home</Link>
        <Link to="/receptionist" className="btn btn-primary">🖥️ Receptionist View</Link>
      </div>

      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', marginTop: '20px', fontSize: '0.85rem' }}>
        🔄 This page updates automatically — no refresh needed
      </p>
      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: '10px', fontSize: '0.8rem' }}>
        Press 'T' to enter a different token number
      </p>
    </div>
  );
}

export default WaitingRoom;