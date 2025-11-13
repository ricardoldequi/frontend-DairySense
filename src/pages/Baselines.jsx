import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Header from '../components/Header';
import CustomSelect from '../components/CustomSelect';
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
import { MdCalendarMonth, MdFindInPage, MdBlurLinear, MdDelete } from 'react-icons/md';
import { FaCircleInfo, FaListUl } from 'react-icons/fa6';
import { FiAlertOctagon } from 'react-icons/fi';
import { IoWarningOutline, IoCheckmarkCircle } from 'react-icons/io5';
import { BsHourglassSplit } from 'react-icons/bs';
import './Baselines.css';
import { API_BASE_URL } from '../config/api';

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

const API_BASE = API_BASE_URL; 

function Baselines() {
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(false);
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showBaselines, setShowBaselines] = useState(false);
  const [baselines, setBaselines] = useState([]);
  const [loadingBaselines, setLoadingBaselines] = useState(false);
  
  const [form, setForm] = useState({
    animal_id: '',
    start_date: '',
    end_date: ''
  });

  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const res = await fetch(`${API_BASE}/animals`, { headers });

      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/';
        return;
      }

      if (!res.ok) throw new Error('Falha ao carregar animais');

      const data = await res.json();
      setAnimals(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erro ao buscar dados:', e);
      setError('Erro ao carregar dados. Recarregue a página.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setPreviewData(null);
  };

  const validatePeriod = () => {
    if (!form.start_date || !form.end_date) {
      return { valid: false, message: '', type: '' };
    }

    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (start > end) {
      return { valid: false, message: 'A data inicial não pode ser maior que a data final.', type: 'error' };
    }

    if (diffDays < 1) {
      return { valid: false, message: 'O período mínimo é de 1 dia.', type: 'warning' };
    }

    if (diffDays > 14) {
      return { valid: false, message: 'O período máximo é de 14 dias.', type: 'error' };
    }

    if (end > new Date()) {
      return { valid: false, message: 'Não é possível selecionar datas futuras.', type: 'error' };
    }

    return { valid: true, message: '', type: 'success' };
  };

  const handlePreview = async () => {
    if (!form.animal_id) {
      setError('Selecione um animal para continuar.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    const validation = validatePeriod();
    if (!validation.valid && validation.message) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    setLoadingPreview(true);
    setError('');
    setPreviewData(null);

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const startDateTime = new Date(form.start_date + 'T00:00:00');
      const endDateTime = new Date(form.end_date + 'T23:59:59.999');

      const params = new URLSearchParams({
        animal_id: form.animal_id,
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString()
      });

      const res = await fetch(
        `${API_BASE}/readings?${params}`,
        { headers }
      );

      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/';
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Falha ao buscar dados de atividade.');
      }

      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Nenhum dado encontrado para o período selecionado.');
      }

      // Calcular magnitude para cada reading
      const readingsWithMagnitude = data.map(r => ({
        ...r,
        magnitude: Math.sqrt(
          (r.accel_x || 0) ** 2 + 
          (r.accel_y || 0) ** 2 + 
          (r.accel_z || 0) ** 2
        )
      }));

      const magnitudes = readingsWithMagnitude.map(r => r.magnitude);
      const stats = {
        count: magnitudes.length,
        avg: (magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length).toFixed(4),
        min: Math.min(...magnitudes).toFixed(4),
        max: Math.max(...magnitudes).toFixed(4)
      };

      setPreviewData({
        readings: readingsWithMagnitude,
        stats: stats
      });

    } catch (e) {
      console.error('Erro ao buscar preview:', e);
      setError(e.message || 'Erro ao buscar dados. Tente novamente.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!previewData) {
      setError('Visualize os dados antes de criar a baseline.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    const validation = validatePeriod();
    if (!validation.valid && validation.message) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const params = new URLSearchParams({
        start: form.start_date,
        end: form.end_date,
        window: 10
      });

      const res = await fetch(`${API_BASE}/animals/${form.animal_id}/activity_baselines?${params}`, {
        method: 'POST',
        headers
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || 'Falha ao criar baseline.');
      }

      setSuccessMessage('Baseline criada com sucesso!');
      
      setForm({
        animal_id: '',
        start_date: '',
        end_date: ''
      });
      setPreviewData(null);

    } catch (e) {
      console.error('Erro ao criar baseline:', e);
      setError(e.message || 'Erro ao criar baseline. Tente novamente.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadBaselines = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    setLoadingBaselines(true);
    setError('');

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const animalsWithBaselines = [];
      
      for (const animal of animals) {
        const res = await fetch(`${API_BASE}/animals/${animal.id}/activity_baselines`, { headers });
        
        if (res.ok) {
          const data = await res.json();
          
          if (Array.isArray(data) && data.length > 0) {
            const groupedBaselines = {};
            
            data.forEach(baseline => {
              const key = `${baseline.period_start}_${baseline.period_end}`;
              
              if (!groupedBaselines[key]) {
                groupedBaselines[key] = {
                  animal_id: animal.id,
                  animal_name: animal.name,
                  animal_earring: animal.earring || '-',
                  period_start: baseline.period_start,
                  period_end: baseline.period_end,
                  created_at: baseline.created_at || new Date().toISOString(),
                  hours_count: 0
                };
              }
              
              groupedBaselines[key].hours_count++;
            });
            
            Object.values(groupedBaselines).forEach(grouped => {
              animalsWithBaselines.push(grouped);
            });
          }
        }
      }

      animalsWithBaselines.sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB - dateA;
      });
      
      setBaselines(animalsWithBaselines);
      setShowBaselines(true);

    } catch (e) {
      console.error('Erro ao carregar baselines:', e);
      setError('Erro ao carregar baselines. Tente novamente.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoadingBaselines(false);
    }
  };

  const handleDeleteBaseline = async (animalId, startDate, endDate) => {
    if (!window.confirm('Tem certeza que deseja excluir esta baseline? Esta ação não pode ser desfeita.')) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const params = new URLSearchParams({
        start: startDate,
        end: endDate
      });

      const res = await fetch(`${API_BASE}/animals/${animalId}/activity_baselines?${params}`, {
        method: 'DELETE',
        headers
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Falha ao excluir baseline.');
      }

      setSuccessMessage('Baseline excluída com sucesso!');
      handleLoadBaselines();

    } catch (e) {
      console.error('Erro ao excluir baseline:', e);
      setError(e.message || 'Erro ao excluir baseline. Tente novamente.');
      setTimeout(() => setError(''), 5000);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar onToggle={setIsNavbarCollapsed} />
        <Header 
          title="Criar Baseline de Atividade" 
          subtitle="Carregando..."
          isCollapsed={isNavbarCollapsed}
        />
        <div className={`baselines-container ${isNavbarCollapsed ? 'collapsed' : ''}`}>
          <div className="baselines-content">
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <BsHourglassSplit style={{ fontSize: '3rem', color: '#004aad' }} />
              <p>Carregando dados...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const selectedAnimal = animals.find(a => a.id === Number(form.animal_id));
  const maxDate = new Date().toISOString().split('T')[0];
  const periodValidation = validatePeriod();

  const animalOptions = animals.map(a => ({
    value: a.id.toString(),
    label: `${a.name}${a.earring ? ` (Brinco: ${a.earring})` : ''}`
  }));

  let chartData = null;
  let chartOptions = null;

  if (previewData) {
    const hourlyData = {};
    
    previewData.readings.forEach(r => {
      const dt = new Date(r.collected_at);
      const hourKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:00`;
      
      if (!hourlyData[hourKey]) {
        hourlyData[hourKey] = {
          magnitudes: [],
          count: 0,
          timestamp: dt
        };
      }
      
      hourlyData[hourKey].magnitudes.push(r.magnitude);
      hourlyData[hourKey].count++;
    });

    const startDate = new Date(form.start_date + 'T00:00:00');
    const endDate = new Date(form.end_date + 'T23:00:00');
    const allHours = [];
    
    for (let dt = new Date(startDate); dt <= endDate; dt.setHours(dt.getHours() + 1)) {
      const hourKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:00`;
      allHours.push({
        label: dt.toLocaleString('pt-BR', { 
          day: '2-digit', 
          month: '2-digit', 
          hour: '2-digit'
        }),
        hourKey: hourKey,
        data: hourlyData[hourKey] || null
      });
    }

    const labels = allHours.map(h => h.label);
    const magnitudes = allHours.map(h => {
      if (!h.data) return null; 
      const avg = h.data.magnitudes.reduce((a, b) => a + b, 0) / h.data.magnitudes.length;
      return parseFloat(avg.toFixed(4));
    });

    const validReadings = magnitudes.map((val, idx) => val !== null ? val : null);
    const missingReadings = magnitudes.map((val, idx) => val === null ? 0 : null);

    chartData = {
      labels,
      datasets: [
        {
          label: ' Média de Atividade (m/s²)',
          data: validReadings,
          borderColor: 'rgb(76, 175, 80)',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 8,
          pointHoverBackgroundColor: 'rgb(76, 175, 80)',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 3,
          borderWidth: 2.5,
          spanGaps: false
        },
        {
          label: ' Falhas (sem leitura)',
          data: missingReadings,
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          pointRadius: 6,
          pointHoverRadius: 10,
          pointBackgroundColor: 'rgb(244, 67, 54)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: 'rgb(244, 67, 54)',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 3,
          showLine: false
        }
      ]
    };

    chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: { size: 13, weight: '600' },
            generateLabels: (chart) => {
              const datasets = chart.data.datasets;
              return datasets.map((dataset, i) => ({
                text: dataset.label,
                fillStyle: dataset.pointBackgroundColor,
                strokeStyle: dataset.borderColor !== 'transparent' ? dataset.borderColor : dataset.pointBackgroundColor,
                lineWidth: 2,
                hidden: !chart.isDatasetVisible(i),
                index: i
              }));
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          padding: 12,
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
          callbacks: {
            title: (context) => {
              return ` ${context[0].label}`;
            },
            label: (context) => {
              if (context.datasetIndex === 0 && context.parsed.y !== null) {
                const hourData = allHours[context.dataIndex].data;
                return [
                  `Média: ${context.parsed.y.toFixed(4)} m/s²`,
                  `Leituras: ${hourData.count}`
                ];
              } else if (context.datasetIndex === 1) {
                return ' Sem leituras neste período';
              }
              return '';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Magnitude Média (m/s²)',
            font: { size: 14, weight: 'bold' },
            color: '#333'
          },
          grid: { 
            color: 'rgba(0, 0, 0, 0.08)',
            drawBorder: false
          },
          ticks: {
            font: { size: 11 },
            color: '#666'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Período (Dia/Mês - Hora)',
            font: { size: 14, weight: 'bold' },
            color: '#333'
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            font: { size: 10 },
            color: '#666',
            autoSkip: true,
            maxTicksLimit: 24
          },
          grid: { 
            color: 'rgba(0, 0, 0, 0.05)',
            drawBorder: false
          }
        }
      }
    };

    const validMagnitudes = magnitudes.filter(m => m !== null);
    previewData.stats = {
      count: previewData.readings.length,
      hours_with_data: validMagnitudes.length,
      hours_missing: allHours.length - validMagnitudes.length,
      avg: validMagnitudes.length > 0 ? (validMagnitudes.reduce((a, b) => a + b, 0) / validMagnitudes.length).toFixed(4) : '0',
      min: validMagnitudes.length > 0 ? Math.min(...validMagnitudes).toFixed(4) : '0',
      max: validMagnitudes.length > 0 ? Math.max(...validMagnitudes).toFixed(4) : '0'
    };
  }

  return (
    <>
      <Navbar onToggle={setIsNavbarCollapsed} />
      <Header 
        title="Criar Baseline de Atividade" 
        isCollapsed={isNavbarCollapsed}
      />
      <div className={`baselines-container ${isNavbarCollapsed ? 'collapsed' : ''}`}>
        <div className="baselines-content">
          <div className="page-actions">
            <button 
              className="btn secondary"
              onClick={() => {
                if (showBaselines) {
                  setShowBaselines(false);
                } else {
                  handleLoadBaselines();
                }
              }}
              disabled={loadingBaselines || loading}
            >
              {loadingBaselines ? (
                <>
                  <BsHourglassSplit />
                  Carregando...
                </>
              ) : showBaselines ? (
                <>
                  ✕
                  Ocultar Baselines
                </>
              ) : (
                <>
                  <MdBlurLinear />
                  Ver Baselines Cadastradas
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="banner error">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="banner success">
              <IoCheckmarkCircle style={{ fontSize: '1.5rem' }} />
              {successMessage}
            </div>
          )}

          {showBaselines ? (
            <div className="baselines-list-card">
              <div className="baselines-list-header">
                <h3>
                  <FaListUl style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  Baselines Cadastradas
                </h3>
                <p>Total: {baselines.length} baseline(s)</p>
              </div>

              {baselines.length === 0 ? (
                <div className="empty-state">
                  <MdBlurLinear style={{ fontSize: '3rem', color: '#ccc' }} />
                  <p>Nenhuma baseline cadastrada ainda.</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Animal</th>
                        <th>Brinco</th>
                        <th>Período</th>
                        <th>Criado em</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {baselines.map((baseline, index) => {
                        const formatDate = (dateStr) => {
                          if (!dateStr) return '-';
                          try {
                            const [year, month, day] = dateStr.split('-');
                            return `${day}/${month}/${year}`;
                          } catch (e) {
                            return dateStr;
                          }
                        };

                        return (
                          <tr key={`${baseline.animal_id}_${baseline.period_start}_${baseline.period_end}_${index}`}>
                            <td data-label="Animal">{baseline.animal_name}</td>
                            <td data-label="Brinco">{baseline.animal_earring}</td>
                            <td data-label="Período">
                              {baseline.period_start && baseline.period_end 
                                ? `${formatDate(baseline.period_start)} até ${formatDate(baseline.period_end)}`
                                : 'Data não disponível'}
                            </td>
                            <td data-label="Criado em">
                              {baseline.created_at 
                                ? new Date(baseline.created_at).toLocaleDateString('pt-BR')
                                : '-'}
                            </td>
                            <td data-label="Ações">
                              <button
                                className="btn-icon delete"
                                onClick={() => handleDeleteBaseline(
                                  baseline.animal_id,
                                  baseline.period_start,
                                  baseline.period_end
                                )}
                                title="Excluir baseline"
                              >
                                <MdDelete />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="info-banner">
                <FaCircleInfo className="info-icon" />
                <div className="info-content">
                  <strong>O que é uma baseline?</strong>
                  <p>A baseline representa o comportamento médio do animal em um período normal (sem cio). 
                  Ela será usada para comparar a atividade futura e identificar variações de comportamento.</p>
                  <p><strong>Escolha um período em que não houve cio detectado.</strong></p>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="filters-card">
                  <div className="filters-card-header">
                    <MdCalendarMonth className="filters-card-icon" />
                    <h3>Selecionar Animal e Período</h3>
                  </div>

                  <div className="form-section">
                    <div className="filter-group">
                      <CustomSelect
                        id="animal_id"
                        name="animal_id"
                        value={form.animal_id ? form.animal_id.toString() : ''}
                        onChange={(e) => {
                          setForm(prev => ({ ...prev, animal_id: e.target.value }));
                          setPreviewData(null);
                        }}
                        options={animalOptions}
                        placeholder="Selecione um animal"
                        label="Animal"
                        required={true}
                        disabled={loading || loadingPreview || submitting}
                      />
                    </div>

                    {selectedAnimal && (
                      <div className="animal-info">
                        <strong>Animal selecionado:</strong> 
                        {selectedAnimal.name} 
                        {selectedAnimal.earring && ` - Brinco: ${selectedAnimal.earring}`}
                      </div>
                    )}
                  </div>

                  <div className="form-section">
                    <div className="period-header">
                      <MdCalendarMonth className="period-icon" />
                      <h4>Período de Referência</h4>
                      <div className="period-info-wrapper">
                        <div className="period-info-btn">
                          <FaCircleInfo />
                        </div>
                        <div className="period-tooltip">
                          <strong>Período recomendado</strong>
                          <span>Entre 3 e 7 dias (máximo: 14 dias)</span>
                        </div>
                      </div>
                    </div>

                    <div className="filters-grid">
                      <div className="filter-group">
                        <label htmlFor="start_date">Data Início *</label>
                        <input
                          type="date"
                          id="start_date"
                          name="start_date"
                          value={form.start_date}
                          onChange={handleChange}
                          max={maxDate}
                          disabled={!form.animal_id || loadingPreview || submitting}
                          required
                        />
                      </div>

                      <div className="filter-group">
                        <label htmlFor="end_date">Data Fim *</label>
                        <input
                          type="date"
                          id="end_date"
                          name="end_date"
                          value={form.end_date}
                          onChange={handleChange}
                          min={form.start_date}
                          max={maxDate}
                          disabled={!form.start_date || loadingPreview || submitting}
                          required
                        />
                      </div>
                    </div>

                    {!periodValidation.valid && periodValidation.message && (
                      <div className={`period-alert ${periodValidation.type}`}>
                        {periodValidation.type === 'error' && <IoWarningOutline style={{ fontSize: '1.25rem' }} />}
                        {periodValidation.type === 'warning' && <FiAlertOctagon style={{ fontSize: '1.25rem' }} />}
                        <span>{periodValidation.message}</span>
                      </div>
                    )}

                    <button 
                      type="button"
                      className="btn primary preview-btn"
                      onClick={handlePreview}
                      disabled={!form.animal_id || !form.start_date || !form.end_date || loadingPreview || submitting}
                    >
                      {loadingPreview ? (
                        <>
                          <BsHourglassSplit />
                          Carregando...
                        </>
                      ) : (
                        <>
                          <MdFindInPage />
                          Visualizar Dados do Período
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {previewData && (
                  <>
                    <div className="stats-card">
                      <h3> Estatísticas do Período</h3>
                      <div className="stats-grid">
                        <div className="stat-item">
                          <span className="stat-label">Total de Leituras</span>
                          <span className="stat-value">{previewData.stats.count}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Horas com Dados</span>
                          <span className="stat-value">{previewData.stats.hours_with_data}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Horas sem Dados</span>
                          <span className="stat-value" style={{ color: previewData.stats.hours_missing > 0 ? '#f44336' : '#4caf50' }}>
                            {previewData.stats.hours_missing}
                          </span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Média</span>
                          <span className="stat-value">{previewData.stats.avg}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Mínimo</span>
                          <span className="stat-value">{previewData.stats.min}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Máximo</span>
                          <span className="stat-value">{previewData.stats.max}</span>
                        </div>
                      </div>
                    </div>

                    <div className="chart-card">
                      <div className="chart-header">
                        <h3> Gráfico de Atividade - Período de Referência</h3>
                        <p>Média horária de atividade com indicação de períodos com e sem leituras</p>
                      </div>
                      <div className="chart-wrapper">
                        <Line data={chartData} options={chartOptions} />
                      </div>
                    </div>

                    <div className="form-actions">
                      <button 
                        type="submit" 
                        className="btn primary"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <BsHourglassSplit />
                            Criando Baseline...
                          </>
                        ) : (
                          <>
                            <IoCheckmarkCircle />
                            Criar Baseline
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default Baselines;