import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setToken } from '../apiClient';

export default function RegisterPage({ onLogin }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [currentCity, setCurrentCity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ firstName, lastName, familyName, currentCity, email, password })
      });
      setToken(data.accessToken);
      onLogin(data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🌳</div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Start building your family tree today</p>
        </div>
        
        {error && <div className="alert alert-error">{error}</div>}
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input 
                type="text"
                className="form-input"
                placeholder="e.g., Ahmed" 
                value={firstName} 
                onChange={e => setFirstName(e.target.value)} 
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input 
                type="text"
                className="form-input"
                placeholder="e.g., Ben Ali" 
                value={lastName} 
                onChange={e => setLastName(e.target.value)} 
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Family Name</label>
            <input 
              type="text"
              className="form-input"
              placeholder="e.g., Ben Ali, Trabelsi (will join if exists)" 
              value={familyName} 
              onChange={e => setFamilyName(e.target.value)} 
              required
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              If this family already exists, you'll automatically join it
            </small>
          </div>
          <div className="form-group">
            <label className="form-label">Current City</label>
            <input 
              type="text"
              className="form-input"
              placeholder="e.g., Tunis, Sfax, Sousse" 
              value={currentCity} 
              onChange={e => setCurrentCity(e.target.value)} 
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email"
              className="form-input"
              placeholder="you@example.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password"
              className="form-input"
              placeholder="••••••••" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{width: '100%', justifyContent: 'center'}} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
