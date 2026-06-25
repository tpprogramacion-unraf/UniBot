import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import '../premium.css';

export default function Login() {
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Spotlight state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(form.username, form.password);
      navigate('/');
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        Object.values(err.response?.data || {})
          .flat()
          .join(' ') ||
        'Credenciales inválidas';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* GLOBAL THEME BACKGROUND */}
      <div className="auth-bg" />
      
      {/* Background Floating Particles */}
      <div className="auth-particles">
        <div className="particle particle-1"></div>
        <div className="particle particle-2"></div>
        <div className="particle particle-3"></div>
      </div>

      <div 
        ref={cardRef}
        className="auth-glass-card"
        onMouseMove={handleMouseMove}
        style={{ '--mouse-x': `${mousePos.x}px`, '--mouse-y': `${mousePos.y}px` }}
      >
        <div className="card-spotlight"></div>

        <button type="button" className="auth-theme-btn" onClick={toggle}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <div className="auth-brand">
          <h1>UniBot</h1>
          <p>Ecosistema Académico</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label htmlFor="login-user">Usuario</label>
            <input
              id="login-user"
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Tu nombre de usuario"
              required
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="login-pass">Contraseña</label>
            <input
              id="login-pass"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="auth-link">
          ¿No tenés cuenta? <Link to="/register">Registrate</Link>
        </p>
      </div>
    </div>
  );
}