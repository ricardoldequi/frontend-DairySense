import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Header from '../components/Header';
import { MdEdit } from "react-icons/md";
import { MdDelete } from "react-icons/md";
import { MdContentCopy } from "react-icons/md";
import { LuOctagonAlert } from "react-icons/lu";
import './Devices.css';

const API_BASE = 'http://localhost:3000/api';

function Devices() {
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(false);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');

  const [form, setForm] = useState({
    id: null,
    serial_number: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return (window.location.href = '/');

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const fetchDevices = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/devices`, { headers });

        if (res.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/';
          return;
        }

        if (!res.ok) throw new Error('Falha ao carregar dispositivos');

        const data = await res.json();
        setDevices(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setError('Erro ao carregar dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const openCreate = () => {
    setForm({ id: null, serial_number: '' });
    setIsEditing(false);
    setFormOpen(true);
    setError('');
    setSuccessMessage('');
    setShowApiKey(false);
    setNewApiKey('');
  };

  const openEdit = (device) => {
    setForm({
      id: device.id,
      serial_number: device.serial_number ?? '',
    });
    setIsEditing(true);
    setFormOpen(true);
    setError('');
    setSuccessMessage('');
    setShowApiKey(false);
    setNewApiKey('');
  };

  const closeForm = () => {
    const hasData = form.serial_number;
    
    if (hasData && !showApiKey) {
      const confirmClose = window.confirm('Deseja realmente cancelar o registro? Os dados não salvos serão perdidos.');
      if (!confirmClose) return;
      
      setSuccessMessage('Registro cancelado com sucesso!');
    }
    
    setFormOpen(false);
    setSubmitting(false);
    setError('');
    setShowApiKey(false);
    setNewApiKey('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    try {
      const body = {
        device: {
          serial_number: form.serial_number,
        },
      };

      const url = isEditing
        ? `${API_BASE}/devices/${form.id}`
        : `${API_BASE}/devices`;

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
        setDevices((prev) => prev.map((d) => (d.id === data.id ? data : d)));
        setSuccessMessage('Registro atualizado com sucesso!');
        setFormOpen(false);
      } else {
        setDevices((prev) => [data, ...prev]);
        setNewApiKey(data.api_key);
        setShowApiKey(true);
      }
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (device) => {
    if (!confirm(`Excluir o dispositivo "${device.serial_number}"?`)) return;

    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/devices/${device.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Falha ao excluir');

      setDevices((prev) => prev.filter((d) => d.id !== device.id));
      setSuccessMessage('Registro apagado com sucesso!');
    } catch (e) {
      console.error(e);
      setError('Erro ao excluir. Tente novamente.');
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(newApiKey);
    setSuccessMessage('API Key copiada para a área de transferência!');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <>
      <Navbar onToggle={setIsNavbarCollapsed} />
      <Header 
        title="Dispositivos" 
        subtitle="Gerenciamento de sensores"
        isCollapsed={isNavbarCollapsed}
      />
      <div className={`devices-container ${isNavbarCollapsed ? 'collapsed' : ''}`}>
        <div className="devices-content">
          <div className="page-actions">
            {error && <div className="banner error">{error}</div>}
            {successMessage && <div className="banner success">{successMessage}</div>}
            
            <button className="btn primary" onClick={openCreate}>
              + Novo dispositivo
            </button>
          </div>

          {loading ? (
            <div className="loading">Carregando...</div>
          ) : (
            <div className="card">
              {devices.length === 0 ? (
                <div className="empty">
                  Nenhum dispositivo cadastrado.
                  <button className="btn linklike" onClick={openCreate}>
                    Cadastrar agora
                  </button>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Nome</th>
                        <th>Data de Aquisição</th>
                        <th className="col-actions">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.map((d) => (
                        <tr key={d.id}>
                          <td>{d.id}</td>
                          <td>{d.serial_number}</td>
                          <td>{formatDate(d.created_at)}</td>
                          <td className="col-actions">
                            <button 
                              className="btn-icon edit" 
                              onClick={() => openEdit(d)}
                              aria-label="Editar"
                              title="Editar"
                            >
                              <MdEdit />
                            </button>
                            <button
                              className="btn-icon delete"
                              onClick={() => handleDelete(d)}
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
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="device-form-title">
          <div className="modal-content">
            <div className="modal-header">
              <h2 id="device-form-title">
                {showApiKey ? 'Dispositivo criado com sucesso!' : isEditing ? 'Editando dispositivo' : 'Novo dispositivo'}
              </h2>
              <button className="icon-btn" onClick={closeForm} aria-label="Fechar">✕</button>
            </div>

            {showApiKey ? (
              <div className="form api-key-display">
                <p className="api-key-info">
                  <LuOctagonAlert className="alert-icon" />
                  Copie a API Key abaixo. Ela não será exibida novamente!
                </p>
                <div className="api-key-container">
                  <code className="api-key-code">{newApiKey}</code>
                  <button 
                    type="button" 
                    className="btn-icon copy" 
                    onClick={copyApiKey}
                    aria-label="Copiar API Key"
                    title="Copiar API Key"
                  >
                    <MdContentCopy />
                  </button>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn primary" onClick={closeForm}>
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="form">
                <div className="form-row">
                  <label htmlFor="serial_number">Nome do Dispositivo</label>
                  <input
                    id="serial_number"
                    name="serial_number"
                    type="text"
                    value={form.serial_number}
                    onChange={handleChange}
                    placeholder="Ex: DS0001"
                    required
                  />
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn ghost" onClick={closeForm}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn primary" disabled={submitting}>
                    {submitting ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default Devices;