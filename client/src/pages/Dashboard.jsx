import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../apiClient';

export default function Dashboard({ user }) {
  const [people, setPeople] = useState([]);
  const [families, setFamilies] = useState([]);
  const [cities, setCities] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [form, setForm] = useState({ first_name: '', last_name_raw: '', current_city: '', notes: '' });
  const [edgeForm, setEdgeForm] = useState({ fromPersonId: '', toPersonId: '', type: 'PARENT_OF' });
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showAddEdge, setShowAddEdge] = useState(false);

  async function loadFamilies() {
    const f = await api('/api/v1/people/families');
    setFamilies(f);
  }

  async function loadCities() {
    const c = await api('/api/v1/people/cities');
    setCities(c);
  }

  async function loadPeople() {
    let url = '/api/v1/people?search=' + encodeURIComponent(search);
    if (selectedFamily) url += '&familyId=' + selectedFamily;
    if (selectedCity) url += '&cityId=' + encodeURIComponent(selectedCity);
    const p = await api(url);
    setPeople(p);
  }

  useEffect(() => { loadFamilies(); loadCities(); }, []);
  useEffect(() => { loadPeople(); }, [search, selectedFamily, selectedCity]);

  // Filter people that belong to user's family (for edge creation)
  const myFamilyPeople = people.filter(p => p.canEdit);

  async function createPerson(e) {
    e.preventDefault();
    await api('/api/v1/people', { method: 'POST', body: JSON.stringify(form) });
    setForm({ first_name: '', last_name_raw: '', current_city: '', notes: '' });
    setShowAddPerson(false);
    loadPeople();
    loadCities(); // Refresh city list after adding person
  }

  async function addEdge(e) {
    e.preventDefault();
    try {
      await api('/api/v1/tree/edges', { method: 'POST', body: JSON.stringify(edgeForm) });
      setEdgeForm({ fromPersonId: '', toPersonId: '', type: 'PARENT_OF' });
      setShowAddEdge(false);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Browse all families • Edit your own family members</p>
      </div>

      {/* Stats */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-value">{people.length}</div>
          <div className="stat-label">Total People</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{myFamilyPeople.length}</div>
          <div className="stat-label">Your Family</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{families.length}</div>
          <div className="stat-label">Families</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{user?.role || '-'}</div>
          <div className="stat-label">Your Role</div>
        </div>
      </div>

      {/* People List */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">👥 All Family Members</h2>
          <div style={{display: 'flex', gap: '0.75rem', flexWrap: 'wrap'}}>
            <select 
              className="form-select" 
              style={{width: 'auto', minWidth: '150px'}}
              value={selectedFamily}
              onChange={e => setSelectedFamily(e.target.value)}
            >
              <option value="">All Families</option>
              {families.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <select 
              className="form-select" 
              style={{width: 'auto', minWidth: '150px'}}
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
            >
              <option value="">All Cities</option>
              {cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="search-container">
              <span className="search-icon">🔍</span>
              <input 
                type="text"
                className="search-input"
                placeholder="Search members..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
            </div>
            <button className="btn btn-primary" onClick={() => setShowAddPerson(!showAddPerson)}>
              + Add Person
            </button>
          </div>
        </div>

        {/* Add Person Form */}
        {showAddPerson && (
          <form onSubmit={createPerson} style={{marginBottom: '1.5rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '12px'}}>
            <p style={{margin: '0 0 1rem', fontSize: '0.9rem', color: '#64748b'}}>
              New person will be added to <strong>your family</strong>.
            </p>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input 
                  className="form-input"
                  placeholder="e.g., Mohamed" 
                  value={form.first_name} 
                  onChange={e => setForm({...form, first_name: e.target.value})} 
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input 
                  className="form-input"
                  placeholder="e.g., Ben Ali" 
                  value={form.last_name_raw} 
                  onChange={e => setForm({...form, last_name_raw: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Current City</label>
                <input 
                  className="form-input"
                  placeholder="e.g., Tunis, Sfax" 
                  value={form.current_city} 
                  onChange={e => setForm({...form, current_city: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input 
                  className="form-input"
                  placeholder="Optional notes..." 
                  value={form.notes} 
                  onChange={e => setForm({...form, notes: e.target.value})} 
                />
              </div>
            </div>
            <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
              <button type="submit" className="btn btn-primary">Save Person</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddPerson(false)}>Cancel</button>
            </div>
          </form>
        )}

        {/* People Table */}
        {people.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <p>No family members found.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Family</th>
                  <th>City</th>
                  <th>Region</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {people.map(p => (
                  <tr key={p.id} style={{opacity: p.canEdit ? 1 : 0.7}}>
                    <td>
                      <span className="person-name">{p.first_name}</span>
                      {p.last_name_raw && <span className="person-surname"> {p.last_name_raw}</span>}
                    </td>
                    <td>
                      <span className={`badge ${p.canEdit ? 'badge-green' : 'badge-blue'}`}>
                        {p.family_name}
                        {p.canEdit && ' ✓'}
                      </span>
                    </td>
                    <td>{p.current_city || <span style={{color: '#94a3b8'}}>—</span>}</td>
                    <td>{p.region || <span style={{color: '#94a3b8'}}>—</span>}</td>
                    <td>{p.notes || <span style={{color: '#94a3b8'}}>—</span>}</td>
                    <td className="table-actions">
                      {p.canEdit ? (
                        <Link to={`/people/${p.id}`} className="btn btn-secondary btn-sm">✏️ Edit</Link>
                      ) : (
                        <Link to={`/people/${p.id}`} className="btn btn-secondary btn-sm" style={{opacity: 0.5}}>👁️ View</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Edge */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">🔗 Family Relationships</h2>
          <button className="btn btn-secondary" onClick={() => setShowAddEdge(!showAddEdge)}>
            + Add Relationship
          </button>
        </div>

        {showAddEdge && (
          <form onSubmit={addEdge} style={{padding: '1.25rem', background: '#f8fafc', borderRadius: '12px'}}>
            <p style={{margin: '0 0 1rem', fontSize: '0.9rem', color: '#64748b'}}>
              <strong>Parent Of:</strong> Both parent and child must be from your family.<br/>
              <strong>Spouse Of:</strong> At least one spouse must be from your family (allows cross-family marriages).
            </p>
            {myFamilyPeople.length < 1 ? (
              <p style={{color: '#dc2626'}}>You need at least 1 person in your family to create a relationship.</p>
            ) : (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">From Person (Your Family)</label>
                    <select 
                      className="form-select"
                      value={edgeForm.fromPersonId} 
                      onChange={e => setEdgeForm({...edgeForm, fromPersonId: e.target.value})}
                      required
                    >
                      <option value="">Select person from your family...</option>
                      {myFamilyPeople.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name_raw || ''}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Relationship Type</label>
                    <select 
                      className="form-select"
                      value={edgeForm.type} 
                      onChange={e => setEdgeForm({...edgeForm, type: e.target.value})}
                    >
                      <option value="PARENT_OF">Parent Of</option>
                      <option value="SPOUSE_OF">Spouse Of (cross-family allowed)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">To Person {edgeForm.type === 'SPOUSE_OF' ? '(Any Family)' : '(Your Family)'}</label>
                    <select 
                      className="form-select"
                      value={edgeForm.toPersonId} 
                      onChange={e => setEdgeForm({...edgeForm, toPersonId: e.target.value})}
                      required
                    >
                      <option value="">Select person...</option>
                      {(edgeForm.type === 'SPOUSE_OF' ? people : myFamilyPeople).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.first_name} {p.last_name_raw || ''} {p.family_name && edgeForm.type === 'SPOUSE_OF' ? `(${p.family_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                  <button type="submit" className="btn btn-primary">Add Relationship</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddEdge(false)}>Cancel</button>
                </div>
              </>
            )}
          </form>
        )}

        {!showAddEdge && (
          <p style={{color: '#64748b', fontSize: '0.9rem'}}>
            Create relationships between your family members to build your tree. View the full tree on the Family Tree page.
          </p>
        )}
      </div>
    </div>
  );
}
