import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Header from '../components/Header';
import CustomSelect from '../components/CustomSelect';
import { MdEdit } from "react-icons/md";
import { MdDelete } from "react-icons/md";
import './DeviceAnimals.css';
import { API_BASE_URL } from '../config/api'; 

const API_BASE = API_BASE_URL; 

function DeviceAnimals() {
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(false);
  const [deviceAnimals, setDeviceAnimals] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [form, setForm] = useState({
    id: null,
    animal_id: '',
    device_id: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return (window.location.href = '/');

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const fetchAll = async () => {
      try {
        setLoading(true);
        const [deviceAnimalsRes, animalsRes, devicesRes] = await Promise.all([
          fetch(`${API_BASE}/device_animals`, { headers }),
          fetch(`${API_BASE}/animals`, { headers }),
          fetch(`${API_BASE}/devices`, { headers }),
        ]);

        if (deviceAnimalsRes.status === 401 || animalsRes.status === 401 || devicesRes.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/';
          return;
        }

        if (!deviceAnimalsRes.ok) throw new Error('Falha ao carregar monitoramentos');
        if (!animalsRes.ok) throw new Error('Falha ao carregar animais');
        if (!devicesRes.ok) throw new Error('Falha ao carregar dispositivos');

        const deviceAnimalsData = await deviceAnimalsRes.json();
        const animalsData = await animalsRes.json();
        const devicesData = await devicesRes.json();

        setDeviceAnimals(Array.isArray(deviceAnimalsData) ? deviceAnimalsData : []);
        setAnimals(Array.isArray(animalsData) ? animalsData : []);
        setDevices(Array.isArray(devicesData) ? devicesData : []);
      } catch (e) {
        console.error(e);
        setError('Erro ao carregar dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // conflito de datas para animal ou device
  const hasDateConflict = (resourceId, resourceType, startDate, endDate, excludeId = null) => {
    if (!startDate) return false;

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    return deviceAnimals.some((da) => {
      if (excludeId && da.id === excludeId) return false;

      const isSameResource = resourceType === 'animal' 
        ? da.animal_id === Number(resourceId)
        : da.device_id === Number(resourceId);

      if (!isSameResource) return false;

      const existingStart = new Date(da.start_date);
      const existingEnd = da.end_date ? new Date(da.end_date) : null;

      if (!existingEnd) {
        if (!end) return true;
        if (end >= existingStart) return true;
        return false;
      }

      if (!end) {
        return start <= existingEnd;
      }

      return start <= existingEnd && existingStart <= end;
    });
  };

  const getAvailableAnimals = () => {
    if (!form.start_date) return animals;

    return animals.filter((animal) => 
      !hasDateConflict(animal.id, 'animal', form.start_date, form.end_date, form.id)
    );
  };

  const getAvailableDevices = () => {
    if (!form.start_date) return devices;

    return devices.filter((device) => 
      !hasDateConflict(device.id, 'device', form.start_date, form.end_date, form.id)
    );
  };

  const openCreate = () => {
    setForm({ id: null, animal_id: '', device_id: '', start_date: '', end_date: '' });
    setIsEditing(false);
    setFormOpen(true);
    setError('');
    setSuccessMessage('');
  };

  const openEdit = (deviceAnimal) => {
    setForm({
      id: deviceAnimal.id,
      animal_id: deviceAnimal.animal_id ?? '',
      device_id: deviceAnimal.device_id ?? '',
      start_date: deviceAnimal.start_date ? deviceAnimal.start_date.split('T')[0] : '',
      end_date: deviceAnimal.end_date ? deviceAnimal.end_date.split('T')[0] : '',
    });
    setIsEditing(true);
    setFormOpen(true);
    setError('');
    setSuccessMessage('');
  };

  const closeForm = () => {
    const hasData = form.animal_id || form.device_id || form.start_date || form.end_date;
    
    if (hasData) {
      const confirmClose = window.confirm('Deseja realmente cancelar o registro? Os dados não salvos serão perdidos.');
      if (!confirmClose) return;
      
      setSuccessMessage('Registro cancelado com sucesso!');
    }
    
    setFormOpen(false);
    setSubmitting(false);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => {
      const newForm = { ...f, [name]: value };

      if (name === 'start_date' || name === 'end_date') {
        if (newForm.animal_id && hasDateConflict(newForm.animal_id, 'animal', newForm.start_date, newForm.end_date, newForm.id)) {
          newForm.animal_id = '';
        }
        if (newForm.device_id && hasDateConflict(newForm.device_id, 'device', newForm.start_date, newForm.end_date, newForm.id)) {
          newForm.device_id = '';
        }
      }

      return newForm;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    if (hasDateConflict(form.animal_id, 'animal', form.start_date, form.end_date, form.id)) {
      setError('Este animal já está sendo monitorado nesta data. Por favor, revise os cadastros.');
      setSubmitting(false);
      return;
    }

    if (hasDateConflict(form.device_id, 'device', form.start_date, form.end_date, form.id)) {
      setError('Este dispositivo já está sendo utilizado nesta data. Por favor, revise os cadastros.');
      setSubmitting(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    try {
      const body = {
        device_animal: {
          animal_id: form.animal_id ? Number(form.animal_id) : null,
          device_id: form.device_id ? Number(form.device_id) : null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
        },
      };

      const url = isEditing
        ? `${API_BASE}/device_animals/${form.id}`
        : `${API_BASE}/device_animals`;

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error || 'Falha ao salvar. Verifique os dados e tente novamente.'
        );
      }

      if (isEditing) {
        setDeviceAnimals((prev) => prev.map((da) => (da.id === data.id ? data : da)));
        setSuccessMessage('Registro atualizado com sucesso!');
      } else {
        setDeviceAnimals((prev) => [data, ...prev]);
        setSuccessMessage('Registro salvo com sucesso!');
      }

      setFormOpen(false);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (deviceAnimal) => {
    if (!confirm('Excluir este monitoramento?')) return;

    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/device_animals/${deviceAnimal.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Falha ao excluir');

      setDeviceAnimals((prev) => prev.filter((da) => da.id !== deviceAnimal.id));
      setSuccessMessage('Registro apagado com sucesso!');
    } catch (e) {
      console.error(e);
      setError('Erro ao excluir. Tente novamente.');
    }
  };

  const getAnimalName = (id) =>
    animals.find((a) => a.id === id)?.name || '—';

  const getDeviceSerial = (id) =>
    devices.find((d) => d.id === id)?.serial_number || '—';

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const availableAnimals = getAvailableAnimals();
  const availableDevices = getAvailableDevices();

  const animalOptions = availableAnimals.map(a => ({
    value: a.id,
    label: a.name
  }));

  const deviceOptions = availableDevices.map(d => ({
    value: d.id,
    label: d.serial_number
  }));

  return (
    <>
      <Navbar onToggle={setIsNavbarCollapsed} />
      <Header 
        title="Animais Monitorados" 
        isCollapsed={isNavbarCollapsed}
      />
      <div className={`device-animals-container ${isNavbarCollapsed ? 'collapsed' : ''}`}>
        <div className="device-animals-content">
          <div className="page-actions">
            {error && <div className="banner error">{error}</div>}
            {successMessage && <div className="banner success">{successMessage}</div>}
            
            <button className="btn primary" onClick={openCreate}>
              + Novo monitoramento
            </button>
          </div>

          {loading ? (
            <div className="loading">Carregando...</div>
          ) : (
            <div className="card">
              {deviceAnimals.length === 0 ? (
                <div className="empty">
                  Nenhum monitoramento cadastrado.
                  <button className="btn linklike" onClick={openCreate}>
                    Cadastrar agora
                  </button>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Animal</th>
                        <th>Dispositivo</th>
                        <th>Data Início</th>
                        <th>Data Fim</th>
                        <th className="col-actions">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deviceAnimals.map((da) => (
                        <tr key={da.id}>
                          <td>{getAnimalName(da.animal_id)}</td>
                          <td>{getDeviceSerial(da.device_id)}</td>
                          <td>{formatDate(da.start_date)}</td>
                          <td>{formatDate(da.end_date)}</td>
                          <td className="col-actions">
                            <button 
                              className="btn-icon edit" 
                              onClick={() => openEdit(da)}
                              aria-label="Editar"
                              title="Editar"
                            >
                              <MdEdit />
                            </button>
                            <button
                              className="btn-icon delete"
                              onClick={() => handleDelete(da)}
                              aria-label="Excluir"
                              title="Excluir"
                            >
                              <MdDelete />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {formOpen && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="device-animal-form-title">
          <div className="modal-content">
            <div className="modal-header">
              <h2 id="device-animal-form-title">
                {isEditing ? 'Editando monitoramento' : 'Novo monitoramento'}
              </h2>
              <button className="icon-btn" onClick={closeForm} aria-label="Fechar">✕</button>
            </div>

            {error && <div className="modal-error">{error}</div>}

            <form onSubmit={handleSubmit} className="form">
              <div className="form-grid">
                <div className="form-row">
                  <label htmlFor="start_date">Data Início *</label>
                  <input
                    id="start_date"
                    name="start_date"
                    type="date"
                    value={form.start_date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="end_date">Data Fim</label>
                  <input
                    id="end_date"
                    name="end_date"
                    type="date"
                    value={form.end_date}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <CustomSelect
                id="animal_id"
                name="animal_id"
                value={form.animal_id}
                onChange={handleChange}
                options={animalOptions}
                placeholder={!form.start_date ? 'Selecione primeiro a data de início' : 'Selecione um animal'}
                required
                disabled={!form.start_date}
                label="Animal"
                hint={form.start_date && availableAnimals.length === 0 ? '(nenhum animal disponível para este período)' : ''}
              />

              <CustomSelect
                id="device_id"
                name="device_id"
                value={form.device_id}
                onChange={handleChange}
                options={deviceOptions}
                placeholder={!form.start_date ? 'Selecione primeiro a data de início' : 'Selecione um dispositivo'}
                required
                disabled={!form.start_date}
                label="Dispositivo"
                hint={form.start_date && availableDevices.length === 0 ? '(nenhum dispositivo disponível para este período)' : ''}
              />

              <div className="modal-footer">
                <button type="button" className="btn ghost" onClick={closeForm}>
                  Cancelar
                </button>
                <button type="submit" className="btn primary" disabled={submitting}>
                  {submitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default DeviceAnimals;