
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import api from '../services/api';

import {
  PlusCircleIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  XCircleIcon,
  CheckCircleIcon,
  SearchIcon,
  PhotographIcon,
  PhoneIcon,
  LocationMarkerIcon,
  IdentificationIcon,
  RefreshIcon,
  ExclamationCircleIcon,
  UserCircleIcon,
} from '@heroicons/react/outline';

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const getList = data => {
  if (Array.isArray(data)) return data;
  return data?.results || [];
};

const getError = (error, fallback) =>
  error.response?.data?.error ||
  error.response?.data?.detail ||
  fallback;

const getVerificationStatus = person => {
  if (person.is_verified || person.verification_status === 'verified') {
    return 'Verified';
  }

  if (person.verification_status === 'rejected') {
    return 'Rejected';
  }

  return 'Pending';
};

const isPersonActive = person => person.is_active !== false;

const StatusBadge = ({ children, type = 'neutral' }) => {
  const styles = {
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    danger: 'bg-red-50 text-red-700 ring-red-600/20',
    warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    neutral: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[type]}`}>
      {children}
    </span>
  );
};

const ActionButton = ({
  onClick,
  disabled,
  icon: Icon,
  children,
  color = 'slate',
}) => {
  const styles = {
    green: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
    red: 'border-red-200 text-red-700 hover:bg-red-50',
    amber: 'border-amber-200 text-amber-700 hover:bg-amber-50',
    blue: 'border-indigo-200 text-indigo-700 hover:bg-indigo-50',
    slate: 'border-slate-200 text-slate-600 hover:bg-slate-50',
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[color]}`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
};

// --------------------------------------------------
// Person image and quick-action popup
// --------------------------------------------------

