import { Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getToken, setToken, api } from './apiClient';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import Dashboard from './pages/Dashboard';
import PersonDetail from './pages/PersonDetail';
import GraphPage from './pages/GraphPage';

export default function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (getToken()) {
      api('/api/v1/auth/me').then(setUser).catch(() => setToken(null));
    }
  }, []);

  function handleLogout() {
    setToken(null);
    setUser(null);
    navigate('/login');
  }

  if (!getToken()) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={setUser} />} />
        <Route path="/register" element={<RegisterPage onLogin={setUser} />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">Family Tree</div>
        <nav className="sidebar-nav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            <span>📋</span> Dashboard
          </Link>
          <Link to="/graph" className={location.pathname === '/graph' ? 'active' : ''}>
            <span>🌳</span> Family Tree
          </Link>
        </nav>
        <div className="sidebar-footer">
          {user && (
            <div className="user-info">
              <strong>{user.email || 'User'}</strong><br />
              <span className="badge badge-purple">{user.role}</span>
            </div>
          )}
          <button onClick={handleLogout} className="logout-btn">
            🚪 Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/people/:id" element={<PersonDetail user={user} />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
