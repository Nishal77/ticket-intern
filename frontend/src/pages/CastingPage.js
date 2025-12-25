import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const CastingPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [imageInputType, setImageInputType] = useState('url'); // 'url' or 'file'
  const [showRegistrations, setShowRegistrations] = useState(null); // ticket ID or null
  const [registrations, setRegistrations] = useState([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    date: '',
    image: null,
    imagePreview: null,
    images: []
  });
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const fetchTickets = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      // Get user ID - handle both id and _id (MongoDB returns _id, but login/register return id)
      const userId = user.id || user._id;
      if (!userId) {
        console.error('User ID not found in user object:', user);
        setLoading(false);
        return;
      }
      
      const userIdStr = String(userId);
      
      const response = await axios.get('http://localhost:5001/api/casting?status=all');
      
      // Filter tickets created by this user
      const myTickets = response.data
        .filter(ticket => {
          if (!ticket.createdBy) {
            return false;
          }
          
          // Handle populated createdBy (object with _id) from backend
          let creatorId = null;
          if (ticket.createdBy && typeof ticket.createdBy === 'object' && ticket.createdBy._id) {
            // Populated object: { _id: ObjectId(...), name: ..., email: ... }
            creatorId = String(ticket.createdBy._id);
          } else if (typeof ticket.createdBy === 'string') {
            // Just the ID string
            creatorId = ticket.createdBy;
          } else if (ticket.createdBy && ticket.createdBy.toString) {
            // ObjectId or similar
            creatorId = String(ticket.createdBy);
          } else {
            return false;
          }
          
          // Compare as strings
          return creatorId === userIdStr;
        })
        .map(ticket => ({
          ...ticket,
          // Ensure registeredUsers is populated or at least an array
          registeredUsers: ticket.registeredUsers || []
        }));
      
      setTickets(myTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      alert('Failed to fetch auditions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && (user.id || user._id)) {
      fetchTickets();
    } else if (!user) {
      setLoading(false);
    }
  }, [fetchTickets, user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Limit file size to 5MB to avoid payload issues
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB. Please use a URL instead or compress the image.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          image: reader.result, // Base64 string
          imagePreview: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrlChange = (e) => {
    const url = e.target.value;
    setFormData({
      ...formData,
      image: url || null,
      imagePreview: url || null
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare data for submission - convert single image to images array if needed
      const submitData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        location: formData.location,
        date: formData.date,
        images: formData.image ? [formData.image] : formData.images || []
      };
      
      await axios.post('http://localhost:5001/api/casting', submitData);
      alert('Audition created successfully! It will be pending admin approval.');
      setShowForm(false);
      setFormData({ title: '', description: '', category: '', location: '', date: '', image: null, imagePreview: null, images: [] });
      setImageInputType('url');
      fetchTickets();
    } catch (error) {
      console.error('Error creating audition:', error);
      alert(error.response?.data?.message || 'Failed to create audition');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this audition?')) {
      try {
        await axios.delete(`http://localhost:5001/api/casting/${id}`);
        fetchTickets();
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to delete ticket');
      }
    }
  };

  const handleViewRegistrations = async (ticketId) => {
    if (showRegistrations === ticketId) {
      // Close if already open
      setShowRegistrations(null);
      setRegistrations([]);
      return;
    }

    setShowRegistrations(ticketId);
    setLoadingRegistrations(true);
    try {
      const response = await axios.get(`http://localhost:5001/api/casting/${ticketId}/registrations`);
      // Backend returns array directly
      setRegistrations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to fetch registrations');
      setShowRegistrations(null);
      setRegistrations([]);
    } finally {
      setLoadingRegistrations(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="text-2xl font-bold text-blue-600">Casting Dashboard</div>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Home
              </button>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">My Auditions</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : 'Create New Audition'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Create New Audition</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  required
                  rows="3"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category *</label>
                  <select
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    <option value="cinema">Cinema</option>
                    <option value="serial">Serial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="datetime-local"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setImageInputType('url');
                      setFormData({ ...formData, image: null, imagePreview: null });
                    }}
                    className={`px-3 py-1 text-sm rounded-l ${
                      imageInputType === 'url' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    URL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImageInputType('file');
                      setFormData({ ...formData, image: null, imagePreview: null });
                    }}
                    className={`px-3 py-1 text-sm rounded-r ${
                      imageInputType === 'file' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    Upload
                  </button>
                </div>
                {imageInputType === 'url' ? (
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.image || ''}
                    onChange={handleImageUrlChange}
                  />
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    onChange={handleImageChange}
                  />
                )}
                {formData.imagePreview && (
                  <div className="mt-2">
                    <img
                      src={formData.imagePreview}
                      alt="Preview"
                      className="max-w-xs h-32 object-cover rounded"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        alert('Failed to load image. Please check the URL or try again.');
                      }}
                    />
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Create Ticket
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="text-xl text-gray-600">Loading...</div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-xl text-gray-600">No auditions created yet</div>
            <div className="text-sm text-gray-500 mt-2">Click "Create New Audition" to get started</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((ticket) => (
              <div key={ticket._id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                {/* Display first image from images array or single image */}
                {(ticket.images && ticket.images.length > 0) ? (
                  <img
                    src={ticket.images[0]}
                    alt={ticket.title}
                    className="w-full h-48 object-cover rounded mb-4"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : ticket.image ? (
                  <img
                    src={ticket.image}
                    alt={ticket.title}
                    className="w-full h-48 object-cover rounded mb-4"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : null}
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{ticket.title}</h2>
                <p className="text-gray-600 mb-4">{ticket.description}</p>
                <div className="space-y-2 mb-4">
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Category:</span> <span className="capitalize">{ticket.category}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Location:</span> {ticket.location}
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Date:</span> {new Date(ticket.date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">Registered:</span> {ticket.registeredUsers?.length || 0}
                    </div>
                    <div className="text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        ticket.status === 'approved' ? 'bg-green-100 text-green-800' :
                        ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewRegistrations(ticket._id)}
                    className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    View Registrations ({ticket.registeredUsers?.length || 0})
                  </button>
                </div>
                <div className="space-y-2">
                  {showRegistrations === ticket._id && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Registered Users ({registrations.length})
                      </h3>
                      {loadingRegistrations ? (
                        <div className="text-center py-4">
                          <div className="text-gray-600">Loading registrations...</div>
                        </div>
                      ) : registrations.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          No users registered yet
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {registrations.map((registeredUser, index) => (
                            <div
                              key={registeredUser._id || index}
                              className="bg-white p-4 rounded border border-gray-200"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex items-start gap-3">
                                  {(() => {
                                    // Get profile photo from nested user object or direct
                                    const profilePhoto = registeredUser.user?.profilePhoto || registeredUser.profilePhoto;
                                    const userName = registeredUser.user?.name || registeredUser.name || 'User';
                                    
                                    // Show profile photo if available, otherwise show initial
                                    if (profilePhoto && profilePhoto.trim() !== '' && profilePhoto !== 'null') {
                                      return (
                                        <img
                                          src={profilePhoto}
                                          alt={`${userName}'s profile`}
                                          className="w-16 h-16 rounded-full object-cover border-2 border-blue-300 shadow-md"
                                          onError={(e) => {
                                            // On error, replace with fallback avatar
                                            e.target.style.display = 'none';
                                            const fallback = e.target.nextElementSibling;
                                            if (fallback) {
                                              fallback.style.display = 'flex';
                                            }
                                          }}
                                        />
                                      );
                                    }
                                    return null;
                                  })()}
                                  <div 
                                    className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-2 border-gray-300 shadow-sm"
                                    style={{ 
                                      display: (registeredUser.user?.profilePhoto || registeredUser.profilePhoto) && 
                                               (registeredUser.user?.profilePhoto || registeredUser.profilePhoto).trim() !== '' &&
                                               (registeredUser.user?.profilePhoto || registeredUser.profilePhoto) !== 'null' 
                                        ? 'none' : 'flex' 
                                    }}
                                  >
                                    <span className="text-gray-600 text-lg font-semibold">
                                      {(registeredUser.user?.name || registeredUser.name)?.charAt(0)?.toUpperCase() || 'U'}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {registeredUser.user?.name || registeredUser.name} {registeredUser.user?.lastName || registeredUser.lastName || ''}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {registeredUser.user?.email || registeredUser.email}
                                    </div>
                                    {(registeredUser.user?.dob || registeredUser.dob) && (
                                      <div className="text-xs text-gray-400 mt-1">
                                        DOB: {new Date(registeredUser.user?.dob || registeredUser.dob).toLocaleDateString()}
                                      </div>
                                    )}
                                    <div className="text-sm text-gray-600 mt-1">
                                      <span className="font-medium">Phone:</span> {registeredUser.phoneNumber}
                                    </div>
                                    {registeredUser.registeredAt && (
                                      <div className="text-xs text-gray-400 mt-1">
                                        Registered: {new Date(registeredUser.registeredAt).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Display Photos and Videos */}
                              {((registeredUser.photos && registeredUser.photos.length > 0) || (registeredUser.videos && registeredUser.videos.length > 0)) && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  {/* Display Photos */}
                                  {(registeredUser.photos && registeredUser.photos.length > 0) && (
                                    <div className="mb-3">
                                      <div className="text-sm font-medium text-gray-700 mb-2">Uploaded Photos ({registeredUser.photos.length}):</div>
                                      <div className="grid grid-cols-3 gap-2">
                                        {registeredUser.photos.map((photo, photoIndex) => (
                                          <div key={photoIndex} className="relative">
                                            <img
                                              src={photo}
                                              alt={`Submission ${photoIndex + 1}`}
                                              className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80"
                                              onClick={() => window.open(photo, '_blank')}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Display Videos */}
                                  {(registeredUser.videos && registeredUser.videos.length > 0) && (
                                    <div>
                                      <div className="text-sm font-medium text-gray-700 mb-2">Uploaded Videos ({registeredUser.videos.length}):</div>
                                      <div className="space-y-3">
                                        {registeredUser.videos.map((video, videoIndex) => (
                                          <div key={videoIndex} className="border rounded overflow-hidden bg-black">
                                            <video
                                              src={video}
                                              controls
                                              preload="metadata"
                                              className="w-full h-64 object-contain"
                                              style={{ maxHeight: '400px' }}
                                            >
                                              Your browser does not support the video tag.
                                            </video>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(ticket._id)}
                  className="w-full mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CastingPage;

