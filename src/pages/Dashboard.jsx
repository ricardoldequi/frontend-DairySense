import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Header from '../components/Header';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import cowBg from '../assets/background.jpg';
import './Dashboard.css';

import { GiCow } from 'react-icons/gi'; 
import { HiMiniSignal } from "react-icons/hi2"; 
import { IoStatsChart } from 'react-icons/io5'; 
import { IoWarning } from 'react-icons/io5'; 
import { MdAccessTime } from 'react-icons/md';
import { BsHourglassSplit } from 'react-icons/bs';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function Dashboard() {
  const [stats, setStats] = useState({
    activeCollars: 0,
    totalAnimals: 0,
    todayReadings: 0,
    alerts: 0
  });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [activeAnimalsData, setActiveAnimalsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchRecentAlerts();
    fetchActiveAnimalsReadings();
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

  const fetchRecentAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 5);

      const params = new URLSearchParams({
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      });

      const [alertsRes, animalsRes] = await Promise.all([
        fetch(`http://localhost:3000/api/alerts?${params}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('http://localhost:3000/api/animals', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (alertsRes.ok && animalsRes.ok) {
        const alertsData = await alertsRes.json();
        const animalsData = await animalsRes.json();

        const alertsWithAnimalInfo = alertsData.map(alert => {
          const animal = animalsData.find(a => a.id === alert.animal_id);
          return {
            ...alert,
            animal_name: animal?.name || 'Animal desconhecido'
          };
        });

        setRecentAlerts(alertsWithAnimalInfo);
      }
    } catch (error) {
      console.error('Erro ao carregar alertas recentes:', error);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const fetchActiveAnimalsReadings = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [animalsRes, deviceAnimalsRes] = await Promise.all([
        fetch('http://localhost:3000/api/animals', { headers }),
        fetch('http://localhost:3000/api/device_animals', { headers })
      ]);

      if (!animalsRes.ok || !deviceAnimalsRes.ok) {
        throw new Error('Falha ao buscar dados');
      }

      const animals = await animalsRes.json();
      const deviceAnimals = await deviceAnimalsRes.json();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const activeDeviceAnimals = deviceAnimals.filter(da => {
        if (!da.end_date) return true;
        const endDate = new Date(da.end_date);
        return endDate > today;
      });

      const last24h = new Date();
      last24h.setHours(last24h.getHours() - 24);

      const animalsWithReadings = await Promise.all(
        activeDeviceAnimals.map(async (da) => {
          const animal = animals.find(a => a.id === da.animal_id);
          if (!animal) return null;

          try {
            const [readingsRes, baselinesRes] = await Promise.all([
              fetch(
                `http://localhost:3000/api/readings?${new URLSearchParams({
                  animal_id: animal.id.toString(),
                  start_date: last24h.toISOString(),
                  end_date: new Date().toISOString()
                })}`,
                { headers }
              ),
              fetch(
                `http://localhost:3000/api/animals/${animal.id}/activity_baselines/latest`,
                { headers }
              )
            ]);

            const readings = readingsRes.ok ? await readingsRes.json() : [];
            const baselines = baselinesRes.ok ? await baselinesRes.json() : [];

            const readingsWithMagnitude = readings.map(r => ({
              ...r,
              magnitude: Math.sqrt(
                (r.accel_x || 0) ** 2 + 
                (r.accel_y || 0) ** 2 + 
                (r.accel_z || 0) ** 2
              )
            }));

            return {
              animal,
              readings: readingsWithMagnitude,
              baselines: baselines,
              hasData: readingsWithMagnitude.length > 0,
              hasBaseline: baselines.length > 0
            };
          } catch (error) {
            console.error(`Erro ao buscar dados para ${animal.name}:`, error);
            return {
              animal,
              readings: [],
              baselines: [],
              hasData: false,
              hasBaseline: false
            };
          }
        })
      );

      setActiveAnimalsData(animalsWithReadings.filter(Boolean));
    } catch (error) {
      console.error('Erro ao carregar dados dos animais ativos:', error);
    } finally {
      setLoadingCharts(false);
    }
  };

  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateTimeString) => {
    const now = new Date();
    const alertDate = new Date(dateTimeString);
    const diffMs = now - alertDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `Há ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `Há ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    } else {
      return `Há ${diffDays} dia${diffDays !== 1 ? 's' : ''}`;
    }
  };

  const generateChartData = (readings, baselines) => {
    console.log('=== GENERATE CHART DATA ===');
    console.log('Readings count:', readings.length);
    console.log('Baselines count:', baselines?.length || 0);
    console.log('Baselines raw:', baselines);

    const labels = readings.map(r => {
      const dt = new Date(r.collected_at);
      return dt.toLocaleString('pt-BR', { 
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    });

    const magnitudes = readings.map(r => r.magnitude);

    const datasets = [
      {
        label: 'Atividade Real (Magnitude)',
        data: magnitudes,
        borderColor: 'rgb(33, 150, 243)',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: 'rgb(33, 150, 243)',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        borderWidth: 2
      }
    ];

    if (baselines && baselines.length > 0) {
      console.log('Processando baselines...');
      
      const baselineByHour = {};
      baselines.forEach(b => {
        const hour = parseInt(b.hour_of_day, 10);
        const baseline = parseFloat(b.baseline_enmo);
        const mad = parseFloat(b.mad_enmo);
        
        console.log(`Baseline hora ${hour}: baseline=${baseline}, mad=${mad}`);
        
        baselineByHour[hour] = {
          baseline: baseline,
          mad: mad
        };
      });

      console.log('BaselineByHour map:', baselineByHour);

      const baselineData = [];
      const thresholdData = [];

      readings.forEach((r, index) => {
        const dt = new Date(r.collected_at);
        const hour = dt.getHours();
        
        if (baselineByHour[hour] !== undefined) {
          const baseline = baselineByHour[hour].baseline;
          const mad = baselineByHour[hour].mad;
          const threshold = baseline + (3 * mad);
          
          console.log(`Reading ${index} hora ${hour}: baseline=${baseline}, threshold=${threshold}`);
          
          baselineData.push(baseline);
          thresholdData.push(threshold);
        } else {
          console.log(`Reading ${index} hora ${hour}: SEM BASELINE`);
          baselineData.push(null);
          thresholdData.push(null);
        }
      });

      console.log('BaselineData array:', baselineData);
      console.log('ThresholdData array:', thresholdData);

      const hasValidBaseline = baselineData.some(v => v !== null && !isNaN(v));
      
      console.log('Has valid baseline?', hasValidBaseline);

      if (hasValidBaseline) {
        console.log('Adicionando datasets de baseline...');
        
        datasets.push(
          {
            label: 'Baseline (Média Histórica)',
            data: baselineData,
            borderColor: 'rgb(255, 152, 0)',
            backgroundColor: 'transparent',
            borderDash: [10, 5],
            borderWidth: 2.5,
            pointRadius: 3,
            pointBackgroundColor: 'rgb(255, 152, 0)',
            pointBorderColor: '#fff',
            pointBorderWidth: 1,
            pointHoverRadius: 6,
            fill: false,
            spanGaps: false,
            tension: 0
          },
          {
            label: 'Limiar de Alerta',
            data: thresholdData,
            borderColor: 'rgb(244, 67, 54)',
            backgroundColor: 'rgba(244, 67, 54, 0.05)',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: 'rgb(244, 67, 54)',
            pointBorderColor: '#fff',
            pointBorderWidth: 1,
            pointHoverRadius: 6,
            fill: '-1',
            spanGaps: false,
            tension: 0
          }
        );
        
        console.log('Datasets totais:', datasets.length);
      } else {
        console.log('Nenhum valor válido de baseline encontrado');
      }
    } else {
      console.log('Nenhuma baseline disponível');
    }

    console.log('=== FIM GENERATE CHART DATA ===');

    return {
      labels,
      datasets
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 10,
          font: { size: 10, weight: '600' }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 11 },
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(4);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Magnitude (m/s²)',
          font: { size: 11, weight: 'bold' }
        },
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: {
          callback: function(value) {
            return value.toFixed(2);
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Data/Hora',
          font: { size: 11, weight: 'bold' }
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: 10,
          font: { size: 9 }
        },
        grid: { color: 'rgba(0, 0, 0, 0.05)' }
      }
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
            <>
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

              <div className="alerts-section">
                <div className="alerts-header">
                  <h2>
                    <IoWarning style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Alertas Recentes (Últimos 5 dias)
                  </h2>
                </div>

                {loadingAlerts ? (
                  <div className="alerts-loading">Carregando alertas...</div>
                ) : recentAlerts.length === 0 ? (
                  <div className="alerts-empty">
                    <IoWarning style={{ fontSize: '3rem', color: '#ccc' }} />
                    <p>Nenhum alerta nos últimos 5 dias</p>
                  </div>
                ) : (
                  <div className="alerts-list">
                    {recentAlerts.map((alert) => (
                      <div key={alert.id} className="alert-item">
                        <div className="alert-icon">
                          <IoWarning />
                        </div>
                        <div className="alert-content">
                          <p className="alert-message">
                            Houve uma suspeita de cio para o animal{' '}
                            <strong>{alert.animal_name}</strong> às{' '}
                            <strong>{formatDateTime(alert.detected_at)}</strong>
                          </p>
                          <div className="alert-meta">
                            <span className="alert-time">
                              <MdAccessTime />
                              {getTimeAgo(alert.detected_at)}
                            </span>
                            {alert.z_score && (
                              <span className="alert-score">
                                Z-Score: {parseFloat(alert.z_score).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="charts-section">
                <div className="charts-header">
                  <h2>
                    <IoStatsChart style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Atividade dos Animais Ativos (Últimas 24 horas)
                  </h2>
                </div>

                {loadingCharts ? (
                  <div className="charts-loading">
                    <BsHourglassSplit style={{ fontSize: '2rem', color: '#004aad' }} />
                    <p>Carregando dados dos animais...</p>
                  </div>
                ) : activeAnimalsData.length === 0 ? (
                  <div className="charts-empty">
                    <GiCow style={{ fontSize: '3rem', color: '#ccc' }} />
                    <p>Nenhum animal ativo no momento</p>
                  </div>
                ) : (
                  <div className="charts-grid">
                    {activeAnimalsData.map((animalData) => (
                      <div key={animalData.animal.id} className="chart-item">
                        <div className="chart-item-header">
                          <h3>{animalData.animal.name}</h3>
                          <div className="chart-badges">
                            {animalData.animal.earring && (
                              <span className="chart-earring">Brinco: {animalData.animal.earring}</span>
                            )}
                            {animalData.hasBaseline && (
                              <span className="chart-baseline-badge">Com Baseline</span>
                            )}
                          </div>
                        </div>
                        
                        {animalData.hasData ? (
                          <div className="chart-item-body">
                            <div className="chart-wrapper-small">
                              <Line 
                                data={generateChartData(animalData.readings, animalData.baselines)} 
                                options={chartOptions} 
                              />
                            </div>
                            <div className="chart-item-footer">
                              <span className="readings-count">
                                {animalData.readings.length} leituras
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="chart-no-data">
                            <BsHourglassSplit style={{ fontSize: '2rem', color: '#999' }} />
                            <p>Não há dados nas últimas 24 horas</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default Dashboard;