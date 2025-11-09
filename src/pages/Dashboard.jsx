import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Header from '../components/Header';
import cowBg from '../assets/background.jpg';
import './Dashboard.css';

import { GiCow } from 'react-icons/gi'; 
import { HiMiniSignal } from "react-icons/hi2"; 
import { IoStatsChart } from 'react-icons/io5'; 
import { IoWarning } from 'react-icons/io5'; 

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
      <Header 
        title="Dashboard" 
        isCollapsed={isNavbarCollapsed}
      />
      <div 
        className={`dashboard-container ${isNavbarCollapsed ? 'collapsed' : ''}`}
        style={{ '--cow-bg': `url(${cowBg})` }}
      >
        <div className="dashboard-content">
          {loading ? (
            <div className="loading">Carregando...</div>
          ) : (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <HiMiniSignal />
                </div>
                <div className="stat-info">
                  <h3>Colares Ativos</h3>
                  <p className="stat-number">{stats.activeCollars}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <GiCow />
                </div>
                <div className="stat-info">
                  <h3>Total de Animais</h3>
                  <p className="stat-number">{stats.totalAnimals}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <IoStatsChart />
                </div>
                <div className="stat-info">
                  <h3>Leituras Hoje</h3>
                  <p className="stat-number">{stats.todayReadings}</p>
                </div>
              </div>

              <div className="stat-card alert">
                <div className="stat-icon">
                  <IoWarning />
                </div>
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