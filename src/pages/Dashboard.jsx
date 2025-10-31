import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import cowBg from '../assets/background.jpg';
import './Dashboard.css';



function Dashboard() {
  const [stats, setStats] = useState({
    activeCollars: 0,
    totalAnimals: 0,
    todayReadings: 0,
    alerts: 0
  });
  const [loading, setLoading] = useState(true);
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar onToggle={setIsNavbarCollapsed} />
      <div 
        className={`dashboard-container ${isNavbarCollapsed ? 'collapsed' : ''}`}
        style={{
          '--cow-bg': `url(${cowBg})`
        }}
      >
        <div className="dashboard-content">
          <h1>Dashboard</h1>
          
          {loading ? (
            <div className="loading">Carregando...</div>
          ) : (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📡</div>
                <div className="stat-info">
                  <h3>Colares Ativos</h3>
                  <p className="stat-number">{stats.activeCollars}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🐄</div>
                <div className="stat-info">
                  <h3>Total de Animais</h3>
                  <p className="stat-number">{stats.totalAnimals}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <h3>Leituras Hoje</h3>
                  <p className="stat-number">{stats.todayReadings}</p>
                </div>
              </div>

              <div className="stat-card alert">
                <div className="stat-icon">⚠️</div>
                <div className="stat-info">
                  <h3>Alertas Ativos</h3>
                  <p className="stat-number">{stats.alerts}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Dashboard;