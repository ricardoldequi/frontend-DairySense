import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Header from '../components/Header';
import CustomSelect from '../components/CustomSelect';
import { Line } from 'react-chartjs-2';
import { FaCircleInfo, FaPlus } from "react-icons/fa6";
import { TbActivity } from "react-icons/tb";
import { MdFindInPage } from "react-icons/md";
import { GoGraph } from "react-icons/go";
import { BsHourglassSplit } from "react-icons/bs";
import { FiAlertOctagon } from "react-icons/fi";
import { GiCow } from "react-icons/gi";
import { IoWarningOutline } from "react-icons/io5";
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
import annotationPlugin from 'chartjs-plugin-annotation';
import './Readings.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
);

const API_BASE = 'http://localhost:3000/api';

function Readings() {
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(false);
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estado para gerenciar múltiplas análises
  const [analyses, setAnalyses] = useState([
    {
      id: 1,
      readings: [],
      baselines: [],
      loadingData: false,
      filters: {
        animal_id: '',
        start_date: '',
        end_date: ''
      },
      lastSearchedAnimal: null,
      showBaselines: false // Novo estado para controlar exibição dos baselines
    }
  ]);

  const getDefaultDates = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1);
    
    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    };
  };

  const calculateMagnitude = (reading) => {
    const x = reading.accel_x || 0;
    const y = reading.accel_y || 0;
    const z = reading.accel_z || 0;
    return Math.sqrt(x * x + y * y + z * z);
  };

  const addNewAnalysis = () => {
    const newId = Math.max(...analyses.map(a => a.id)) + 1;
    const defaultDates = getDefaultDates();
    
    setAnalyses([...analyses, {
      id: newId,
      readings: [],
      baselines: [],
      loadingData: false,
      filters: {
        animal_id: '',
        ...defaultDates
      },
      lastSearchedAnimal: null,
      showBaselines: false
    }]);
  };

  const toggleBaselines = (analysisId) => {
    setAnalyses(prevAnalyses => prevAnalyses.map(a =>
      a.id === analysisId
        ? { ...a, showBaselines: !a.showBaselines }
        : a
    ));
  };

  const removeAnalysis = (id) => {
    if (analyses.length === 1) {
      setError('Você precisa manter pelo menos uma análise.');
      return;
    }
    setAnalyses(analyses.filter(a => a.id !== id));
  };

  const handleFilterChange = (analysisId, e) => {
    const { name, value } = e.target;
    setAnalyses(analyses.map(analysis => 
      analysis.id === analysisId 
        ? { ...analysis, filters: { ...analysis.filters, [name]: value } }
        : analysis
    ));
  };

  const handleUpdateChart = async (analysisId) => {
    const analysis = analyses.find(a => a.id === analysisId);
    if (!analysis) return;

    const { filters } = analysis;

    // Validações mais específicas com mensagens customizadas
    if (!filters.animal_id && !filters.start_date && !filters.end_date) {
      const errorMsg = 'Por favor, selecione um animal e as datas inicial e final para continuar.';
      console.log('Erro de validação:', errorMsg);
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (!filters.animal_id) {
      const errorMsg = 'Por favor, selecione um animal para continuar.';
      console.log('Erro de validação:', errorMsg);
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (!filters.start_date && !filters.end_date) {
      const errorMsg = 'Por favor, selecione as datas inicial e final para continuar.';
      console.log('Erro de validação:', errorMsg);
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (!filters.start_date) {
      const errorMsg = 'Por favor, selecione a data inicial para continuar.';
      console.log('Erro de validação:', errorMsg);
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (!filters.end_date) {
      const errorMsg = 'Por favor, selecione a data final para continuar.';
      console.log('Erro de validação:', errorMsg);
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
      return;
    }

    const start = new Date(filters.start_date);
    const end = new Date(filters.end_date);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 5) {
      setError('O período máximo permitido é de 5 dias.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (start > end) {
      setError('A data inicial não pode ser maior que a data final.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    const currentAnimal = animals.find(a => a.id === Number(filters.animal_id));

    // Atualizar estado para loading e setar o animal pesquisado
    setAnalyses(prevAnalyses => prevAnalyses.map(a => 
      a.id === analysisId 
        ? { ...a, loadingData: true, lastSearchedAnimal: currentAnimal }
        : a
    ));
    setError('');

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Criar datas no horário local (sem conversão UTC)
      const startDateTime = new Date(filters.start_date + 'T00:00:00');
      const endDateTime = new Date(filters.end_date + 'T23:59:59.999');

      const readingsParams = new URLSearchParams({
        animal_id: filters.animal_id,
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString()
      });

      const readingsRes = await fetch(`${API_BASE}/readings?${readingsParams}`, { headers });

      if (readingsRes.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/';
        return;
      }

      if (!readingsRes.ok) throw new Error('Falha ao carregar leituras');

      const readingsData = await readingsRes.json();

      // Buscar baselines do animal
      const baselinesRes = await fetch(`${API_BASE}/animals/${filters.animal_id}/activity_baselines`, { headers });
      
      let baselinesData = [];

      if (baselinesRes.ok) {
        baselinesData = await baselinesRes.json();
      }

      // Atualizar apenas a análise específica, mantendo lastSearchedAnimal
      setAnalyses(prevAnalyses => prevAnalyses.map(a => 
        a.id === analysisId 
          ? { 
              ...a, 
              readings: Array.isArray(readingsData) ? readingsData : [],
              baselines: Array.isArray(baselinesData) ? baselinesData : [],
              loadingData: false,
              lastSearchedAnimal: currentAnimal
            }
          : a
      ));

    } catch (e) {
      console.error('Erro ao carregar dados:', e);
      setError('Erro ao carregar dados. Tente novamente.');
      setTimeout(() => setError(''), 5000);
      setAnalyses(prevAnalyses => prevAnalyses.map(a => 
        a.id === analysisId 
          ? { ...a, loadingData: false }
          : a
      ));
    }
  };

  // Carregar lista de animais
  useEffect(() => {
    const fetchAnimals = async () => {
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
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError('Erro ao carregar lista de animais.');
        setLoading(false);
      }
    };

    fetchAnimals();
  }, []);

  // Renderizar cada análise
  const renderAnalysis = (analysis, index) => {
    const { filters, readings, baselines, loadingData, lastSearchedAnimal, showBaselines } = analysis;
    const selectedAnimal = animals.find(a => a.id === Number(filters.animal_id));
    const maxDate = new Date().toISOString().split('T')[0];
    const minEndDate = filters.start_date;
    const maxEndDate = filters.start_date 
      ? new Date(new Date(filters.start_date).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : maxDate;

    // Preparar opções para o CustomSelect
    const animalOptions = animals.map(a => ({
      value: a.id.toString(),
      label: `${a.name}${a.earring ? ` (Brinco: ${a.earring})` : ''}`
    }));

    const magnitudes = readings.map(r => calculateMagnitude(r));
    
    const hasBaseline = baselines.length > 0 && baselines.some(b => b.baseline_enmo && b.baseline_enmo > 0);
    
    const mainBaseline = hasBaseline 
      ? baselines.reduce((prev, curr) => 
          (curr.baseline_enmo || 0) > (prev.baseline_enmo || 0) ? curr : prev
        , baselines[0])
      : null;

    const baselineValue = mainBaseline?.baseline_enmo || 0;
    const madValue = parseFloat(mainBaseline?.mad_enmo) || 0;
    const upperLimit = baselineValue + (3 * madValue);
    
    const datasets = [
      {
        label: 'Atividade Real (Magnitude)',
        data: magnitudes,
        borderColor: 'rgb(33, 150, 243)',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: 'rgb(33, 150, 243)',
        pointBorderColor: 'rgb(25, 118, 210)',
        pointBorderWidth: 2,
        borderWidth: 2
      }
    ];

    if (hasBaseline) {
      datasets.push(
        {
          label: 'Baseline (Média Histórica)',
          data: readings.map(() => baselineValue),
          borderColor: 'rgb(255, 152, 0)',
          backgroundColor: 'transparent',
          borderDash: [10, 5],
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        },
        {
          label: 'Limiar de Alerta',
          data: readings.map(() => upperLimit),
          borderColor: 'rgb(244, 67, 54)',
          backgroundColor: 'rgba(244, 67, 54, 0.05)',
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 0,
          fill: '-1'
        }
      );
    }

    const chartData = {
      labels: readings.map(r => new Date(r.collected_at).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })),
      datasets: datasets
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12,
              weight: '600'
            }
          }
        },
        title: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            title: (context) => {
              const idx = context[0].dataIndex;
              const reading = readings[idx];
              return new Date(reading.collected_at).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Magnitude da Aceleração (m/s²)',
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Data/Hora',
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    };

    return (
      <div key={analysis.id} className="analysis-section">
        {analyses.length > 1 && (
          <button 
            className="btn danger remove-analysis-btn-floating"
            onClick={() => removeAnalysis(analysis.id)}
            title="Remover esta análise"
          >
            ✕
          </button>
        )}

        <div className="filters-card">
          <div className="filters-card-header">
            <MdFindInPage className="filters-card-icon" />
            <h3>Filtros de Análise</h3>
          </div>
          
          <div className="filters-grid">
            <div className="filter-group">
              <CustomSelect
                id={`animal_id_${analysis.id}`}
                name="animal_id"
                value={filters.animal_id ? filters.animal_id.toString() : ''}
                onChange={(e) => {
                  handleFilterChange(analysis.id, e);
                }}
                options={animalOptions}
                placeholder="Selecione um animal"
                label="Animal"
                required={true}
                disabled={loading || loadingData}
              />
            </div>

            <div className="filter-group">
              <label htmlFor={`start_date_${analysis.id}`}>Data Inicial *</label>
              <input
                type="date"
                id={`start_date_${analysis.id}`}
                name="start_date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange(analysis.id, e)}
                max={maxDate}
                disabled={loadingData}
              />
            </div>

            <div className="filter-group">
              <label htmlFor={`end_date_${analysis.id}`}>Data Final *</label>
              <input
                type="date"
                id={`end_date_${analysis.id}`}
                name="end_date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange(analysis.id, e)}
                min={minEndDate}
                max={Math.min(
                  new Date(maxEndDate).getTime(),
                  new Date(maxDate).getTime()
                ) === new Date(maxEndDate).getTime() ? maxEndDate : maxDate}
                disabled={!filters.start_date || loadingData}
              />
            </div>
          </div>

          <div className="filter-hint">
            <FiAlertOctagon style={{ fontSize: '1.25rem', color: '#f57c00', marginRight: '0.5rem' }} />
            <strong>Período máximo:</strong> 5 dias (recomendado 1-3 dias para melhor visualização)
          </div>

          {selectedAnimal && (
            <div className="animal-info">
              <GiCow style={{ fontSize: '1.5rem', marginRight: '0.5rem' }} />
              <strong>Animal selecionado:</strong> {selectedAnimal.name}
              {selectedAnimal.earring && ` • Brinco: ${selectedAnimal.earring}`}
              {selectedAnimal.breed && ` • Raça: ${selectedAnimal.breed}`}
              {selectedAnimal.age && ` • Idade: ${selectedAnimal.age} anos`}
            </div>
          )}

          <button 
            className="btn primary update-chart-btn"
            onClick={() => handleUpdateChart(analysis.id)}
            disabled={loadingData}
          >
            <GoGraph />
            {loadingData ? 'Carregando...' : 'Atualizar Gráfico'}
          </button>
        </div>

        {readings.length > 0 && !hasBaseline && (
          <div className="no-baseline-warning">
            <div className="warning-icon">
              <IoWarningOutline />
            </div>
            <div className="warning-content">
              <strong>Baseline não cadastrado</strong>
              <p>Este animal ainda não possui baseline de atividade cadastrado. 
              O gráfico mostra apenas os dados brutos coletados.</p>
            </div>
          </div>
        )}

        {readings.length > 0 && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-label">Total de Leituras</div>
                <div className="stat-info-wrapper">
                  <FaCircleInfo className="stat-info-icon" />
                  <div className="stat-info-tooltip">
                    <strong>Total de Leituras</strong>
                    <p>Número total de medições de aceleração capturadas pelos sensores no período selecionado.</p>
                  </div>
                </div>
              </div>
              <div className="stat-value">{readings.length}</div>
            </div>
            {hasBaseline && (
              <div className="stat-card">
                <div className="stat-label">Baseline Máximo</div>
                <div className="stat-value">{baselineValue.toFixed(4)}</div>
              </div>
            )}
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-label">Magnitude Média</div>
                <div className="stat-info-wrapper">
                  <FaCircleInfo className="stat-info-icon" />
                  <div className="stat-info-tooltip">
                    <strong>Magnitude Média</strong>
                    <p>Média da intensidade total de movimento do animal no período.</p>
                  </div>
                </div>
              </div>
              <div className="stat-value">
                {magnitudes.length > 0 
                  ? (magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length).toFixed(2)
                  : '0.00'
                }
              </div>
            </div>
          </div>
        )}

        <div className="card chart-card">
          {loadingData ? (
            <div className="loading">
              <BsHourglassSplit style={{ fontSize: '2rem', marginRight: '0.5rem' }} />
              Carregando dados...
            </div>
          ) : readings.length === 0 ? (
            <div className="empty">
              {lastSearchedAnimal ? (
                <p>
                  <GoGraph style={{ fontSize: '2rem' }} />
                  Nenhum dado encontrado para <strong>{lastSearchedAnimal.name}</strong> neste período
                </p>
              ) : (
                <p>
                  <GoGraph style={{ fontSize: '2rem' }} />
                  Clique em "Atualizar Gráfico" para visualizar os dados
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="chart-title">
                <TbActivity className="chart-title-icon" />
                <h3>
                  {hasBaseline 
                    ? 'Análise de Atividade Física com Baseline'
                    : 'Análise de Atividade Física (Sem Baseline)'
                  }
                </h3>
              </div>
              <div className="chart-wrapper">
                <Line data={chartData} options={chartOptions} />
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Navbar onToggle={setIsNavbarCollapsed} />
      <Header 
        title="Análise de Atividade" 
        subtitle="Monitoramento comportamental com baseline"
        isCollapsed={isNavbarCollapsed}
      />
      <div className={`readings-container ${isNavbarCollapsed ? 'collapsed' : ''}`}>
        <div className="readings-content">
          {error && (
            <div className="banner error">
              {error}
            </div>
          )}

          {analyses.map((analysis, index) => renderAnalysis(analysis, index))}

          <div className="add-analysis-section">
            <button 
              className="btn primary add-analysis-btn"
              onClick={addNewAnalysis}
            >
              <FaPlus />
              Adicionar Nova Análise
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Readings;