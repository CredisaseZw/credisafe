
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import api from '../services/api';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  PhotographIcon,
  UserCircleIcon,
  CreditCardIcon,
  ClockIcon,
  ChatAlt2Icon,
  BriefcaseIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/outline';

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const rows = value => Array.isArray(value) ? value : [];

const firstValue = (...values) =>
  values.find(value =>
    value !== undefined &&
    value !== null &&
    value !== ''
  );

const formatLabel = value =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());

const formatDate = value => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatValue = value => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '—';
  }

  if (typeof value === 'object') {
    return firstValue(
      value.name,
      value.full_name,
      value.title,
      value.label,
      value.national_id
    ) || '—';
  }

  return String(value);
};

const formatCurrency = value => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const numeric = Number(value);

  if (Number.isNaN(numeric)) return String(value);

  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Explicitly exclude sensitive and internal fields.
const isSensitiveField = key => {
  const normalized = String(key).toLowerCase();

  const blocked = [
    'otp',
    'password',
    'token',
    'session',
    'secret',
    'authorization',
    'cookie',
    'csrf',
    'user_mode',
    'user_status',
    'session_key',
    'access_token',
    'refresh_token',
    'verification_code',
    'verification_token',
    'pin',
    'mentioned_name',
    'internal_notes',
    'raw_payload',
  ];

  return blocked.some(term => normalized.includes(term));
};

const getMessageText = message =>
  firstValue(
    message.message,
    message.text,
    message.body,
    message.content,
    message.message_body
  ) || '';

const getMessageDirection = message => {
  const direction = String(
    firstValue(
      message.direction,
      message.message_type,
      message.type,
      message.status
    ) || ''
  ).toLowerCase();

  if (
    message.is_outgoing === true ||
    message.is_from_business === true ||
    message.is_sent_by_us === true ||
    ['outgoing', 'sent', 'outbound'].includes(direction)
  ) {
    return 'outgoing';
  }

  return 'incoming';
};

// --------------------------------------------------
// Reusable components
// --------------------------------------------------

const Section = ({ title, subtitle, icon: Icon, children, action }) => (
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="rounded-lg bg-indigo-50 p-2">
            <Icon className="h-5 w-5 text-indigo-600" />
          </div>
        )}
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const Field = ({ label, value, highlight = false }) => (
  <div className="min-w-0">
    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
      {label}
    </dt>
    <dd className={`mt-1 break-words text-sm ${highlight
        ? 'font-semibold text-slate-900'
        : 'font-medium text-slate-700'
      }`}>
      {formatValue(value)}
    </dd>
  </div>
);

const StatusBadge = ({ children, type = 'neutral' }) => {
  const styles = {
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    danger: 'bg-red-50 text-red-700 ring-red-600/20',
    warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    neutral: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${styles[type]}`}>
      {children}
    </span>
  );
};

const DataTable = ({ title, data, empty, columns }) => (
  <Section title={title}>
    {!data.length ? (
      <div className="px-6 py-10 text-center">
        <p className="text-sm text-slate-500">{empty}</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map(column => (
                <th key={column.key} className="px-5 py-3 font-semibold">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item, index) => (
              <tr key={item.id || item.pk || index} className="hover:bg-slate-50/70">
                {columns.map(column => (
                  <td key={column.key} className="max-w-xs break-words px-5 py-4 text-slate-600">
                    {column.render
                      ? column.render(item)
                      : formatValue(item[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Section>
);

// --------------------------------------------------
// WhatsApp messages
// --------------------------------------------------

const MessageCard = ({ message }) => {
  const [expanded, setExpanded] = useState(false);

  const direction = getMessageDirection(message);
  const outgoing = direction === 'outgoing';
  const text = String(getMessageText(message));
  const isLong = text.length > 240;
  const visibleText = expanded || !isLong
    ? text
    : `${text.slice(0, 240).trim()}…`;

  const messageDate = firstValue(
    message.created_at,
    message.timestamp,
    message.sent_at,
    message.date
  );

  return (
    <div className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
      <div className={`w-full max-w-[88%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${outgoing
          ? 'rounded-br-sm bg-indigo-600 text-white'
          : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800'
        }`}>
        <div className="mb-2 flex items-center justify-between gap-4">
          <span className={`text-xs font-semibold ${outgoing ? 'text-indigo-100' : 'text-slate-500'
            }`}>
            {outgoing ? 'Outgoing' : 'Incoming'}
          </span>
          {messageDate && (
            <span className={`text-[10px] ${outgoing ? 'text-indigo-200' : 'text-slate-400'
              }`}>
              {formatDate(messageDate)}
            </span>
          )}
        </div>

        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {visibleText || 'No message content'}
        </p>

        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded(value => !value)}
            className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${outgoing
                ? 'text-indigo-100 hover:text-white'
                : 'text-indigo-600 hover:text-indigo-800'
              }`}
          >
            {expanded ? 'Show less' : 'Read more'}
            {expanded
              ? <ChevronUpIcon className="h-3 w-3" />
              : <ChevronDownIcon className="h-3 w-3" />
            }
          </button>
        )}
      </div>
    </div>
  );
};

