import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';
import { useAuth } from '../../context/AuthContext';
import { X, MapPin, Target } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leafet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MapClickHandler = ({ setCoordinates }) => {
    useMapEvents({
        click(e) {
            setCoordinates({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
    });
    return null;
};

const CenterToLocation = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo([center.lat, center.lng], 16);
        }
    }, [center, map]);
    return null;
};

const CreateSessionModal = ({ onClose, onSessionCreated }) => {
    const { activeOrganization } = useOrganization();
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [instructors, setInstructors] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [mapCenter, setMapCenter] = useState({ lat: 6.9271, lng: 79.8612 }); // default Colombo
    
    const [formData, setFormData] = useState({
        courseId: '',
        instructorId: '',
        lectureType: 'Lecture',
        startTime: '',
        expiresAt: '',
        isGeofenceEnabled: false,
        geofenceCoordinates: { lat: 6.9271, lng: 79.8612 },
        geofenceRadius: 100
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [coursesRes, membersRes] = await Promise.all([
                    api.get(`/organizations/${activeOrganization._id}/courses`),
                    api.get(`/organizations/${activeOrganization._id}/members`)
                ]);
                setCourses(coursesRes.data);
                
                // Filter members for instructors (or admins/owners)
                const instructorMembers = membersRes.data.filter(m => 
                    ['INSTRUCTOR', 'ADMIN', 'OWNER'].includes(m.role)
                );
                setInstructors(instructorMembers);
                
                let defaultInstructorId = '';
                // Auto-select the currently logged-in user
                const myMember = instructorMembers.find(m => m.userId?._id === user?._id || m.userId === user?._id);
                if (myMember) {
                    defaultInstructorId = myMember._id;
                } else if (instructorMembers.length > 0) {
                    defaultInstructorId = instructorMembers[0]._id;
                }
                
                // Set defaults
                if (coursesRes.data.length > 0) {
                    setFormData(prev => ({ ...prev, courseId: coursesRes.data[0]._id }));
                }
                
                if (defaultInstructorId) {
                    setFormData(prev => ({ ...prev, instructorId: defaultInstructorId }));
                }

                // Default times (now, and +2 hours)
                const now = new Date();
                const nowLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0,16);
                
                // 2 hours = 120 minutes
                const expires = new Date(now.getTime() + 120 * 60000);
                const expiresLocal = new Date(expires.getTime() - expires.getTimezoneOffset() * 60000).toISOString().slice(0,16);
                
                setFormData(prev => ({
                    ...prev,
                    startTime: nowLocal,
                    expiresAt: expiresLocal
                }));
            } catch (err) {
                console.error("Failed to load form data", err);
                setError("Failed to load courses or instructors.");
            } finally {
                setLoadingData(false);
            }
        };
        fetchData();
    }, [activeOrganization, user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const start = new Date(formData.startTime);
        const expires = new Date(formData.expiresAt);
        
        if (expires <= start) {
            setError('Expiry time must be after the start time.');
            return;
        }
        
        setLoading(true);
        setError('');

        try {
            const res = await api.post(`/organizations/${activeOrganization._id}/sessions`, formData);
            onSessionCreated(res.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create session');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleRecalibrate = () => {
        navigator.geolocation.getCurrentPosition((position) => {
            const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
            setFormData(prev => ({ ...prev, geofenceCoordinates: loc }));
            setMapCenter(loc);
        });
    };

    const minDateTime = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16);

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-content max-w-lg">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition bg-slate-100 hover:bg-slate-200 p-1 rounded-full"
                    >
                        <X size={20} />
                    </button>
                    
                    <h2 className="text-xl font-bold mb-6 text-slate-800">Create Attendance Session</h2>
                    
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">
                            {error}
                        </div>
                    )}
                    
                    {loadingData ? (
                        <div className="py-8 text-center text-slate-500 font-medium">Loading details...</div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group mb-4">
                                <label className="form-label">Course</label>
                                <select 
                                    name="courseId" 
                                    className="form-input"
                                    value={formData.courseId}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="" disabled>Select a course...</option>
                                    {courses.map(c => (
                                        <option key={c._id} value={c._id}>{c.code} - {c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group mb-4">
                                <label className="form-label">Instructor (Read-Only)</label>
                                <select 
                                    name="instructorId" 
                                    className="form-input bg-slate-100 text-slate-500 cursor-not-allowed"
                                    value={formData.instructorId}
                                    onChange={handleChange}
                                    required
                                    disabled
                                >
                                    {instructors.map(i => (
                                        <option key={i._id} value={i._id}>{i.userId?.firstName} {i.userId?.lastName}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group mb-4">
                                <label className="form-label">Lecture Type</label>
                                <select 
                                    name="lectureType" 
                                    className="form-input"
                                    value={formData.lectureType}
                                    onChange={handleChange}
                                >
                                    <option value="Lecture">Lecture</option>
                                    <option value="Tutorial">Tutorial</option>
                                    <option value="Practical">Practical</option>
                                    <option value="Workshop">Workshop</option>
                                    <option value="Lab">Lab</option>
                                    <option value="Seminar">Seminar</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="flex gap-4 mb-6">
                                <div className="form-group mb-0 w-1/2">
                                    <label className="form-label">Start Time</label>
                                    <input 
                                        type="datetime-local" 
                                        name="startTime"
                                        className="form-input"
                                        value={formData.startTime}
                                        onChange={handleChange}
                                        min={minDateTime}
                                        required
                                    />
                                </div>
                                <div className="form-group mb-0 w-1/2">
                                    <label className="form-label">Expires At</label>
                                    <input 
                                        type="datetime-local" 
                                        name="expiresAt"
                                        className="form-input"
                                        value={formData.expiresAt}
                                        onChange={handleChange}
                                        min={formData.startTime || minDateTime}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Geolocation Section */}
                            <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                            <MapPin size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm">Enforce Location Geofence</h3>
                                            <p className="text-xs text-slate-500">Restrict check-ins to a GPS-defined radius</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={formData.isGeofenceEnabled} onChange={(e) => setFormData({...formData, isGeofenceEnabled: e.target.checked})} />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                                    </label>
                                </div>

                                {formData.isGeofenceEnabled && (
                                    <div className="mt-4 animate-fade-in">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-slate-600">Center geofence marker:</span>
                                            <button type="button" onClick={handleRecalibrate} className="text-xs btn btn-secondary py-1 px-3">
                                                My Location
                                            </button>
                                        </div>
                                        <div className="h-48 w-full rounded-lg overflow-hidden border border-slate-300 mb-4 z-0 relative">
                                            <MapContainer center={[formData.geofenceCoordinates.lat, formData.geofenceCoordinates.lng]} zoom={16} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                                                <TileLayer
                                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                />
                                                <Marker position={[formData.geofenceCoordinates.lat, formData.geofenceCoordinates.lng]} />
                                                <MapClickHandler setCoordinates={(loc) => setFormData(prev => ({...prev, geofenceCoordinates: loc}))} />
                                                <CenterToLocation center={mapCenter} />
                                            </MapContainer>
                                        </div>
                                        
                                        <div className="mt-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-semibold text-slate-700">Geofence Radius</span>
                                                <span className="text-sm font-bold text-slate-800">{formData.geofenceRadius} m</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="10" 
                                                max="1000" 
                                                step="10"
                                                value={formData.geofenceRadius}
                                                onChange={(e) => setFormData({...formData, geofenceRadius: parseInt(e.target.value)})}
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                                            />
                                            <div className="flex justify-between text-xs text-slate-400 mt-1">
                                                <span>10 m</span>
                                                <span>1000 m</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Creating...' : 'Create Session'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateSessionModal;
