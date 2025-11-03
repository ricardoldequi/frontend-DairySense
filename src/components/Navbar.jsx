import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { VscLayoutSidebarLeft } from "react-icons/vsc";
import { MdDashboardCustomize } from "react-icons/md";
import { GiCow } from "react-icons/gi";
import { RiAlertFill } from "react-icons/ri";
import { GiMovementSensor } from "react-icons/gi";
import { GiExitDoor } from "react-icons/gi";
import { MdSensors } from "react-icons/md";
import './Navbar.css?v=4';

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
          {isCollapsed ? (
            <VscLayoutSidebarLeft className="navbar-icon-collapsed" />
          ) : (
            <h2 className="navbar-title">Menu</h2>
          )}
        </div>

        <div className="navbar-links">
          <Link to="/dashboard">
            <span className="icon"><MdDashboardCustomize /></span>
            <span className="label">Dashboard</span>
          </Link>
          <Link to="/animals">
            <span className="icon"><GiCow /></span>
            <span className="label">Animais</span>
          </Link>
          <Link to="/devices">
            <span className="icon"><MdSensors /></span>
            <span className="label">Dispositivos</span>
          </Link>
          <Link to="/readings">
            <span className="icon"><GiMovementSensor /></span>
            <span className="label">Leituras</span>
          </Link>
          <Link to="/alerts">
            <span className="icon"><RiAlertFill /></span>
            <span className="label">Alertas</span>
          </Link>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          <span className="icon"><GiExitDoor /></span>
          <span className="label">Sair</span>
        </button>
      </nav>

      <div className={`navbar-overlay ${isCollapsed ? '' : 'active'}`} 
           onClick={handleToggle} />
    </>
  );
}

export default Navbar;
