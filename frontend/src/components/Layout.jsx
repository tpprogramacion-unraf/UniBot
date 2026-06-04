import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useState } from 'react'

const nav = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/materias', label: 'Materias', icon: '📚' },
  { to: '/calendar', label: 'Calendario', icon: '📅' },
  { to: '/brain-drain', label: 'Brain Drain', icon: '🧠' },
  { to: '/flashcards', label: 'Flashcards', icon: '⚡' },
  { to: '/exams', label: 'Parciales', icon: '📝' },
  { to: '/chat', label: 'UniBot AI', icon: '✨' },
  { to: '/summaries', label: 'Resúmenes', icon: '📄' },
  { to: '/collab', label: 'Collab Mode', icon: '👥' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMobile = () => setMobileOpen(false)

  return (
    <div className="macos-desktop" style={{
      width: '100vw',
      height: '100vh',
      background: 'url("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop") center/cover no-repeat',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative'
    }}>
      
      {/* Main Container */}
      <div style={{ flex: 1, padding: '2vh 2vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        
        {/* The App Window */}
        <div className="macos-app-window" style={{
          width: '100%',
          maxWidth: '1800px',
          height: '100%',
          maxHeight: '96vh',
          background: theme === 'dark' ? 'rgba(30, 30, 30, 0.4)' : 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(60px) saturate(200%)',
          WebkitBackdropFilter: 'blur(60px) saturate(200%)',
          borderRadius: '16px',
          border: theme === 'dark' ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.4)',
          display: 'flex',
          overflow: 'hidden',
          position: 'relative'
        }}>
          
          {/* Botón hamburger — solo visible en mobile */}
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(o => !o)}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>

          {/* Overlay oscuro detrás del sidebar en mobile */}
          {mobileOpen && (
            <div className="sidebar-overlay open" onClick={closeMobile} />
          )}

          <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
            <div className="sidebar-header" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F56', border: '1px solid #E0443E', boxShadow: 'inset 0 1px 4px rgba(255,255,255,0.5)' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFBD2E', border: '1px solid #DEA123', boxShadow: 'inset 0 1px 4px rgba(255,255,255,0.5)' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27C93F', border: '1px solid #1AAB29', boxShadow: 'inset 0 1px 4px rgba(255,255,255,0.5)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {!collapsed && <span className="logo-text">UniBot</span>}
                {collapsed && <span className="logo-icon">U</span>}
                <button type="button" className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
                  {collapsed ? '→' : '←'}
                </button>
              </div>
            </div>

            <nav className="sidebar-nav">
              {nav.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!collapsed && <span className="nav-label">{item.label}</span>}
                </NavLink>
              ))}
            </nav>

            <div className="sidebar-footer">
              {!collapsed && (
                <div className="user-info">
                  <div className="user-avatar">{user?.username?.[0]?.toUpperCase()}</div>
                  <div className="user-details">
                    <span className="user-name">{user?.username}</span>
                    <span className="user-email">{user?.email}</span>
                  </div>
                </div>
              )}
              <button type="button" className="theme-btn" onClick={toggle} title="toggle theme">
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button type="button" className="logout-btn" onClick={async () => { await logout(); navigate('/login') }} title="logout">
                ⏏
              </button>
            </div>
          </aside>

          <main className="main-content">
            <Outlet />
          </main>
        </div>
      </div>
      
    </div>
  )
}