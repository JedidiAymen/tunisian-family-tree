import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../apiClient';

export default function PersonDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [form, setForm] = useState({});
  const [usePut, setUsePut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/v1/people/${id}`).then(p => {
      setPerson(p);
      setForm({ 
        first_name: p.first_name, 
        last_name_raw: p.last_name_raw || '', 
        notes: p.notes || '',
        birth_date: p.birth_date || '',
        death_date: p.death_date || ''
      });
    }).catch(err => setError(err.message));
  }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const method = usePut ? 'PUT' : 'PATCH';
      await api(`/api/v1/people/${id}`, { method, body: JSON.stringify(form) });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this person? This cannot be undone.')) return;
    try {
      await api(`/api/v1/people/${id}`, { method: 'DELETE' });
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !person) {
    return (
      <div>
        <div className="page-header">
          <Link to="/" className="btn btn-secondary btn-sm" style={{marginBottom: '1rem'}}>← Back</Link>
          <h1 className="page-title">Person Not Found</h1>
        </div>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="loading">
        <p>Loading person details...</p>
      </div>
    );
  }

  const canEdit = person.canEdit;

  return (
    <div>
      <div className="page-header">
        <Link to="/" className="btn btn-secondary btn-sm" style={{marginBottom: '1rem'}}>← Back to Dashboard</Link>
        <h1 className="page-title">{canEdit ? 'Edit' : 'View'} Person</h1>
        <p className="page-subtitle">
          {person.first_name} {person.last_name_raw || ''} 
          <span className={`badge ${canEdit ? 'badge-green' : 'badge-blue'}`} style={{marginLeft: '0.5rem'}}>
            {person.family_name}
          </span>
        </p>
      </div>

      {!canEdit && (
        <div className="alert" style={{background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e'}}>
          👁️ <strong>View Only</strong> — This person belongs to another family. You cannot edit their information.
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        {canEdit ? (
          <form onSubmit={handleSave}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input 
                  className="form-input"
                  value={form.first_name} 
                  onChange={e => setForm({...form, first_name: e.target.value})} 
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input 
                  className="form-input"
                  value={form.last_name_raw} 
                  onChange={e => setForm({...form, last_name_raw: e.target.value})} 
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Birth Date</label>
                <input 
                  type="date"
                  className="form-input"
                  value={form.birth_date} 
                  onChange={e => setForm({...form, birth_date: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Death Date</label>
                <input 
                  type="date"
                  className="form-input"
                  value={form.death_date} 
                  onChange={e => setForm({...form, death_date: e.target.value})} 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <input 
                className="form-input"
                placeholder="Any additional notes..."
                value={form.notes} 
                onChange={e => setForm({...form, notes: e.target.value})} 
              />
            </div>

            <div className="form-group" style={{marginTop: '1rem'}}>
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={usePut} 
                  onChange={e => setUsePut(e.target.checked)} 
                />
                Full replace mode (PUT) — clears any fields not provided
              </label>
            </div>

            <div style={{display: 'flex', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0'}}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : (usePut ? '💾 Replace (PUT)' : '💾 Update (PATCH)')}
              </button>
              <Link to="/" className="btn btn-secondary">Cancel</Link>
              
              {user?.role === 'ADMIN' && (
                <button 
                  type="button" 
                  onClick={handleDelete} 
                  className="btn btn-danger"
                  style={{marginLeft: 'auto'}}
                >
                  🗑️ Delete Person
                </button>
              )}
            </div>
          </form>
        ) : (
          // Read-only view for other families
          <div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <div className="form-input" style={{background: '#f1f5f9'}}>{person.first_name}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <div className="form-input" style={{background: '#f1f5f9'}}>{person.last_name_raw || '—'}</div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Surname (Canonical)</label>
                <div className="form-input" style={{background: '#f1f5f9'}}>{person.surname || '—'}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Region</label>
                <div className="form-input" style={{background: '#f1f5f9'}}>{person.region || '—'}</div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Birth Date</label>
                <div className="form-input" style={{background: '#f1f5f9'}}>{person.birth_date || '—'}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Death Date</label>
                <div className="form-input" style={{background: '#f1f5f9'}}>{person.death_date || '—'}</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Expertise</label>
              <div className="form-input" style={{background: '#f1f5f9'}}>{person.expertise || '—'}</div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <div className="form-input" style={{background: '#f1f5f9', minHeight: '60px'}}>{person.notes || '—'}</div>
            </div>

            <div style={{marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0'}}>
              <Link to="/" className="btn btn-secondary">← Back to Dashboard</Link>
            </div>
          </div>
        )}
      </div>

      {canEdit && (
        <div className="card" style={{marginTop: '1.5rem'}}>
          <h3 className="card-title" style={{fontSize: '1rem'}}>ℹ️ Update Modes</h3>
          <p style={{color: '#64748b', fontSize: '0.9rem', margin: 0}}>
            <strong>PATCH</strong>: Only updates the fields you change. Other fields stay the same.<br/>
            <strong>PUT</strong>: Replaces the entire record. Any empty fields will be cleared.
          </p>
        </div>
      )}
    </div>
  );
}
