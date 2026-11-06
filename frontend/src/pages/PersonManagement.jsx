
import React, { useState, useEffect, useCallback } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import api from '../services/api';
import {
  PlusCircleIcon,
  PencilIcon,
  TrashIcon,
  XCircleIcon,
  SearchIcon,
} from '@heroicons/react/outline';

const PersonManagement = () => {
  const [persons, setPersons] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);

  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [manualReviewFilter, setManualReviewFilter] = useState('all');

  const [actionLoading, setActionLoading] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    national_id: '',
    phone_number: '',
    address: '',
    company_id: '',
    is_verified: false,
    verification_status: 'pending',
  });

  // --------------------------------------------------
  // FETCH PERSONS AND COMPANIES
  // --------------------------------------------------

  const fetchData = useCallback(async () => {
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

      setPersons(
        personsRes.data.results || personsRes.data || []
      );

      setCompanies(
        companiesRes.data.results || companiesRes.data || []
      );
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [manualReviewFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const filteredPersons = persons.filter((person) => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return true;

    return (
      person.full_name?.toLowerCase().includes(query) ||
      person.national_id?.toLowerCase().includes(query) ||
      person.phone_number?.toLowerCase().includes(query)
    );
  });

  // --------------------------------------------------
  // INDIVIDUAL PERSON DETAILS
  // --------------------------------------------------

  const openPersonDetails = async (personId) => {
    setDetailsLoading(true);
    setShowDetailsModal(true);
    setSelectedPerson(null);

    try {
      const response = await api.get(`/persons/${personId}/`);

      setSelectedPerson(response.data);
    } catch (error) {
      console.error('Error loading person details:', error);

      alert(
        error.response?.data?.detail ||
        'Failed to load person details.'
      );

      setShowDetailsModal(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedPerson(null);
  };

  // --------------------------------------------------
  // ADD PERSON
  // --------------------------------------------------

  const handleAddPerson = async (e) => {
    e.preventDefault();

    try {
      const data = {
        ...formData,
        company: formData.company_id
          ? parseInt(formData.company_id, 10)
          : null,
      };

      delete data.company_id;

      await api.post('/persons/', data);

      alert('Person added successfully!');

      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error adding person:', error);

      alert(
        error.response?.data?.detail ||
        'Failed to add person. Please try again.'
      );
    }
  };

  // --------------------------------------------------
  // EDIT PERSON
  // --------------------------------------------------

  const handleEditPerson = async (e) => {
    e.preventDefault();

    try {
      const data = {
        ...formData,
        company: formData.company_id
          ? parseInt(formData.company_id, 10)
          : null,
      };

      delete data.company_id;

      await api.put(`/persons/${editingPerson.id}/`, data);

      alert('Person updated successfully!');

      setEditingPerson(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error updating person:', error);

      alert(
        error.response?.data?.detail ||
        'Failed to update person. Please try again.'
      );
    }
  };

  // --------------------------------------------------
  // DELETE PERSON
  // --------------------------------------------------

  const handleDeletePerson = async (personId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this person?'
    );

    if (!confirmed) return;

    try {
      await api.delete(`/persons/${personId}/`);

      alert('Person deleted successfully!');

      fetchData();
    } catch (error) {
      console.error('Error deleting person:', error);

      alert(
        error.response?.data?.detail ||
        'Failed to delete person.'
      );
    }
  };

  // --------------------------------------------------
  // VERIFY PERSON
  // --------------------------------------------------

  const handleVerifyPerson = async (person) => {
    const confirmed = window.confirm(
      `Are you sure you want to verify ${person.full_name || 'this person'}?`
    );

    if (!confirmed) return;

    setActionLoading(`${person.id}-verify`);

    try {
      await api.post(`/persons/${person.id}/verify/`);

      alert('Person verified successfully.');

      await fetchData();

      // Refresh the details modal if this person is currently open.
      if (selectedPerson?.id === person.id) {
        await openPersonDetails(person.id);
      }
    } catch (error) {
      console.error('Error verifying person:', error);

      alert(
        error.response?.data?.error ||
        'Failed to verify person.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // --------------------------------------------------
  // REJECT PERSON
  // --------------------------------------------------

  const handleRejectPerson = async (person) => {
    const confirmed = window.confirm(
      `Are you sure you want to reject ${person.full_name || 'this person'}?`
    );

    if (!confirmed) return;

    setActionLoading(`${person.id}-reject`);

    try {
      await api.post(`/persons/${person.id}/reject/`);

      alert('Person rejected successfully.');

      await fetchData();

      if (selectedPerson?.id === person.id) {
        await openPersonDetails(person.id);
      }
    } catch (error) {
      console.error('Error rejecting person:', error);

      alert(
        error.response?.data?.error ||
        'Failed to reject person.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // --------------------------------------------------
  // DEACTIVATE PERSON
  // --------------------------------------------------

  const handleDeactivatePerson = async (person) => {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${person.full_name || 'this person'}?`
    );

    if (!confirmed) return;

    setActionLoading(`${person.id}-deactivate`);

    try {
      await api.post(`/persons/${person.id}/deactivate/`);

      alert('Person deactivated successfully.');

      await fetchData();

      if (selectedPerson?.id === person.id) {
        await openPersonDetails(person.id);
      }
    } catch (error) {
      console.error('Error deactivating person:', error);

      alert(
        error.response?.data?.error ||
        'Failed to deactivate person.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // --------------------------------------------------
  // FORM HELPERS
  // --------------------------------------------------

  const resetForm = () => {
    setFormData({
      full_name: '',
      national_id: '',
      phone_number: '',
      address: '',
      company_id: '',
      is_verified: false,
      verification_status: 'pending',
    });
  };

  const openEditModal = (person) => {
    setEditingPerson(person);

    setFormData({
      full_name: person.full_name || '',
      national_id: person.national_id || '',
      phone_number: person.phone_number || '',
      address: person.address || '',
      company_id: person.company?.id || person.company_id || '',
      is_verified: person.is_verified || false,
      verification_status: person.verification_status || 'pending',
    });
  };

  const closeFormModal = () => {
    setShowAddModal(false);
    setEditingPerson(null);
    resetForm();
  };

  // --------------------------------------------------
  // STATUS HELPERS
  // --------------------------------------------------

  const getVerificationStatus = (person) => {
    if (person.verification_status === 'rejected') {
      return {
        label: 'Rejected',
        className: 'bg-red-100 text-red-700',
      };
    }

    if (person.is_verified) {
      return {
        label: 'Verified',
        className: 'bg-green-100 text-green-700',
      };
    }

    if (person.needs_manual_review) {
      return {
        label: 'Needs Review',
        className: 'bg-orange-100 text-orange-700',
      };
    }

    return {
      label: 'Unverified',
      className: 'bg-yellow-100 text-yellow-700',
    };
  };

  const getAccountStatus = (person) => {
    if (person.is_active === false) {
      return {
        label: 'Deactivated',
        className: 'bg-gray-100 text-gray-700',
      };
    }

    return {
      label: 'Active',
      className: 'bg-green-100 text-green-700',
    };
  };

  // --------------------------------------------------
  // DETAILS MODAL FIELD HELPER
  // --------------------------------------------------

  const DetailField = ({ label, value }) => {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return null;
    }

    let displayValue = value;

    if (typeof value === 'boolean') {
      displayValue = value ? 'Yes' : 'No';
    } else if (typeof value === 'object') {
      displayValue = value.name || JSON.stringify(value);
    }

    return (
      <div className="border-b border-gray-100 py-3">
        <p className="text-xs font-medium text-gray-500 mb-1">
          {label}
        </p>

        <p className="text-sm text-gray-800 break-words">
          {String(displayValue)}
        </p>
      </div>
    );
  };

  // --------------------------------------------------
  // LOADING SCREEN
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminSidebar />

        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // MAIN COMPONENT
  // --------------------------------------------------

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />

      <div className="flex-1 ml-64 overflow-y-auto p-8">

        {/* PAGE HEADER */}

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              CREDISAFE
            </h1>

            <h2 className="text-xl font-semibold text-gray-700 mt-1">
              Person Management
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="btn-primary flex items-center gap-2 px-6 py-2"
          >
            <PlusCircleIcon className="w-5 h-5" />
            Add Person
          </button>
        </div>

        {/* SEARCH AND FILTER */}

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <form
            onSubmit={handleSearch}
            className="flex flex-col md:flex-row gap-4"
          >
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />

              <input
                type="text"
                placeholder="Search by name, national ID, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <select
              value={manualReviewFilter}
              onChange={(e) => setManualReviewFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 bg-white"
            >
              <option value="all">All People</option>
              <option value="review">Needs Manual Review</option>
              <option value="verified">Verified People</option>
            </select>

            <button
              type="submit"
              className="btn-primary px-6 py-2"
            >
              Search
            </button>
          </form>
        </div>

        {/* PERSONS TABLE */}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-800">
                People
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                {filteredPersons.length} people found
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">National ID</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredPersons.map((person) => {
                  const verificationStatus =
                    getVerificationStatus(person);

                  const accountStatus =
                    getAccountStatus(person);

                  const isActionLoading =
                    actionLoading?.startsWith(`${person.id}-`);

                  const canVerifyOrReject =
                    !person.is_verified &&
                    person.verification_status !== 'rejected';

                  return (
                    <tr
                      key={person.id}
                      className="hover:bg-gray-50"
                    >
                      {/* NAME - OPENS DETAILS */}

                      <td className="px-4 py-3 font-medium">
                        <button
                          type="button"
                          onClick={() => openPersonDetails(person.id)}
                          className="text-primary hover:underline font-semibold text-left"
                        >
                          {person.full_name || 'Unknown'}
                        </button>
                      </td>

                      {/* NATIONAL ID - OPENS DETAILS */}

                      <td className="px-4 py-3 text-sm font-mono">
                        <button
                          type="button"
                          onClick={() => openPersonDetails(person.id)}
                          className="text-blue-600 hover:underline"
                        >
                          {person.national_id || '-'}
                        </button>
                      </td>

                      <td className="px-4 py-3 text-sm">
                        {person.phone_number || '-'}
                      </td>

                      {/* VERIFICATION STATUS */}

                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${verificationStatus.className}`}
                        >
                          {verificationStatus.label}
                        </span>
                      </td>

                      {/* ACCOUNT STATUS */}

                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${accountStatus.className}`}
                        >
                          {accountStatus.label}
                        </span>
                      </td>

                      {/* ACTIONS */}

                      <td className="px-4 py-3">
                        <div className="flex justify-center items-center gap-2 flex-wrap">

                          {canVerifyOrReject && (
                            <>
                              <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={() => handleVerifyPerson(person)}
                                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                              >
                                {actionLoading === `${person.id}-verify`
                                  ? 'Verifying...'
                                  : 'Verify'}
                              </button>

                              <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={() => handleRejectPerson(person)}
                                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                              >
                                {actionLoading === `${person.id}-reject`
                                  ? 'Rejecting...'
                                  : 'Reject'}
                              </button>
                            </>
                          )}

                          {person.is_active !== false && (
                            <button
                              type="button"
                              disabled={isActionLoading}
                              onClick={() => handleDeactivatePerson(person)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200 disabled:opacity-50"
                            >
                              {actionLoading === `${person.id}-deactivate`
                                ? 'Deactivating...'
                                : 'Deactivate'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openEditModal(person)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeletePerson(person.id)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredPersons.length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500">
                No people found.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------
                ADD / EDIT PERSON MODAL
            -------------------------------------------------- */}

      {(showAddModal || editingPerson) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingPerson ? 'Edit Person' : 'Add New Person'}
              </h2>

              <button
                type="button"
                onClick={closeFormModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={
                editingPerson
                  ? handleEditPerson
                  : handleAddPerson
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label className="label-text">
                    Full Name *
                  </label>

                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        full_name: e.target.value,
                      })
                    }
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label-text">
                    National ID *
                  </label>

                  <input
                    type="text"
                    value={formData.national_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        national_id: e.target.value,
                      })
                    }
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label-text">
                    Phone Number *
                  </label>

                  <input
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phone_number: e.target.value,
                      })
                    }
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="label-text">
                    Company
                  </label>

                  <select
                    value={formData.company_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        company_id: e.target.value,
                      })
                    }
                    className="input-field"
                  >
                    <option value="">No Company</option>

                    {companies.map((company) => (
                      <option
                        key={company.id}
                        value={company.id}
                      >
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="label-text">
                    Address
                  </label>

                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: e.target.value,
                      })
                    }
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 btn-primary py-2 font-semibold"
                >
                  {editingPerson
                    ? 'Update Person'
                    : 'Add Person'}
                </button>

                <button
                  type="button"
                  onClick={closeFormModal}
                  className="flex-1 btn-secondary py-2 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------
                INDIVIDUAL PERSON DETAILS MODAL
            -------------------------------------------------- */}

      {showDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">

            {/* DETAILS HEADER */}

            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-5 flex justify-between items-center z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Person Details
                </h2>

                {selectedPerson && (
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedPerson.full_name || 'Person'}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={closeDetailsModal}
                className="text-gray-400 hover:text-gray-700"
              >
                <XCircleIcon className="w-7 h-7" />
              </button>
            </div>

            {/* DETAILS CONTENT */}

            <div className="p-6">

              {detailsLoading && (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
              )}

              {!detailsLoading && selectedPerson && (
                <>
                  {/* PERSON SUMMARY */}

                  <div className="bg-gray-50 rounded-xl p-5 mb-6">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">

                      <div>
                        <h3 className="text-xl font-bold text-gray-800">
                          {selectedPerson.full_name || 'Unknown'}
                        </h3>

                        <p className="text-sm text-gray-500 mt-1">
                          National ID: {selectedPerson.national_id || '-'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getVerificationStatus(selectedPerson).className}`}
                        >
                          {getVerificationStatus(selectedPerson).label}
                        </span>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getAccountStatus(selectedPerson).className}`}
                        >
                          {getAccountStatus(selectedPerson).label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PERSONAL INFORMATION */}

                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">
                      Personal Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      <DetailField
                        label="Full Name"
                        value={selectedPerson.full_name}
                      />

                      <DetailField
                        label="National ID"
                        value={selectedPerson.national_id}
                      />

                      <DetailField
                        label="Date of Birth"
                        value={selectedPerson.date_of_birth}
                      />

                      <DetailField
                        label="Gender"
                        value={selectedPerson.gender}
                      />

                      <DetailField
                        label="Address"
                        value={selectedPerson.address}
                      />

                      <DetailField
                        label="Phone Number"
                        value={selectedPerson.phone_number}
                      />

                      <DetailField
                        label="Email"
                        value={selectedPerson.email}
                      />
                    </div>
                  </div>

                  {/* COMPANY INFORMATION */}

                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">
                      Company Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      <DetailField
                        label="Company"
                        value={selectedPerson.company}
                      />

                      <DetailField
                        label="Company ID"
                        value={selectedPerson.company_id}
                      />
                    </div>
                  </div>

                  {/* VERIFICATION INFORMATION */}

                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">
                      Verification Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      <DetailField
                        label="Verified"
                        value={selectedPerson.is_verified}
                      />

                      <DetailField
                        label="Verification Status"
                        value={selectedPerson.verification_status}
                      />

                      <DetailField
                        label="Needs Manual Review"
                        value={selectedPerson.needs_manual_review}
                      />

                      <DetailField
                        label="Automatically Verified"
                        value={selectedPerson.is_auto_verified}
                      />

                      <DetailField
                        label="Verification Method"
                        value={selectedPerson.id_verification_method}
                      />

                      <DetailField
                        label="Verification Score"
                        value={selectedPerson.id_verification_score}
                      />
                    </div>
                  </div>

                  {/* ACCOUNT INFORMATION */}

                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">
                      Account Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      <DetailField
                        label="Active"
                        value={selectedPerson.is_active}
                      />

                      <DetailField
                        label="User Mode"
                        value={selectedPerson.user_mode}
                      />

                      <DetailField
                        label="User Status"
                        value={selectedPerson.user_status}
                      />

                      <DetailField
                        label="Created At"
                        value={selectedPerson.created_at}
                      />

                      <DetailField
                        label="Last Updated"
                        value={selectedPerson.updated_at}
                      />
                    </div>
                  </div>

                  {/* OTHER FIELDS RETURNED BY DETAIL SERIALIZER */}

                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">
                      Additional Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      {Object.entries(selectedPerson)
                        .filter(([key, value]) => {
                          const displayedFields = [
                            'id',
                            'full_name',
                            'national_id',
                            'date_of_birth',
                            'gender',
                            'address',
                            'phone_number',
                            'email',
                            'company',
                            'company_id',
                            'is_verified',
                            'verification_status',
                            'needs_manual_review',
                            'is_auto_verified',
                            'id_verification_method',
                            'id_verification_score',
                            'is_active',
                            'user_mode',
                            'user_status',
                            'created_at',
                            'updated_at',
                          ];

                          return (
                            !displayedFields.includes(key) &&
                            value !== null &&
                            value !== undefined &&
                            value !== ''
                          );
                        })
                        .map(([key, value]) => (
                          <DetailField
                            key={key}
                            label={key
                              .replace(/_/g, ' ')
                              .replace(/\b\w/g, (letter) => letter.toUpperCase())}
                            value={value}
                          />
                        ))}
                    </div>
                  </div>

                  {/* DETAILS FOOTER ACTIONS */}

                  <div className="flex justify-end gap-3 border-t pt-5 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        closeDetailsModal();
                        openEditModal(selectedPerson);
                      }}
                      className="btn-primary px-5 py-2"
                    >
                      Edit Person
                    </button>

                    <button
                      type="button"
                      onClick={closeDetailsModal}
                      className="btn-secondary px-5 py-2"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonManagement;
