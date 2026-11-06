
import React, { useState, useEffect, useCallback } from 'react';
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
  ShieldExclamationIcon,
  ShieldCheckIcon,
  PhotographIcon,
  BanIcon,
  RefreshIcon,
} from '@heroicons/react/outline';

const PersonManagement = () => {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualReviewFilter, setManualReviewFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [companies, setCompanies] = useState([]);

  const [images, setImages] = useState([]);
  const [showImagesModal, setShowImagesModal] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);

  const [toast, setToast] = useState(null);

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
  // Toast notifications
  // --------------------------------------------------

  const showToast = (message, type = 'info') => {
    setToast({
      message,
      type,
      id: Date.now(),
    });
  };

  useEffect(() => {
    if (!toast) return;

    const timeout = setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => clearTimeout(timeout);
  }, [toast]);

  // --------------------------------------------------
  // Fetch persons and companies
  // --------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const params = {};

      if (manualReviewFilter !== '') {
        params.needs_manual_review = manualReviewFilter;
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
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
      showToast('Failed to load persons. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [manualReviewFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  // --------------------------------------------------
  // Add person
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

      showToast('Person added successfully.', 'success');

      setShowAddModal(false);
      resetForm();

      await fetchData();
    } catch (error) {
      console.error('Error adding person:', error);

      showToast(
        error.response?.data?.detail ||
        'Failed to add person. Please try again.',
        'error'
      );
    }
  };

  // --------------------------------------------------
  // Edit person
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

      showToast('Person updated successfully.', 'success');

      setEditingPerson(null);
      resetForm();

      await fetchData();
    } catch (error) {
      console.error('Error updating person:', error);

      showToast(
        error.response?.data?.detail ||
        'Failed to update person. Please try again.',
        'error'
      );
    }
  };

  // --------------------------------------------------
  // Delete person
  // --------------------------------------------------

  const handleDeletePerson = async (personId) => {
    if (!window.confirm('Are you sure you want to delete this person?')) {
      return;
    }

    try {
      await api.delete(`/persons/${personId}/`);

      showToast('Person deleted successfully.', 'success');

      await fetchData();
    } catch (error) {
      console.error('Error deleting person:', error);
      showToast('Failed to delete person.', 'error');
    }
  };

  // --------------------------------------------------
  // Verify person
  // --------------------------------------------------

  const handleVerifyPerson = async (personId) => {
    if (!window.confirm('Are you sure you want to verify this person?')) {
      return;
    }

    try {
      await api.post(`/persons/${personId}/verify/`);

      showToast('Person verified successfully.', 'success');

      await fetchData();
    } catch (error) {
      console.error('Error verifying person:', error);

      showToast(
        error.response?.data?.error ||
        'Failed to verify person.',
        'error'
      );
    }
  };

  // --------------------------------------------------
  // Unverify person
  // --------------------------------------------------

  const handleUnverifyPerson = async (personId) => {
    if (
      !window.confirm(
        'Are you sure you want to remove this person’s verification?'
      )
    ) {
      return;
    }

    try {
      await api.post(`/persons/${personId}/unverify/`);

      showToast('Person verification removed successfully.', 'success');

      await fetchData();
    } catch (error) {
      console.error('Error unverifying person:', error);

      showToast(
        error.response?.data?.error ||
        'Failed to remove verification.',
        'error'
      );
    }
  };

  // --------------------------------------------------
  // Reject person
  // --------------------------------------------------

  const handleRejectPerson = async (personId) => {
    if (!window.confirm('Are you sure you want to reject this person?')) {
      return;
    }

    try {
      await api.post(`/persons/${personId}/reject/`);

      showToast('Person rejected successfully.', 'success');

      await fetchData();
    } catch (error) {
      console.error('Error rejecting person:', error);

      showToast(
        error.response?.data?.error ||
        'Failed to reject person.',
        'error'
      );
    }
  };

  // --------------------------------------------------
  // Activate person
  // --------------------------------------------------

  const handleActivatePerson = async (personId) => {
    try {
      await api.post(`/persons/${personId}/activate/`);

      showToast('Person activated successfully.', 'success');

      await fetchData();
    } catch (error) {
      console.error('Error activating person:', error);
      showToast('Failed to activate person.', 'error');
    }
  };

  // --------------------------------------------------
  // Deactivate person
  // --------------------------------------------------

  const handleDeactivatePerson = async (personId) => {
    if (
      !window.confirm(
        'Are you sure you want to deactivate this person?'
      )
    ) {
      return;
    }

    try {
      await api.post(`/persons/${personId}/deactivate/`);

      showToast('Person deactivated successfully.', 'success');

      await fetchData();
    } catch (error) {
      console.error('Error deactivating person:', error);
      showToast('Failed to deactivate person.', 'error');
    }
  };

  // --------------------------------------------------
  // Block person
  // --------------------------------------------------

  const handleBlockPerson = async (personId) => {
    if (
      !window.confirm(
        'Are you sure you want to block this person?'
      )
    ) {
      return;
    }

    try {
      await api.post(`/persons/${personId}/block/`);

      showToast('Person blocked successfully.', 'success');

      await fetchData();
    } catch (error) {
      console.error('Error blocking person:', error);

      showToast(
        error.response?.data?.error ||
        'Failed to block person.',
        'error'
      );
    }
  };

  // --------------------------------------------------
  // View ID images
  // --------------------------------------------------

  const handleViewImages = async (personId) => {
    setImagesLoading(true);

    try {
      const response = await api.get(
        `/persons/${personId}/images/`
      );

      const personImages = response.data?.images || [];

      if (personImages.length === 0) {
        showToast(
          'No ID images are available for this person.',
          'info'
        );

        return;
      }

      setImages(personImages);
      setShowImagesModal(true);
    } catch (error) {
      console.error('Error retrieving ID images:', error);

      showToast(
        'Unable to retrieve ID images. Please try again.',
        'error'
      );
    } finally {
      setImagesLoading(false);
    }
  };

  // --------------------------------------------------
  // Form helpers
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
  // Render helpers
  // --------------------------------------------------

  const getVerificationStatus = (person) => {
    if (person.is_verified) {
      return {
        label: 'Verified',
        className: 'bg-green-100 text-green-800',
      };
    }

    if (person.verification_status === 'rejected') {
      return {
        label: 'Rejected',
        className: 'bg-red-100 text-red-800',
      };
    }

    if (person.needs_manual_review) {
      return {
        label: 'Manual Review',
        className: 'bg-orange-100 text-orange-800',
      };
    }

    if (person.verification_status === 'hold') {
      return {
        label: 'On Hold',
        className: 'bg-gray-100 text-gray-700',
      };
    }

    return {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800',
    };
  };

  const isPersonBlocked = (person) => {
    return (
      person.user_mode === 'suspension' ||
      person.user_status === 'hold'
    );
  };

  const isPersonActive = (person) => {
    return person.is_active !== false;
  };

  const filteredPersons = persons.filter((person) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();

    return (
      person.full_name?.toLowerCase().includes(query) ||
      person.national_id?.toLowerCase().includes(query) ||
      person.phone_number?.toLowerCase().includes(query)
    );
  });

  // --------------------------------------------------
  // Loading screen
  // --------------------------------------------------

  if (loading && persons.length === 0) {
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
  // Main UI
  // --------------------------------------------------

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />

      <div className="flex-1 ml-64 overflow-y-auto p-8">

        {/* Header */}

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              CREDISAFE
            </h1>

            <h2 className="text-xl font-semibold text-gray-700 mt-1">
              Person Management
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Manage individual profiles, verification and account status.
            </p>
          </div>

          <button
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

        {/* Search and filters */}

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <form
            onSubmit={handleSearch}
            className="flex flex-col lg:flex-row gap-4"
          >
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />

              <input
                type="text"
                placeholder="Search by name, national ID, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <select
              value={manualReviewFilter}
              onChange={(e) => setManualReviewFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Persons</option>
              <option value="true">
                Requires Manual Review
              </option>
              <option value="false">
                Does Not Require Manual Review
              </option>
            </select>

            <button
              type="submit"
              className="btn-primary px-6 py-2 flex items-center justify-center gap-2"
            >
              <SearchIcon className="w-4 h-4" />
              Search
            </button>

            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setManualReviewFilter('');
              }}
              className="px-5 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Clear
            </button>
          </form>
        </div>

        {/* Results summary */}

        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">
            Showing <strong>{filteredPersons.length}</strong> person(s)
          </p>

          <button
            onClick={fetchData}
            className="text-sm text-primary hover:text-blue-800 flex items-center gap-2"
          >
            <RefreshIcon className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Persons table */}

        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                  const verification = getVerificationStatus(person);
                  const blocked = isPersonBlocked(person);
                  const active = isPersonActive(person);

                  return (
                    <tr
                      key={person.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {person.full_name || 'Unknown'}
                        </div>

                        {person.needs_manual_review && (
                          <span className="text-xs text-orange-600 font-medium">
                            Requires manual review
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-sm font-mono">
                        {person.national_id || '-'}
                      </td>

                      <td className="px-4 py-3 text-sm">
                        {person.phone_number || '-'}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${verification.className}`}
                        >
                          {verification.label}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {blocked ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Blocked
                          </span>
                        ) : active ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-center items-center gap-3 flex-wrap">

                          {/* View ID images */}

                          <button
                            onClick={() => handleViewImages(person.id)}
                            disabled={imagesLoading}
                            className="text-purple-600 hover:text-purple-800 disabled:opacity-50"
                            title="View ID Images"
                          >
                            <PhotographIcon className="w-5 h-5" />
                          </button>

                          {/* Verify / Unverify */}

                          {person.is_verified ? (
                            <button
                              onClick={() => handleUnverifyPerson(person.id)}
                              className="text-orange-600 hover:text-orange-800"
                              title="Unverify"
                            >
                              <XCircleIcon className="w-5 h-5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleVerifyPerson(person.id)}
                              className="text-green-600 hover:text-green-800"
                              title="Verify"
                            >
                              <CheckCircleIcon className="w-5 h-5" />
                            </button>
                          )}

                          {/* Reject */}

                          {person.verification_status !== 'rejected' && (
                            <button
                              onClick={() => handleRejectPerson(person.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Reject"
                            >
                              <XCircleIcon className="w-5 h-5" />
                            </button>
                          )}

                          {/* Activate / Deactivate */}

                          {active ? (
                            <button
                              onClick={() => handleDeactivatePerson(person.id)}
                              className="text-orange-600 hover:text-orange-800 text-xs font-semibold"
                              title="Deactivate"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivatePerson(person.id)}
                              className="text-green-600 hover:text-green-800 text-xs font-semibold"
                              title="Activate"
                            >
                              Activate
                            </button>
                          )}

                          {/* Block */}

                          {!blocked && (
                            <button
                              onClick={() => handleBlockPerson(person.id)}
                              className="text-red-700 hover:text-red-900"
                              title="Block"
                            >
                              <BanIcon className="w-5 h-5" />
                            </button>
                          )}

                          {/* Edit */}

                          <button
                            onClick={() => openEditModal(person)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>

                          {/* Delete */}

                          <button
                            onClick={() => handleDeletePerson(person.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <TrashIcon className="w-5 h-5" />
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
            <div className="text-center py-12">
              <p className="text-gray-500 font-medium">
                No persons found
              </p>

              <p className="text-gray-400 text-sm mt-1">
                Try changing your search or filter criteria.
              </p>
            </div>
          )}
        </div>

        {/* Add / Edit modal */}

        {(showAddModal || editingPerson) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {editingPerson ? 'Edit Person' : 'Add New Person'}
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Enter the person's information below.
                  </p>
                </div>

                <button
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
                      <option value="">
                        No Company
                      </option>

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

        {/* ID Images modal */}

        {showImagesModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4"
            onClick={() => setShowImagesModal(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Identification Images
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    {images.length} image(s) available
                  </p>
                </div>

                <button
                  onClick={() => setShowImagesModal(false)}
                  className="text-gray-500 hover:text-gray-800"
                >
                  <XCircleIcon className="w-7 h-7" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {images.map((image, index) => (
                  <div
                    key={image.filename || index}
                    className="border border-gray-200 rounded-xl overflow-hidden"
                  >
                    <div className="bg-gray-50 flex items-center justify-center min-h-[250px]">
                      <img
                        src={image.url}
                        alt={`Identification ${index + 1}`}
                        className="w-full max-h-[450px] object-contain"
                      />
                    </div>

                    <div className="p-3 border-t">
                      <p className="text-sm text-gray-600 truncate">
                        {image.filename || `Image ${index + 1}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Toast notification */}

        {toast && (
          <div className="fixed top-6 right-6 z-[100] animate-fade-in">
            <div
              className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl border max-w-sm ${toast.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : toast.type === 'error'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-white border-gray-200 text-gray-700'
                }`}
            >
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${toast.type === 'success'
                    ? 'bg-green-500'
                    : toast.type === 'error'
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  }`}
              />

              <p className="text-sm font-medium flex-1">
                {toast.message}
              </p>

              <button
                onClick={() => setToast(null)}
                className="text-current opacity-60 hover:opacity-100 text-lg"
              >
                ×
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PersonManagement;
