import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import api from '../services/api';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, PhotographIcon } from '@heroicons/react/outline';

const rows = value => Array.isArray(value) ? value : [];
const pretty = value => value === null || value === undefined || value === '' ? '—'
  : typeof value === 'boolean' ? (value ? 'Yes' : 'No')
  : typeof value === 'object' ? JSON.stringify(value) : String(value);

const Field = ({ label, value }) => (
  <div className="min-w-0"><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label.replaceAll('_', ' ')}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-800">{pretty(value)}</dd></div>
);

const DataTable = ({ title, data, empty, columns }) => (
  <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">{title}</h2></div>
    {!data?.length ? <p className="px-5 py-8 text-sm text-slate-500">{empty}</p> :
      <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{columns.map(c => <th key={c.key} className="px-5 py-3 font-semibold">{c.label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{data.map((item, i) => <tr key={item.id || item.pk || i}>{columns.map(c => <td key={c.key} className="max-w-xs break-words px-5 py-3 text-slate-600">{pretty(item[c.key])}</td>)}</tr>)}</tbody></table></div>}
  </section>
);

const PersonDetail = () => {
  const { id } = useParams();
  const [person, setPerson] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeImage, setActiveImage] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [personRes, imagesRes] = await Promise.all([
        api.get(`/persons/${id}/`),
        api.get(`/persons/${id}/images/`),
      ]);
      setPerson(personRes.data);
      setImages(imagesRes.data?.images || []);
    } catch (err) {
      console.error('Failed to load person profile:', err);
      setError(err.response?.data?.detail || 'Could not load this individual profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const action = async name => {
    if (name === 'reject' && !window.confirm('Reject this individual?')) return;
    setBusy(true);
    try {
      await api.post(`/persons/${id}/${name}/`);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.detail || `Could not ${name} this individual.`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50"><AdminSidebar /><main className="p-10 md:ml-64">Loading individual profile...</main></div>;
  if (error || !person) return <div className="min-h-screen bg-slate-50"><AdminSidebar /><main className="p-10 md:ml-64"><p className="text-red-600">{error || 'Individual not found.'}</p><Link className="mt-4 inline-block text-indigo-600" to="/admin/persons">Back to individuals</Link></main></div>;

  const verified = person.is_verified || person.verification_status === 'verified';
  const status = verified ? 'Verified' : person.verification_status || 'Pending';

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar />
      <main className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-8 md:ml-64">
        <div><Link to="/admin/persons" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600"><ArrowLeftIcon className="h-4 w-4" /> Back to individuals</Link></div>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Individual profile · #{person.id}</p><h1 className="mt-2 text-2xl font-bold text-slate-900">{person.full_name || 'Unnamed individual'}</h1><p className="mt-1 text-sm text-slate-500">{person.phone_number || 'No phone number'} · {person.national_id || 'No national ID'}</p><span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${verified ? 'bg-emerald-50 text-emerald-700' : person.verification_status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{status}</span></div>
            <div className="flex flex-wrap gap-2">
              {!verified && person.verification_status !== 'rejected' && <button disabled={busy} onClick={() => action('verify')} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"><CheckCircleIcon className="h-4 w-4" /> Verify</button>}
              {!verified && person.verification_status !== 'rejected' && <button disabled={busy} onClick={() => action('reject')} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"><XCircleIcon className="h-4 w-4" /> Reject</button>}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-5 font-semibold text-slate-900">Personal information</h2>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {['full_name', 'national_id', 'phone_number', 'address', 'credit_score', 'is_verified', 'verification_status', 'needs_manual_review', 'user_mode', 'user_status', 'created_at', 'updated_at'].map(key => <Field key={key} label={key} value={person[key]} />)}
            <Field label="Company" value={person.company?.name} />
            <Field label="ID verification method" value={person.id_verification_method} />
            <Field label="ID verification score" value={person.id_verification_score} />
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><PhotographIcon className="h-5 w-5 text-indigo-600" /><h2 className="font-semibold text-slate-900">Identity documents ({images.length})</h2></div>
          {images.length === 0 ? <p className="text-sm text-slate-500">No uploaded ID images were found for this individual.</p> :
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{images.map((img, i) => <button key={img.filename || i} onClick={() => setActiveImage(img)} className="overflow-hidden rounded-lg border border-slate-200 text-left hover:border-indigo-400"><img src={img.url} alt={img.filename || `ID image ${i + 1}`} className="h-40 w-full bg-slate-100 object-contain" /><p className="truncate px-2 py-2 text-xs text-slate-500">{img.filename || `Document ${i + 1}`}</p></button>)}</div>}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Credit history</h2>
          {person.credit_history ? <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(person.credit_history).filter(([key]) => key !== 'person').map(([key, value]) => <Field key={key} label={key} value={value} />)}</dl> : <p className="text-sm text-slate-500">No credit history is available.</p>}
        </section>

        <DataTable title="Loans given" data={rows(person.loans_given)} empty="No loans given by this individual." columns={[{key:'id',label:'Contract ID'},{key:'borrower',label:'Borrower'},{key:'amount',label:'Amount'},{key:'status',label:'Status'},{key:'created_at',label:'Date'}]} />
        <DataTable title="Loans taken" data={rows(person.loans_taken)} empty="No loans taken by this individual." columns={[{key:'id',label:'Contract ID'},{key:'lender',label:'Lender'},{key:'amount',label:'Amount'},{key:'status',label:'Status'},{key:'created_at',label:'Date'}]} />
        <DataTable title="WhatsApp messages" data={rows(person.messages)} empty="No WhatsApp messages are associated with this individual." columns={[{key:'id',label:'Message ID'},{key:'message',label:'Message'},{key:'message_type',label:'Type'},{key:'created_at',label:'Date'}]} />
        <DataTable title="Uploaded persons" data={rows(person.uploaded_persons)} empty="No uploaded persons are associated with this individual." columns={[{key:'id',label:'ID'},{key:'full_name',label:'Full name'},{key:'national_id',label:'National ID'},{key:'phone_number',label:'Phone'}]} />
      </main>

      {activeImage && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4" onClick={() => setActiveImage(null)}><button aria-label="Close image" className="absolute right-5 top-5 text-3xl text-white">&times;</button><img src={activeImage.url} alt={activeImage.filename || 'National ID'} className="max-h-[90vh] max-w-full object-contain" onClick={e => e.stopPropagation()} /></div>}
    </div>
  );
};

export default PersonDetail;
