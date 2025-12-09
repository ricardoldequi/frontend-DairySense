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
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { MdCalendarMonth, MdFindInPage, MdBlurLinear, MdDelete } from 'react-icons/md';
import { FaCircleInfo, FaListUl } from 'react-icons/fa6';
import { FiAlertOctagon } from 'react-icons/fi';
import { IoWarningOutline, IoCheckmarkCircle } from 'react-icons/io5';
import { BsHourglassSplit, BsBarChartLine } from 'react-icons/bs';
import { TbActivity, TbCalendarStats } from 'react-icons/tb';
import { GoGraph } from 'react-icons/go';
import { RxCross2, RxCheckCircled } from 'react-icons/rx';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';
import './Baselines.css';
import { API_BASE_URL } from '../config/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_BASE = API_BASE_URL;

const MIN_READINGS_THRESHOLD = 2500;

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
    const dailyData = {};
    
    previewData.readings.forEach(r => {
      const dt = new Date(r.collected_at);
      const dayKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      
      if (!dailyData[dayKey]) {
        dailyData[dayKey] = {
          date: dayKey,
          count: 0,
          displayDate: dt.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit',
            year: 'numeric'
          }),
          shortDisplayDate: dt.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit'
          })
        };
      }
      
      dailyData[dayKey].count++;
    });

    const startDate = new Date(form.start_date + 'T00:00:00');
    const endDate = new Date(form.end_date + 'T00:00:00');
    const allDays = [];
    
    for (let dt = new Date(startDate); dt <= endDate; dt.setDate(dt.getDate() + 1)) {
      const dayKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      allDays.push({
        dayKey: dayKey,
        displayDate: dt.toLocaleDateString('pt-BR', { 
          day: '2-digit', 
          month: '2-digit',
          year: 'numeric'
        }),
        shortDisplayDate: dt.toLocaleDateString('pt-BR', { 
          day: '2-digit', 
          month: '2-digit'
        }),
        data: dailyData[dayKey] || { count: 0, date: dayKey }
      });
    }

    const labels = allDays.map(d => d.shortDisplayDate);
    const counts = allDays.map(d => d.data.count);
    
    const backgroundColors = counts.map(count => 
      count < MIN_READINGS_THRESHOLD ? 'rgba(244, 67, 54, 0.6)' : 'rgba(33, 150, 243, 0.6)'
    );
    const borderColors = counts.map(count => 
      count < MIN_READINGS_THRESHOLD ? 'rgb(244, 67, 54)' : 'rgb(33, 150, 243)'
    );

    chartData = {
      labels,
      datasets: [
        {
          label: 'Número de Leituras por Dia',
          data: counts,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 2,
          tension: 0.1,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          fill: false
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
            font: { size: 13, weight: '600' }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          padding: 12,
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
          callbacks: {
            title: (context) => {
              const dayData = allDays[context[0].dataIndex];
              return dayData.displayDate;
            },
            label: (context) => {
              const count = context.parsed.y;
              const status = count < MIN_READINGS_THRESHOLD ? 'Poucos dados' : 'Dados adequados';
              return [
                `Leituras: ${count}`,
                status
              ];
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Número de Leituras',
            font: { size: 14, weight: 'bold' },
            color: '#333'
          },
          grid: { 
            color: 'rgba(0, 0, 0, 0.1)',
            drawBorder: false
          },
          ticks: {
            font: { size: 11 },
            color: '#666',
            callback: function(value) {
              return Number.isInteger(value) ? value.toLocaleString('pt-BR') : '';
            }
          }
        },
        x: {
          title: {
            display: true,
            text: 'Dias do Período',
            font: { size: 14, weight: 'bold' },
            color: '#333'
          },
          ticks: {
            font: { size: 12 },
            color: '#666'
          },
          grid: { 
            color: 'rgba(0, 0, 0, 0.05)',
            drawBorder: false
          }
        }
      }
    };

    const daysWithData = allDays.filter(d => d.data.count > 0);
    const totalReadings = allDays.reduce((sum, d) => sum + d.data.count, 0);
    const avgReadingsPerDay = daysWithData.length > 0 ? Math.round(totalReadings / daysWithData.length) : 0;
    
    previewData.dailyStats = allDays;
    previewData.summaryStats = {
      total_readings: totalReadings,
      avg_readings_per_day: avgReadingsPerDay,
      days_with_data: daysWithData.length,
      total_days: allDays.length
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
                  <RxCross2 />
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
                      <h3>
                        <BsBarChartLine style={{ marginRight: '0.5rem' }} />
                        Estatísticas do Período
                      </h3>
                      
                      <div className="daily-stats-table">
                        <div className="table-wrapper">
                          <table>
                            <thead>
                              <tr>
                                <th>Data</th>
                                <th>Quantidade de Leituras</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {previewData.dailyStats.map((day, index) => (
                                <tr 
                                  key={day.dayKey}
                                  className={day.data.count < MIN_READINGS_THRESHOLD ? 'warning-row' : ''}
                                >
                                  <td data-label="Data">
                                    {day.displayDate}
                                  </td>
                                  <td 
                                    data-label="Leituras"
                                    style={{ 
                                      color: day.data.count < MIN_READINGS_THRESHOLD ? '#f44336' : '#4caf50',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    {day.data.count.toLocaleString('pt-BR')}
                                  </td>
                                  <td data-label="Status">
                                    {day.data.count === 0 ? (
                                      <span className="status-badge no-data">
                                        <RxCross2 style={{ marginRight: '0.25rem' }} />
                                        Sem dados
                                      </span>
                                    ) : day.data.count < MIN_READINGS_THRESHOLD ? (
                                      <span className="status-badge low-data">
                                        <HiOutlineExclamationTriangle style={{ marginRight: '0.25rem' }} />
                                        Poucos dados
                                      </span>
                                    ) : (
                                      <span className="status-badge good-data">
                                        <RxCheckCircled style={{ marginRight: '0.25rem' }} />
                                        Adequado
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="summary-stats">
                        <div className="stats-grid">
                          <div className="stat-item">
                            <span className="stat-label">Total de Leituras</span>
                            <span className="stat-value">{previewData.summaryStats.total_readings.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Média por Dia</span>
                            <span className="stat-value">{previewData.summaryStats.avg_readings_per_day.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Dias com Dados</span>
                            <span className="stat-value">
                              {previewData.summaryStats.days_with_data} / {previewData.summaryStats.total_days}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="chart-card">
                      <div className="chart-header">
                        <h3>
                          <GoGraph style={{ marginRight: '0.5rem' }} />
                          Leituras por Dia - Período de Referência
                        </h3>
                        <p>
                          <span style={{ color: '#1565c0', display: 'inline-flex', alignItems: 'center' }}>
                            <RxCheckCircled style={{ marginRight: '0.25rem' }} />
                            Dados adequados (≥{MIN_READINGS_THRESHOLD})
                          </span> • 
                          <span style={{ color: '#1565c0', marginLeft: '1rem', display: 'inline-flex', alignItems: 'center' }}>
                            <HiOutlineExclamationTriangle style={{ marginRight: '0.25rem' }} />
                            Poucos dados (&lt;{MIN_READINGS_THRESHOLD})
                          </span>
                        </p>
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