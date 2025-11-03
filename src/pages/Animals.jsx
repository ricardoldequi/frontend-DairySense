import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Header from '../components/Header';
import './Animals.css';

const API_BASE = 'http://localhost:3000/api';

function Animals() {
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(false);
  const [animals, setAnimals] = useState([]);
  const [breeds, setBreeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    id: null,
    name: '',
    breed_id: '',
    age: '',
    earring: ''
    // user_id: '' // se o backend exigir, inclua/defina aqui
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
        const [animalsRes, breedsRes] = await Promise.all([
          fetch(`${API_BASE}/animals`, { headers }),
          fetch(`${API_BASE}/breeds`, { headers }),
        ]);

        if (animalsRes.status === 401 || breedsRes.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/';
          return;
        }

        if (!animalsRes.ok) throw new Error('Falha ao carregar animais');
        if (!breedsRes.ok) throw new Error('Falha ao carregar raças');

        const animalsData = await animalsRes.json();
        const breedsData = await breedsRes.json();

        setAnimals(Array.isArray(animalsData) ? animalsData : []);
        setBreeds(Array.isArray(breedsData) ? breedsData : []);
      } catch (e) {
        console.error(e);
        setError('Erro ao carregar dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const openCreate = () => {
    setForm({ id: null, name: '', breed_id: '', age: '', earring: '' });
    setIsEditing(false);
    setFormOpen(true);
    setError('');
  };

  const openEdit = (animal) => {
    setForm({
      id: animal.id,
      name: animal.name ?? '',
      breed_id: animal.breed_id ?? '',
      age: animal.age ?? '',
      earring: animal.earring ?? '',
    });
    setIsEditing(true);
    setFormOpen(true);
    setError('');
  };

  const closeForm = () => {
    setFormOpen(false);
    setSubmitting(false);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    try {
      const body = {
        animal: {
          name: form.name,
          breed_id: form.breed_id ? Number(form.breed_id) : null,
          age: form.age ? Number(form.age) : null,
          earring: form.earring || null,
          // user_id: form.user_id ? Number(form.user_id) : null
        },
      };

      const url = isEditing
        ? `${API_BASE}/animals/${form.id}`
        : `${API_BASE}/animals`;

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

      // Atualiza a lista
      if (isEditing) {
        setAnimals((prev) => prev.map((a) => (a.id === data.id ? data : a)));
      } else {
        setAnimals((prev) => [data, ...prev]);
      }

      closeForm();
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (animal) => {
    if (!confirm(`Excluir o animal "${animal.name}"?`)) return;

    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/animals/${animal.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Falha ao excluir');

      setAnimals((prev) => prev.filter((a) => a.id !== animal.id));
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir. Tente novamente.');
    }
  };

  const breedName = (id) =>
    breeds.find((b) => String(b.id) === String(id))?.name || '—';

  return (
    <>
      <Navbar onToggle={setIsNavbarCollapsed} />
      <Header 
        title="Animais" 
        subtitle="Gerenciamento do rebanho"
        isCollapsed={isNavbarCollapsed}
      />
      <div className={`animals-container ${isNavbarCollapsed ? 'collapsed' : ''}`}>
        <div className="animals-content">
          <div className="page-actions">
            <button className="btn primary" onClick={openCreate}>
              + Novo animal
            </button>
          </div>

          {error && <div className="banner error">{error}</div>}

          {loading ? (
            <div className="loading">Carregando...</div>
          ) : (
            <div className="card">
              {animals.length === 0 ? (
                <div className="empty">
                  Nenhum animal cadastrado.
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
                        <th>Raça</th>
                        <th>Idade</th>
                        <th>Brinco</th>
                        <th className="col-actions">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {animals.map((a) => (
                        <tr key={a.id}>
                          <td>{a.name}</td>
                          <td>{breedName(a.breed_id)}</td>
                          <td>{a.age ?? '—'}</td>
                          <td>{a.earring || '—'}</td>
                          <td className="col-actions">
                            <button className="btn ghost" onClick={() => openEdit(a)}>
                              Editar
                            </button>
                            <button
                              className="btn danger"
                              onClick={() => handleDelete(a)}
                            >
                              Excluir
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
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="animal-form-title">
          <div className="modal-content">
            <div className="modal-header">
              <h2 id="animal-form-title">
                {isEditing ? 'Editar animal' : 'Novo animal'}
              </h2>
              <button className="icon-btn" onClick={closeForm} aria-label="Fechar">✕</button>
            </div>

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
                <label htmlFor="breed_id">Raça</label>
                <select
                  id="breed_id"
                  name="breed_id"
                  value={form.breed_id}
                  onChange={handleChange}
                >
                  <option value="">Selecione</option>
                  {breeds.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-grid">
                <div className="form-row">
                  <label htmlFor="age">Idade</label>
                  <input
                    id="age"
                    name="age"
                    type="number"
                    min="0"
                    value={form.age}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="earring">Brinco</label>
                  <input
                    id="earring"
                    name="earring"
                    type="text"
                    value={form.earring}
                    onChange={handleChange}
                  />
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

export default Animals;