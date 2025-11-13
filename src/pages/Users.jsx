import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Header from '../components/Header';
import { MdEdit } from "react-icons/md";
import { MdDelete } from "react-icons/md";
import { MdVisibility } from "react-icons/md";
import { MdVisibilityOff } from "react-icons/md";
import './Users.css';
import { API_BASE_URL } from '../config/api'; 

const API_BASE = API_BASE_URL; 

function Users() {
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState({
    id: null,
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return (window.location.href = '/');

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/users`, { headers });

        if (res.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/';
          return;
        }

        if (!res.ok) throw new Error('Falha ao carregar usuários');

        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setError('Erro ao carregar dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Auto-hide success message após 3 segundos
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const openCreate = () => {
    setForm({ id: null, name: '', email: '', password: '', confirmPassword: '' });
    setIsEditing(false);
    setFormOpen(true);
    setError('');
    setSuccessMessage('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const openEdit = (user) => {
    setForm({
      id: user.id,
      name: user.name ?? '',
      email: user.email ?? '',
      password: '',
      confirmPassword: ''
    });
    setIsEditing(true);
    setFormOpen(true);
    setError('');
    setSuccessMessage('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const closeForm = () => {
    const hasData = form.name || form.email || form.password || form.confirmPassword;
    
    if (hasData) {
      const confirmClose = window.confirm('Deseja realmente cancelar o registro? Os dados não salvos serão perdidos.');
      if (!confirmClose) return;
      
      setSuccessMessage('Registro cancelado com sucesso!');
    }
    
    setFormOpen(false);
    setSubmitting(false);
    setError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
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

    // Valida senhas
    if (form.password && form.password !== form.confirmPassword) {
      setError('As senhas não coincidem!');
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
        name: form.name,
        email: form.email,
      };

      // Só envia senha se estiver preenchida
      if (form.password) {
        body.password = form.password;
      }

      const url = isEditing
        ? `${API_BASE}/users/${form.id}`
        : `${API_BASE}/users`;

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
          data?.errors || 'Falha ao salvar. Verifique os dados e tente novamente.'
        );
      }

      if (isEditing) {
        setUsers((prev) => prev.map((u) => (u.id === data.id || u.id === data.user?.id ? (data.user || data) : u)));
        setSuccessMessage('Registro atualizado com sucesso!');
      } else {
        setUsers((prev) => [(data.user || data), ...prev]);
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

  const handleDelete = async (user) => {
    if (!confirm(`Excluir o usuário "${user.name}"?`)) return;

    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Falha ao excluir');

      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setSuccessMessage('Registro apagado com sucesso!');
    } catch (e) {
      console.error(e);
      setError('Erro ao excluir. Tente novamente.');
    }
  };

  return (
    <>
      <Navbar onToggle={setIsNavbarCollapsed} />
      <Header 
        title="Usuários" 
        isCollapsed={isNavbarCollapsed}
      />
      <div className={`users-container ${isNavbarCollapsed ? 'collapsed' : ''}`}>
        <div className="users-content">
          <div className="page-actions">
            {error && <div className="banner error">{error}</div>}
            {successMessage && <div className="banner success">{successMessage}</div>}
            
            <button className="btn primary" onClick={openCreate}>
              + Novo usuário
            </button>
          </div>

          {loading ? (
            <div className="loading">Carregando...</div>
          ) : (
            <div className="card">
              {users.length === 0 ? (
                <div className="empty">
                  Nenhum usuário cadastrado.
                  <button className="btn linklike" onClick={openCreate}>
                    Cadastrar agora
                  </button>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>E-mail</th>
                        <th className="col-actions">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td>{u.name}</td>
                          <td>{u.email}</td>
                          <td className="col-actions">
                            <button 
                              className="btn-icon edit" 
                              onClick={() => openEdit(u)}
                              aria-label="Editar"
                              title="Editar"
                            >
                              <MdEdit />
                            </button>
                            <button
                              className="btn-icon delete"
                              onClick={() => handleDelete(u)}
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
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="user-form-title">
          <div className="modal-content">
            <div className="modal-header">
              <h2 id="user-form-title">
                {isEditing ? 'Editando usuário' : 'Novo usuário'}
              </h2>
              <button className="icon-btn" onClick={closeForm} aria-label="Fechar">✕</button>
            </div>

            {error && <div className="modal-error">{error}</div>}

            <form onSubmit={handleSubmit} className="form">
              <div className="form-row">
                <label htmlFor="name">Nome</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-row">
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-row">
                <label htmlFor="password">
                  Senha {isEditing && <span style={{ fontSize: '0.875rem', color: '#666' }}>(deixe em branco para manter)</span>}
                </label>
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    required={!isEditing}
                    placeholder={isEditing ? 'Digite para alterar' : ''}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                  </button>
                </div>
              </div>

              <div className="form-row">
                <label htmlFor="confirmPassword">Confirmar Senha</label>
                <div className="password-input-wrapper">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required={!isEditing || form.password !== ''}
                    placeholder={isEditing ? 'Digite para confirmar' : ''}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showConfirmPassword ? <MdVisibilityOff /> : <MdVisibility />}
                  </button>
                </div>
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
          </div>
        </div>
      )}
    </>
  );
}

export default Users;