const PersonPopup = ({
  person,
  images,
  loadingImages,
  imageError,
  onClose,
  onAction,
  busy,
  onEdit,
  onDelete,
}) => {
  const [activeImage, setActiveImage] = useState(null);

  if (!person) return null;

  const active = isPersonActive(person);
  const verified = getVerificationStatus(person) === 'Verified';
  const verificationStatus = getVerificationStatus(person);

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
        onClick={onClose}
      >
        <div
          className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          onClick={event => event.stopPropagation()}
        >
          {/* Popup header */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                <UserCircleIcon className="h-8 w-8 text-indigo-600" />
              </div>

              <div className="min-w-0">
                <h2 className="break-words text-lg font-bold text-slate-900 sm:text-xl">
                  {person.full_name || 'Unnamed individual'}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  National ID: {person.national_id || 'Not provided'}
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge
                    type={active ? 'success' : 'danger'}
                  >
                    {active ? 'Active' : 'Inactive'}
                  </StatusBadge>

                  <StatusBadge
                    type={
                      verified
                        ? 'success'
                        : verificationStatus === 'Rejected'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {verificationStatus}
                  </StatusBadge>

                  {person.needs_manual_review && (
                    <StatusBadge type="warning">
                      Manual review
                    </StatusBadge>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close popup"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Popup content */}
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-7">

            {/* Person information */}
            <section>
              <h3 className="mb-4 text-sm font-semibold text-slate-900">
                Individual information
              </h3>

              <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-start gap-3">
                  <IdentificationIcon className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">National ID</p>
                    <p className="break-words text-sm font-medium text-slate-800">
                      {person.national_id || '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <PhoneIcon className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">Phone number</p>
                    <p className="break-words text-sm font-medium text-slate-800">
                      {person.phone_number || '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:col-span-2 lg:col-span-1">
                  <LocationMarkerIcon className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">Address</p>
                    <p className="break-words text-sm font-medium text-slate-800">
                      {person.address || 'No address provided'}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Identity images */}
            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Identity documents
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Images received through WhatsApp
                  </p>
                </div>

                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  {images.length} image{images.length === 1 ? '' : 's'}
                </span>
              </div>

              {loadingImages ? (
                <div className="flex items-center justify-center rounded-xl border border-slate-200 py-12">
                  <div className="text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                    <p className="mt-3 text-sm text-slate-500">
                      Loading identity images...
                    </p>
                  </div>
                </div>
              ) : imageError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                  {imageError}
                </div>
              ) : images.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                  <PhotographIcon className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-600">
                    No identity images found
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    No uploaded WhatsApp images were found for this phone number.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {images.map((image, index) => (
                    <button
                      type="button"
                      key={image.filename || image.id || index}
                      onClick={() => setActiveImage(image)}
                      className="group overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition hover:border-indigo-400 hover:shadow-md"
                    >
                      <div className="flex h-36 items-center justify-center bg-slate-100 sm:h-44">
                        <img
                          src={image.url}
                          alt={image.filename || `Identity image ${index + 1}`}
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                        <span className="truncate text-xs font-medium text-slate-600">
                          {image.filename || `Document ${index + 1}`}
                        </span>
                        <EyeIcon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-indigo-600" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Popup quick actions */}
          <div className="border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Quick actions
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Manage this individual's account and verification.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {!verified && verificationStatus !== 'Rejected' && (
                  <ActionButton
                    icon={CheckCircleIcon}
                    color="green"
                    disabled={busy}
                    onClick={() => onAction('verify')}
                  >
                    Verify
                  </ActionButton>
                )}

                {!verified && verificationStatus !== 'Rejected' && (
                  <ActionButton
                    icon={XCircleIcon}
                    color="red"
                    disabled={busy}
                    onClick={() => onAction('reject')}
                  >
                    Reject
                  </ActionButton>
                )}

                {active ? (
                  <ActionButton
                    icon={XCircleIcon}
                    color="amber"
                    disabled={busy}
                    onClick={() => onAction('deactivate')}
                  >
                    Deactivate
                  </ActionButton>
                ) : (
                  <ActionButton
                    icon={RefreshIcon}
                    color="green"
                    disabled={busy}
                    onClick={() => onAction('activate')}
                  >
                    Reactivate
                  </ActionButton>
                )}

                <ActionButton
                  icon={PencilIcon}
                  color="blue"
                  onClick={onEdit}
                >
                  Edit
                </ActionButton>

                <ActionButton
                  icon={TrashIcon}
                  color="red"
                  onClick={onDelete}
                >
                  Delete
                </ActionButton>
              </div>
            </div>

            {busy && (
              <p className="mt-3 text-right text-xs text-indigo-600">
                Processing action...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Full-size image preview */}
      {activeImage && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setActiveImage(null)}
        >
          <button
            type="button"
            onClick={() => setActiveImage(null)}
            className="absolute right-5 top-5 text-3xl text-white"
            aria-label="Close image preview"
          >
            &times;
          </button>

          <img
            src={activeImage.url}
            alt={activeImage.filename || 'Identity document'}
            onClick={event => event.stopPropagation()}
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
};

// --------------------------------------------------
// Main Person Management component
// --------------------------------------------------

const PersonManagement = () => {
  const [persons, setPersons] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [manualReviewFilter, setManualReviewFilter] = useState('all');

  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personImages, setPersonImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [imageError, setImageError] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    national_id: '',
    phone_number: '',
    address: '',
    company_id: '',
  });

  // --------------------------------------------------
  // Data loading
  // --------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = {};

      if (manualReviewFilter === 'review') {
        params.needs_manual_review = 'true';
      } else if (manualReviewFilter === 'verified') {
        params.needs_manual_review = 'false';
      }

      const [personsRes, companiesRes] = await Promise.all([
        api.get('/persons/', { params }),
        api.get('/companies/'),
      ]);

      setPersons(getList(personsRes.data));
      setCompanies(getList(companiesRes.data));
    } catch (err) {
      console.error('Error fetching persons:', err);
      setError(getError(err, 'Failed to load individuals.'));
    } finally {
      setLoading(false);
    }
  }, [manualReviewFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --------------------------------------------------
  // Popup
  // --------------------------------------------------

  const openPersonPopup = async person => {
    setSelectedPerson(person);
    setPersonImages([]);
    setImageError('');
    setLoadingImages(true);

    try {
      const response = await api.get(`/persons/${person.id}/images/`);
      setPersonImages(response.data?.images || []);
    } catch (err) {
      console.error('Failed to load person images:', err);
      setImageError(
        getError(err, 'Could not load identity images.')
      );
    } finally {
      setLoadingImages(false);
    }
  };

  const closePersonPopup = () => {
    if (busy) return;

    setSelectedPerson(null);
    setPersonImages([]);
    setImageError('');
  };

  // --------------------------------------------------
  // Quick actions
  // --------------------------------------------------

  const handlePersonAction = async name => {
    if (!selectedPerson) return;

    const personId = selectedPerson.id;

    const confirmationMessages = {
      reject: 'Are you sure you want to reject this individual?',
      deactivate: 'Are you sure you want to deactivate this individual?',
      activate: 'Are you sure you want to reactivate this individual?',
    };

    if (
      confirmationMessages[name] &&
      !window.confirm(confirmationMessages[name])
    ) {
      return;
    }

    setBusy(true);

    try {
      await api.post(`/persons/${personId}/${name}/`);

      await fetchData();

      // Keep the popup open and update its displayed person.
      const updatedResponse = await api.get(`/persons/${personId}/`);
      setSelectedPerson(updatedResponse.data);
    } catch (err) {
      console.error(`Failed to ${name} person:`, err);

      alert(
        getError(err, `Could not ${name} this individual.`)
      );
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------------
  // Add / Edit / Delete
  // --------------------------------------------------

  const resetForm = () => {
    setFormData({
      full_name: '',
      national_id: '',
      phone_number: '',
      address: '',
      company_id: '',
    });
  };

  const openAddModal = () => {
    resetForm();
    setEditingPerson(null);
    setShowAddModal(true);
  };

  const openEditModal = person => {
    setEditingPerson(person);

    setFormData({
      full_name: person.full_name || '',
      national_id: person.national_id || '',
      phone_number: person.phone_number || '',
      address: person.address || '',
      company_id: person.company?.id || person.company_id || '',
    });

    setSelectedPerson(null);
    setShowAddModal(true);
  };

  const closeFormModal = () => {
    setShowAddModal(false);
    setEditingPerson(null);
    resetForm();
  };

  const handleSavePerson = async event => {
    event.preventDefault();

    const payload = {
      full_name: formData.full_name,
      national_id: formData.national_id,
      phone_number: formData.phone_number,
      address: formData.address,
      company: formData.company_id
        ? parseInt(formData.company_id, 10)
        : null,
    };

    setBusy(true);

    try {
      if (editingPerson) {
        await api.put(`/persons/${editingPerson.id}/`, payload);
      } else {
        await api.post('/persons/', payload);
      }

      closeFormModal();
      await fetchData();
    } catch (err) {
      console.error('Failed to save person:', err);

      alert(
        getError(
          err,
          editingPerson
            ? 'Failed to update individual.'
            : 'Failed to add individual.'
        )
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePerson = async person => {
    if (!person) return;

    if (
      !window.confirm(
        `Are you sure you want to delete ${person.full_name || 'this individual'}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      await api.delete(`/persons/${person.id}/`);

      setSelectedPerson(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete person:', err);
      alert(getError(err, 'Failed to delete individual.'));
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------------
  // Local search
  // --------------------------------------------------

  const filteredPersons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return persons;

    return persons.filter(person => {
      const searchable = [
        person.full_name,
        person.national_id,
        person.phone_number,
        person.address,
        person.company?.name,
      ];

      return searchable.some(value =>
        String(value || '').toLowerCase().includes(query)
      );
    });
  }, [persons, searchQuery]);

  const counts = useMemo(() => ({
    total: persons.length,
    active: persons.filter(isPersonActive).length,
    inactive: persons.filter(person => !isPersonActive(person)).length,
    pending: persons.filter(person =>
      !person.is_verified &&
      person.verification_status !== 'rejected'
    ).length,
  }), [persons]);

  // --------------------------------------------------
  // Loading state
  // --------------------------------------------------

  if (loading && persons.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AdminSidebar />
        <main className="flex min-h-screen items-center justify-center md:ml-64">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
            <p className="mt-4 text-sm text-slate-500">
              Loading individuals...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar />

      <main className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-8 md:ml-64">

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              CrediSafe administration
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Person Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage individual records, identity verification and account status.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <PlusCircleIcon className="h-5 w-5" />
            Add individual
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Total individuals', value: counts.total },
            { label: 'Active accounts', value: counts.active },
            { label: 'Inactive accounts', value: counts.inactive },
            { label: 'Awaiting verification', value: counts.pending },
          ].map(item => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-medium text-slate-500">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Search and filters */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Search name, national ID, phone or address..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <select
              value={manualReviewFilter}
              onChange={event => setManualReviewFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400"
            >
              <option value="all">All individuals</option>
              <option value="review">Needs manual review</option>
              <option value="verified">Verified individuals</option>
            </select>

            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <RefreshIcon className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Errors */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <ExclamationCircleIcon className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Persons table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">
                Individuals
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {filteredPersons.length} record{filteredPersons.length === 1 ? '' : 's'} displayed
              </p>
            </div>

            {loading && (
              <span className="text-xs text-indigo-600">
                Updating records...
              </span>
            )}
          </div>

          {filteredPersons.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <UserCircleIcon className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-3 font-semibold text-slate-700">
                No individuals found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-slate-50">
                  <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-4">Individual</th>
                    <th className="px-5 py-4">Phone</th>
                    <th className="px-5 py-4">Account status</th>
                    <th className="px-5 py-4">Verification</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredPersons.map(person => {
                    const active = isPersonActive(person);
                    const verified = getVerificationStatus(person) === 'Verified';
                    const verificationStatus = getVerificationStatus(person);

                    return (
                      <tr
                        key={person.id}
                        className={`transition hover:bg-slate-50/80 ${!active ? 'bg-slate-50/50' : ''}`}
                      >
                        {/* Name, ID and address */}
                        <td className="max-w-sm px-5 py-4">
                          <Link
                            to={`/admin/persons/${person.id}`}
                            className="font-semibold text-slate-900 transition hover:text-indigo-600"
                          >
                            {person.full_name || 'Unnamed individual'}
                          </Link>

                          <p className="mt-1 text-xs font-medium text-slate-500">
                            ID: {person.national_id || 'Not provided'}
                          </p>

                          <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-400">
                            <LocationMarkerIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span className="line-clamp-2">
                              {person.address || 'No address provided'}
                            </span>
                          </p>
                        </td>

                        {/* Phone */}
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {person.phone_number || '—'}
                        </td>

                        {/* Account status */}
                        <td className="px-5 py-4">
                          {active ? (
                            <StatusBadge type="success">
                              Active
                            </StatusBadge>
                          ) : (
                            <StatusBadge type="danger">
                              Inactive
                            </StatusBadge>
                          )}
                        </td>

                        {/* Verification status */}
                        <td className="px-5 py-4">
                          <div className="flex flex-col items-start gap-1.5">
                            <StatusBadge
                              type={
                                verified
                                  ? 'success'
                                  : verificationStatus === 'Rejected'
                                    ? 'danger'
                                    : 'warning'
                              }
                            >
                              {verificationStatus}
                            </StatusBadge>

                            {person.needs_manual_review && (
                              <span className="text-[11px] font-medium text-amber-600">
                                Manual review
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openPersonPopup(person)}
                              title="View identity images and quick actions"
                              className="rounded-lg border border-indigo-200 p-2 text-indigo-600 transition hover:bg-indigo-50"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditModal(person)}
                              title="Edit individual"
                              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeletePerson(person)}
                              title="Delete individual"
                              className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Person image popup */}
      {selectedPerson && (
        <PersonPopup
          person={selectedPerson}
          images={personImages}
          loadingImages={loadingImages}
          imageError={imageError}
          onClose={closePersonPopup}
          onAction={handlePersonAction}
          busy={busy}
          onEdit={() => openEditModal(selectedPerson)}
          onDelete={() => handleDeletePerson(selectedPerson)}
        />
      )}

      {/* Add / Edit modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4"
          onClick={closeFormModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingPerson ? 'Edit individual' : 'Add individual'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the individual's personal information.
                </p>
              </div>

              <button
                type="button"
                onClick={closeFormModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSavePerson}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Full name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={event => setFormData({
                      ...formData,
                      full_name: event.target.value,
                    })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    National ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.national_id}
                    onChange={event => setFormData({
                      ...formData,
                      national_id: event.target.value,
                    })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Phone number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone_number}
                    onChange={event => setFormData({
                      ...formData,
                      phone_number: event.target.value,
                    })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Company
                  </label>
                  <select
                    value={formData.company_id}
                    onChange={event => setFormData({
                      ...formData,
                      company_id: event.target.value,
                    })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">No company</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Address
                  </label>
                  <textarea
                    rows={3}
                    value={formData.address}
                    onChange={event => setFormData({
                      ...formData,
                      address: event.target.value,
                    })}
                    className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {busy
                    ? 'Saving...'
                    : editingPerson
                      ? 'Update individual'
                      : 'Add individual'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonManagement;
