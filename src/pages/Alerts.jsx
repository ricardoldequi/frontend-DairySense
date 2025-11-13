import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Header from '../components/Header';
import CustomSelect from '../components/CustomSelect';
import { IoWarning, IoCheckmarkCircle } from 'react-icons/io5';
import { MdAccessTime, MdCalendarMonth, MdFilterList } from 'react-icons/md';
import { BsHourglassSplit } from 'react-icons/bs';
import { GiCow } from 'react-icons/gi';
import { API_BASE_URL } from '../config/api'; 
import './Alerts.css';

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [filters, setFilters] = useState({
    animal_id: '',
    start_date: '',
    end_date: ''
  });
  const [loading, setLoading] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [error, setError] = useState('');
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(false);

  useEffect(() => {
    fetchAnimals();
    fetchAllAlerts();
  }, []);

  const fetchAnimals = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/animals`, { // Atualizar URL
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnimals(data);
      }
    } catch (error) {
      console.error('Erro ao carregar animais:', error);
    }
  };

  const fetchAllAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/alerts`, { // Atualizar URL
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const alertsWithAnimalInfo = data.map(alert => {
          const animal = animals.find(a => a.id === alert.animal_id);
          return {
            ...alert,
            animal_name: animal?.name || 'Animal desconhecido'
          };
        });
        setAlerts(alertsWithAnimalInfo);
      }
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
      setError('Erro ao carregar alertas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = async () => {
    setLoadingAlerts(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();

      if (filters.animal_id) {
        params.append('animal_id', filters.animal_id);
      }

      if (filters.start_date) {
        params.append('start', filters.start_date);
      }

      if (filters.end_date) {
        params.append('end', filters.end_date);
      }

      const url = params.toString() 
        ? `${API_BASE_URL}/alerts?${params}` // Atualizar URL
        : `${API_BASE_URL}/alerts`; // Atualizar URL

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const alertsWithAnimalInfo = data.map(alert => {
          const animal = animals.find(a => a.id === alert.animal_id);
          return {
            ...alert,
            animal_name: animal?.name || 'Animal desconhecido'
          };
        });
        setAlerts(alertsWithAnimalInfo);
      } else {
        throw new Error('Erro ao buscar alertas');
      }
    } catch (error) {
      console.error('Erro ao buscar alertas:', error);
      setError('Erro ao buscar alertas. Tente novamente.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      animal_id: '',
      start_date: '',
      end_date: ''
    });
    setLoadingAlerts(true);
    fetchAllAlerts().finally(() => setLoadingAlerts(false));
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

  const animalOptions = animals.map(a => ({
    value: a.id.toString(),
    label: `${a.name}${a.earring ? ` (Brinco: ${a.earring})` : ''}`
  }));

  const maxDate = new Date().toISOString().split('T')[0];

  return (
    <>
      <Navbar onToggle={setIsNavbarCollapsed} />
      <Header 
        title="Alertas de Cio" 
        isCollapsed={isNavbarCollapsed}
      />
      <div className={`alerts-page-container ${isNavbarCollapsed ? 'collapsed' : ''}`}>
        <div className="alerts-page-content">
          {error && (
            <div className="banner error">
              <IoWarning />
              {error}
            </div>
          )}

          {/* Filtros */}
          <div className="filters-card">
            <div className="filters-card-header">
              <MdFilterList className="filters-card-icon" />
              <h3>Filtrar Alertas</h3>
            </div>

            <div className="filters-grid">
              <div className="filter-group">
                <CustomSelect
                  id="animal_id"
                  name="animal_id"
                  value={filters.animal_id}
                  onChange={handleFilterChange}
                  options={animalOptions}
                  placeholder="Todos os animais"
                  label="Animal"
                  disabled={loading || loadingAlerts}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="start_date">De </label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={filters.start_date}
                  onChange={handleFilterChange}
                  max={maxDate}
                  disabled={loading || loadingAlerts}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="end_date">Até </label>
                <input
                  type="date"
                  id="end_date"
                  name="end_date"
                  value={filters.end_date}
                  onChange={handleFilterChange}
                  min={filters.start_date}
                  max={maxDate}
                  disabled={loading || loadingAlerts}
                />
              </div>
            </div>

            <div className="filters-actions">
              <button 
                className="btn primary"
                onClick={handleSearch}
                disabled={loading || loadingAlerts}
              >
                {loadingAlerts ? (
                  <>
                    <BsHourglassSplit />
                    Buscando...
                  </>
                ) : (
                  <>
                    <MdFilterList />
                    Filtrar
                  </>
                )}
              </button>

              <button 
                className="btn secondary"
                onClick={handleClearFilters}
                disabled={loading || loadingAlerts}
              >
                Limpar Filtros
              </button>
            </div>
          </div>

          {/* Lista de Alertas */}
          <div className="alerts-list-card">
            <div className="alerts-list-header">
              <h3>
                <IoWarning style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                {alerts.length > 0 ? `${alerts.length} Alerta${alerts.length !== 1 ? 's' : ''} Encontrado${alerts.length !== 1 ? 's' : ''}` : 'Alertas'}
              </h3>
            </div>

            {loading || loadingAlerts ? (
              <div className="alerts-loading">
                <BsHourglassSplit style={{ fontSize: '2rem', color: '#004aad' }} />
                <p>Carregando alertas...</p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="alerts-empty">
                <IoWarning style={{ fontSize: '3rem' }} />
                <p>Nenhum alerta encontrado</p>
              </div>
            ) : (
              <div className="alerts-list">
                {alerts.map((alert) => (
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
        </div>
      </div>
    </>
  );
}

export default Alerts;