const MessagesSection = ({ messages }) => (
  <Section
    title="WhatsApp conversations"
    subtitle={`${messages.length} message${messages.length === 1 ? '' : 's'} associated with this individual`}
    icon={ChatAlt2Icon}
    action={
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-white ring-1 ring-slate-300" />
          Incoming
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-600" />
          Outgoing
        </span>
      </div>
    }
  >
    {!messages.length ? (
      <div className="px-6 py-10 text-center">
        <ChatAlt2Icon className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-3 text-sm text-slate-500">
          No WhatsApp messages are associated with this individual.
        </p>
      </div>
    ) : (
      <div className="max-h-[480px] space-y-4 overflow-y-auto bg-slate-50/70 p-4 sm:p-6">
        {messages.map((message, index) => (
          <MessageCard
            key={message.id || message.pk || index}
            message={message}
          />
        ))}
      </div>
    )}
  </Section>
);

// --------------------------------------------------
// Main component
// --------------------------------------------------

const PersonDetail = () => {
  const { id } = useParams();

  const [person, setPerson] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeImage, setActiveImage] = useState(null);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [personRes, imagesRes] = await Promise.all([
        api.get(`/persons/${id}/`),
        api.get(`/persons/${id}/images/`),
      ]);

      setPerson(personRes.data);
      setImages(rows(imagesRes.data?.images));
    } catch (err) {
      console.error('Failed to load person profile:', err);
      setError(
        err.response?.data?.detail ||
        'Could not load this individual profile.'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const action = async name => {
    const label = name === 'verify' ? 'verify' : 'reject';

    if (
      name === 'reject' &&
      !window.confirm('Are you sure you want to reject this individual?')
    ) {
      return;
    }

    setBusy(true);
    setActionError('');

    try {
      await api.post(`/persons/${id}/${name}/`);
      await load();
    } catch (err) {
      setActionError(
        err.response?.data?.error ||
        err.response?.data?.detail ||
        `Could not ${label} this individual.`
      );
    } finally {
      setBusy(false);
    }
  };

  const creditHistory = person?.credit_history || {};

  const creditScore = firstValue(
    person?.credit_score,
    creditHistory.credit_score,
    creditHistory.score
  );

  const oldestCreditor = firstValue(
    person?.oldest_creditor,
    person?.oldest_creditor_name,
    creditHistory.oldest_creditor,
    creditHistory.oldest_creditor_name,
    creditHistory.oldest_creditor?.name
  );

  const verified = Boolean(
    person?.is_verified ||
    person?.verification_status === 'verified'
  );

  const rejected = person?.verification_status === 'rejected';

  const messages = useMemo(
    () => rows(person?.messages),
    [person?.messages]
  );

  const loansGiven = useMemo(
    () => rows(person?.loans_given),
    [person?.loans_given]
  );

  const loansTaken = useMemo(
    () => rows(person?.loans_taken),
    [person?.loans_taken]
  );

  const uploadedPersons = useMemo(
    () => rows(person?.uploaded_persons),
    [person?.uploaded_persons]
  );

  if (loading && !person) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AdminSidebar />
        <main className="flex min-h-screen items-center justify-center p-8 md:ml-64">
          <div className="text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
            <p className="mt-4 text-sm font-medium text-slate-500">
              Loading individual profile...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AdminSidebar />
        <main className="p-6 md:ml-64">
          <div className="rounded-xl border border-red-200 bg-white p-6">
            <div className="flex items-center gap-3 text-red-600">
              <ExclamationCircleIcon className="h-6 w-6" />
              <p className="font-semibold">
                {error || 'Individual not found.'}
              </p>
            </div>
            <Link
              to="/admin/persons"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to individuals
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar />

      <main className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-8 md:ml-64">

        {/* Page heading */}
        <div>
          <Link
            to="/admin/persons"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-600"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to individuals
          </Link>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Individual credit profile
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              {person.full_name || 'Unnamed individual'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Profile reference #{person.id}
            </p>
          </div>
        </div>

        {/* Profile overview */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-6 p-5 sm:p-6 lg:flex-row lg:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50">
                <UserCircleIcon className="h-9 w-9 text-indigo-600" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {person.full_name || 'Unnamed individual'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {person.phone_number || 'No phone number provided'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  National ID: {person.national_id || 'Not provided'}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge type={verified ? 'success' : rejected ? 'danger' : 'warning'}>
                    {verified ? 'Verified' : rejected ? 'Rejected' : 'Pending verification'}
                  </StatusBadge>

                  {person.needs_manual_review && (
                    <StatusBadge type="warning">
                      Manual review required
                    </StatusBadge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!verified && !rejected && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => action('verify')}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    Verify individual
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => action('reject')}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XCircleIcon className="h-4 w-4" />
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>

          {actionError && (
            <div className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
              {actionError}
            </div>
          )}
        </section>

        {/* Credit overview */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl bg-indigo-700 p-5 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-indigo-100">
                Credit score
              </p>
              <CreditCardIcon className="h-6 w-6 text-indigo-200" />
            </div>
            <p className="mt-4 text-4xl font-bold">
              {creditScore ?? '—'}
            </p>
            <p className="mt-2 text-xs text-indigo-200">
              Current recorded credit score
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <BriefcaseIcon className="h-5 w-5 text-indigo-600" />
              <p className="text-sm font-medium">Oldest creditor</p>
            </div>
            <p className="mt-4 break-words text-xl font-bold text-slate-900">
              {formatValue(oldestCreditor)}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Earliest recorded creditor
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <ClockIcon className="h-5 w-5 text-indigo-600" />
              <p className="text-sm font-medium">Profile created</p>
            </div>
            <p className="mt-4 text-xl font-bold text-slate-900">
              {person.created_at
                ? formatDate(person.created_at).split(',')[0]
                : '—'}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Registration date
            </p>
          </div>
        </div>

        {/* Personal information */}
        <Section
          title="Personal information"
          subtitle="Basic identification and contact details"
          icon={UserCircleIcon}
        >
          <dl className="grid grid-cols-1 gap-x-8 gap-y-6 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
            <Field label="Full name" value={person.full_name} />
            <Field label="National ID" value={person.national_id} />
            <Field label="Phone number" value={person.phone_number} />
            <Field label="Address" value={person.address} />
            <Field label="Company" value={person.company?.name || person.company_name} />
            <Field label="Date registered" value={formatDate(person.created_at)} />
          </dl>
        </Section>

        {/* Identity documents */}
        <Section
          title="Identity documents"
          subtitle="Uploaded identification images"
          icon={PhotographIcon}
          action={
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {images.length} document{images.length === 1 ? '' : 's'}
            </span>
          }
        >
          {!images.length ? (
            <div className="px-6 py-10 text-center">
              <PhotographIcon className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">
                No uploaded identity documents were found.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((img, index) => (
                <button
                  type="button"
                  key={img.filename || img.id || index}
                  onClick={() => setActiveImage(img)}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition hover:border-indigo-400 hover:shadow-md"
                >
                  <div className="flex h-40 items-center justify-center bg-slate-100">
                    <img
                      src={img.url}
                      alt={img.filename || `Identity document ${index + 1}`}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <p className="truncate px-3 py-3 text-xs font-medium text-slate-600 group-hover:text-indigo-600">
                    {img.filename || `Document ${index + 1}`}
                  </p>
                </button>
              ))}
            </div>
          )}
        </Section>

        {/* Credit history */}
        <Section
          title="Credit history"
          subtitle="Recorded credit information"
          icon={CreditCardIcon}
        >
          {Object.keys(creditHistory).filter(key =>
            key !== 'person' && !isSensitiveField(key)
          ).length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-500">
              No additional credit history is available.
            </p>
          ) : (
            <dl className="grid grid-cols-1 gap-x-8 gap-y-6 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
              {Object.entries(creditHistory)
                .filter(([key]) =>
                  key !== 'person' &&
                  !isSensitiveField(key) &&
                  !['credit_score', 'score', 'oldest_creditor', 'oldest_creditor_name'].includes(key)
                )
                .map(([key, value]) => (
                  <Field
                    key={key}
                    label={formatLabel(key)}
                    value={value}
                  />
                ))}
            </dl>
          )}
        </Section>

        {/* Loans */}
        <DataTable
          title="Loans given"
          data={loansGiven}
          empty="No loans given by this individual."
          columns={[
            { key: 'id', label: 'Contract ID' },
            { key: 'borrower', label: 'Borrower' },
            { key: 'amount', label: 'Amount', render: item => formatCurrency(item.amount) },
            { key: 'status', label: 'Status' },
            { key: 'created_at', label: 'Date', render: item => formatDate(item.created_at) },
          ]}
        />

        <DataTable
          title="Loans taken"
          data={loansTaken}
          empty="No loans taken by this individual."
          columns={[
            { key: 'id', label: 'Contract ID' },
            { key: 'lender', label: 'Lender' },
            { key: 'amount', label: 'Amount', render: item => formatCurrency(item.amount) },
            { key: 'status', label: 'Status' },
            { key: 'created_at', label: 'Date', render: item => formatDate(item.created_at) },
          ]}
        />

        {/* WhatsApp messages */}
        <MessagesSection messages={messages} />

        {/* Uploaded persons */}
        <DataTable
          title="Uploaded individuals"
          data={uploadedPersons}
          empty="No other uploaded individuals are associated with this record."
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'full_name', label: 'Full name' },
            { key: 'national_id', label: 'National ID' },
            { key: 'phone_number', label: 'Phone number' },
          ]}
        />

        <div className="pb-6 text-xs text-slate-400">
          Last updated: {formatDate(person.updated_at)}
        </div>
      </main>

      {/* Identity document preview */}
      {activeImage && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 p-4"
          onClick={() => setActiveImage(null)}
        >
          <button
            type="button"
            aria-label="Close image"
            onClick={() => setActiveImage(null)}
            className="absolute right-5 top-5 rounded-full bg-white/10 px-3 py-1 text-3xl text-white hover:bg-white/20"
          >
            &times;
          </button>

          <div
            className="max-h-[90vh] max-w-5xl"
            onClick={event => event.stopPropagation()}
          >
            <img
              src={activeImage.url}
              alt={activeImage.filename || 'Identity document'}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
            {activeImage.filename && (
              <p className="mt-3 text-center text-sm text-white">
                {activeImage.filename}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonDetail;
