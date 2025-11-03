import './Header.css';
import dairyLogo from '../assets/DairyLogo.png';

function Header({ title, subtitle, isCollapsed }) {
  return (
    <header className={`top-header ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="top-header-content">
        <div className="header-text">
          <h1 className="header-title">{title}</h1>
          {subtitle && <span className="header-subtitle">{subtitle}</span>}
        </div>
        <div className="header-branding">
          <img src={dairyLogo} alt="DairySense Logo" className="brand-icon" />
          <span className="brand-name">DairySense</span>
        </div>
      </div>
    </header>
  );
}

export default Header;