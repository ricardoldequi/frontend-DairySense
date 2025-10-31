import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css?v=2'; // Adiciona versão para forçar reload

function Navbar({ onToggle }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (onToggle) onToggle(newState);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <>
      <nav className={`navbar ${isCollapsed ? 'collapsed' : ''}`}>
        <button 
          className="toggle-btn" 
          onClick={handleToggle}
          aria-label="Toggle menu"
        >
          {isCollapsed ? '☰' : '✕'}
        </button>

        <div className="navbar-header">
          <h2 className="navbar-title">DairySense</h2>
        </div>

        <div className="navbar-links">
          <Link to="/dashboard">
            <span className="icon">📊</span>
            <span className="label">Dashboard</span>
          </Link>
          <Link to="/animals">
            <span className="icon">🐄</span>
            <span className="label">Animais</span>
          </Link>
          <Link to="/devices">
            <span className="icon">📡</span>
            <span className="label">Dispositivos</span>
          </Link>
          <Link to="/readings">
            <span className="icon">📈</span>
            <span className="label">Leituras</span>
          </Link>
          <Link to="/alerts">
            <span className="icon">⚠️</span>
            <span className="label">Alertas</span>
          </Link>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          <span className="icon">🚪</span>
          <span className="label">Sair</span>
        </button>
      </nav>

      <div className={`navbar-overlay ${isCollapsed ? '' : 'active'}`} 
           onClick={handleToggle} />
    </>
  );
}

export default Navbar;
