import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import api from '../services/api';
import {
  PlusCircleIcon, PencilIcon, TrashIcon, EyeIcon, XIcon,
  CheckCircleIcon, XCircleIcon, SearchIcon, PhotographIcon,
} from '@heroicons/react/outline';

const initialForm = {
  full_name: '', national_id: '', phone_number: '', address: '',
  company_id: '', is_verified: false, verification_status: 'pending',
};

const getRows = (data) => Array.isArray(data) ? data : (data?.results || []);
const statusLabel = (person) => person.is_verified
  ? 'Verified'
  : (person.verification_status || 'pending').replaceAll('_', ' ');

const statusClass = (person) => person.is_verified || person.verification_status === 'verified'
  ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
  : person.verification_status === 'rejected'
    ? 'bg-red-50 text-red-700 ring-red-600/20'
    : 'bg-amber-50 text-amber-700 ring-amber-600/20';

const PersonManagement = () => {
  const navigate = useNavigate();
  const [persons, setPersons] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [imagePerson, setImagePerson] = useState(null);
  const [personImages, setPersonImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPersons = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (verificationStatus) params.verification_status = verificationStatus;
      const response = await api.get('/persons/', { params });
      setPersons(getRows(response.data));
    } catch (err) {
      console.error('Failed to load persons:', err);
      setError('Could not load individuals. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo, verificationStatus]);

  const fetchCompanies = useCallback(async () => {
    try {
      const response = await api.get('/companies/');
      setCompanies(getRows(response.data));
    } catch (err) {
      console.error('Failed to load companies:', err);
    }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);
  useEffect(() => { fetchPersons(); }, [fetchPersons]);

  const counts = useMemo(() => ({
    total: persons.length,
    verified: persons.filter(p => p.is_verified || p.verification_status === 'verified').length,
    pending: persons.filter(p => !p.is_verified && (!p.verification_status || p.verification_status === 'pending')).length,
    rejected: persons.filter(p => p.verification_status === 'rejected').length,
  }), [persons]);

  const resetForm = () => setForm(initialForm);

  const openAdd = () => {
    setEditingPerson(null);
    resetForm();
    setShowForm(true);
  };

  const openEdit = (person) => {
    setEditingPerson(person);
    setForm({
      full_name: person.full_name || '',
      national_id: person.national_id || '',
      phone_number: person.phone_number || '',
      address: person.address || '',
      company_id: person.company?.id || person.company_id || '',
      is_verified: !!person.is_verified,
      verification_status: person.verification_status || 'pending',
    });
    setShowForm(true);
  };

  const savePerson = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        company_id: form.company_id || null,
      };
      if (editingPerson) {
        await api.patch(`/persons/${editingPerson.id}/`, payload);
      } else {
        await api.post('/persons/', payload);
      }
      setShowForm(false);
      setEditingPerson(null);
      resetForm();
      await fetchPersons();
    } catch (err) {
      console.error('Failed to save person:', err);
      alert(err.response?.data?.detail || 'Could not save this individual.');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (person, action) => {
    const labels = { verify: 'verify', reject: 'reject', delete: 'delete' };
    if (action === 'delete' && !window.confirm(`Permanently delete ${person.full_name || 'this individual'}?`)) return;
    if (action === 'reject' && !window.confirm(`Reject ${person.full_name || 'this individual'}?`)) return;
    setActionLoading(true);
    try {
      if (action === 'delete') await api.delete(`/persons/${person.id}/`);
      else await api.post(`/persons/${person.id}/${action}/`);
      if (imagePerson?.id === person.id && action === 'delete') closeImageModal();
      await fetchPersons();
    } catch (err) {
      console.error(`Failed to ${labels[action]} person:`, err);
      alert(err.response?.data?.error || err.response?.data?.detail || `Could not ${labels[action]} this individual.`);
    } finally {
      setActionLoading(false);
    }
  };

  const openImages = async (person) => {
    setImagePerson(person);
    setPersonImages([]);
    setSelectedImage(null);
    setImagesLoading(true);
    try {
      const response = await api.get(`/persons/${person.id}/images/`);
      setPersonImages(response.data?.images || []);
    } catch (err) {
      console.error('Failed to load ID images:', err);
      alert('Could not load uploaded ID images.');
    } finally {
      setImagesLoading(false);
    }
  };

  const closeImageModal = () => {
    setImagePerson(null);
    setPersonImages([]);
    setSelectedImage(null);
  };

  const clearFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setVerificationStatus('');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar />
      <main className="min-w-0 md:ml-64 p-4 sm:p-6 lg:p-8">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">CrediSafe / Administration</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Individuals</h1>
            <p className="mt-1 text-sm text-slate-500">Manage personal records and review identity documents.</p>
          </div>
          <button onClick={openAdd} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
            <PlusCircleIcon className="h-5 w-5" /> Add individual
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Total individuals', counts.total, 'All matching records'],
            ['Verified', counts.verified, 'Approved identities'],
            ['Pending review', counts.pending, 'Awaiting a decision'],
            ['Rejected', counts.rejected, 'Rejected identities'],
          ].map(([label, value, hint]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
              <p className="mt-1 text-xs text-slate-400">{hint}</p>
            </div>
          ))}
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="font-semibold text-slate-900">Individual records</h2>
              <p className="mt-1 text-sm text-slate-500">Search and filter the records below.</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); fetchPersons(); }} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="relative xl:col-span-2">
                <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, national ID or phone" className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
              </div>
              <input aria-label="Date from" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
              <input aria-label="Date to" type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
              <select value={verificationStatus} onChange={e => setVerificationStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                <option value="">All verification statuses</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
              <div className="flex gap-2 md:col-span-2 xl:col-span-5 xl:justify-end">
                <button type="button" onClick={clearFilters} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Clear filters</button>
                <button type="submit" className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700">Apply filters</button>
              </div>
            </form>
          </div>

          {error && <div className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Individual</th>
                  <th className="px-5 py-3 font-semibold">National ID</th>
                  <th className="px-5 py-3 font-semibold">Phone</th>
                  <th className="px-5 py-3 font-semibold">Date added</th>
                  <th className="px-5 py-3 font-semibold">Verification</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="6" className="px-5 py-14 text-center text-sm text-slate-500">Loading individuals...</td></tr>
                ) : persons.length === 0 ? (
                  <tr><td colSpan="6" className="px-5 py-14 text-center text-sm text-slate-500">No individuals match these filters.</td></tr>
                ) : persons.map(person => (
                  <tr key={person.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <button onClick={() => navigate(`/admin/persons/${person.id}`)} className="text-left font-semibold text-slate-900 hover:text-indigo-600">{person.full_name || 'Unnamed individual'}</button>
                      <p className="mt-0.5 text-xs text-slate-400">Record #{person.id}</p>
                    </td>
                    <td className="px-5 py-4 font-mono text-sm text-slate-600">{person.national_id || '—'}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{person.phone_number || '—'}</td>
                    <td className="px-5 py-4 text-sm text-slate-500">{person.created_at ? new Date(person.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(person)}`}>{statusLabel(person)}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button title="Review ID images" onClick={() => openImages(person)} className="rounded-md p-2 text-indigo-600 hover:bg-indigo-50"><PhotographIcon className="h-5 w-5" /></button>
                        <button title="View profile" onClick={() => navigate(`/admin/persons/${person.id}`)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100"><EyeIcon className="h-5 w-5" /></button>
                        <button title="Edit" onClick={() => openEdit(person)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100"><PencilIcon className="h-5 w-5" /></button>
                        <button title="Delete" onClick={() => runAction(person, 'delete')} className="rounded-md p-2 text-red-600 hover:bg-red-50"><TrashIcon className="h-5 w-5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Showing {persons.length} record(s) returned by the API.</div>
        </section>
      </main>

      {imagePerson && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6" onMouseDown={e => { if (e.target === e.currentTarget) closeImageModal(); }}>
          <section role="dialog" aria-modal="true" aria-label="National ID verification" className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Identity review</p><h2 className="mt-1 text-lg font-bold text-slate-900">{imagePerson.full_name || 'Unnamed individual'}</h2><p className="text-sm text-slate-500">Compare the registered details with the uploaded document.</p></div>
              <button onClick={closeImageModal} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><XIcon className="h-5 w-5" /></button>
            </header>
            <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
              <div className="min-h-[300px] bg-slate-100 p-4 sm:p-6">
                <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-700">Uploaded national ID</h3><span className="text-xs text-slate-500">{personImages.length} image(s)</span></div>
                {imagesLoading ? <div className="flex h-64 items-center justify-center text-sm text-slate-500">Loading images...</div>
                  : personImages.length === 0 ? <div className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-center"><PhotographIcon className="mb-2 h-9 w-9 text-slate-400" /><p className="text-sm font-medium text-slate-600">No ID images found</p><p className="mt-1 text-xs text-slate-400">No files matched this person's phone number.</p></div>
                  : <div className="space-y-4">
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2"><img src={selectedImage?.url || personImages[0].url} alt="Uploaded national ID" className="mx-auto max-h-[55vh] w-full object-contain" /></div>
                    <div className="flex flex-wrap gap-2">{personImages.map((img, index) => <button key={img.filename || index} onClick={() => setSelectedImage(img)} className={`overflow-hidden rounded-lg border-2 ${((selectedImage?.url || personImages[0].url) === img.url) ? 'border-indigo-600' : 'border-transparent'}`}><img src={img.url} alt={`ID document ${index + 1}`} className="h-16 w-24 object-cover" /></button>)}</div>
                  </div>}
              </div>
              <aside className="flex flex-col p-5">
                <h3 className="text-sm font-semibold text-slate-900">Registered information</h3>
                <dl className="mt-4 space-y-4">
                  <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Registered national ID</dt><dd className="mt-1 break-all rounded-lg border border-indigo-100 bg-indigo-50 p-3 font-mono text-lg font-bold text-indigo-900">{imagePerson.national_id || 'Not provided'}</dd></div>
                  <div><dt className="text-xs text-slate-400">Full name</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{imagePerson.full_name || '—'}</dd></div>
                  <div><dt className="text-xs text-slate-400">Phone number</dt><dd className="mt-1 text-sm text-slate-800">{imagePerson.phone_number || '—'}</dd></div>
                  <div><dt className="text-xs text-slate-400">Current status</dt><dd className="mt-1"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(imagePerson)}`}>{statusLabel(imagePerson)}</span></dd></div>
                </dl>
                <p className="mt-5 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">Check that the ID number and name visible on the document match the registered information before approving.</p>
                <div className="mt-auto space-y-2 border-t border-slate-100 pt-5">
                  {!imagePerson.is_verified && imagePerson.verification_status !== 'rejected' && <button disabled={actionLoading} onClick={() => runAction(imagePerson, 'verify')} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircleIcon className="h-5 w-5" /> Verify individual</button>}
                  {!imagePerson.is_verified && imagePerson.verification_status !== 'rejected' && <button disabled={actionLoading} onClick={() => runAction(imagePerson, 'reject')} className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"><XCircleIcon className="h-5 w-5" /> Reject</button>}
                  <button onClick={() => { closeImageModal(); navigate(`/admin/persons/${imagePerson.id}`); }} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">View full profile</button>
                  <button disabled={actionLoading} onClick={() => runAction(imagePerson, 'delete')} className="w-full rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">Delete individual</button>
                </div>
              </aside>
            </div>
          </section>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4">
          <form onSubmit={savePerson} className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold text-slate-900">{editingPerson ? 'Edit individual' : 'Add individual'}</h2><button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><XIcon className="h-5 w-5" /></button></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                ['Full name', 'full_name', 'text'], ['National ID', 'national_id', 'text'], ['Phone number', 'phone_number', 'text'], ['Address', 'address', 'text'],
              ].map(([label, key, type]) => <label key={key} className="text-sm font-medium text-slate-700">{label}<input required={['full_name', 'national_id', 'phone_number'].includes(key)} type={type} value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>)}
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">Company<select value={form.company_id} onChange={e => setForm(prev => ({ ...prev, company_id: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"><option value="">No company</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button><button disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : editingPerson ? 'Save changes' : 'Add individual'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PersonManagement;
