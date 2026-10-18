import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';
import { useAuth } from '../../context/AuthContext';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { X, Target, Navigation, ChevronDown, Search } from 'lucide-react';
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
    const [isUserModified, setIsUserModified] = useState(false);
    
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
    const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
    const [courseSearch, setCourseSearch] = useState('');
    const [isLectureTypeDropdownOpen, setIsLectureTypeDropdownOpen] = useState(false);

    const { isShaking, handleBackdropClick } = useModalDismiss({
        onClose,
        isDirty: isUserModified
    });

    const isOwnerOrAdmin = activeOrganization?.userRole === 'OWNER' || activeOrganization?.userRole === 'ADMIN';
    const isInstructor = activeOrganization?.userRole === 'INSTRUCTOR';

    const isCourseAssignedToMe = (course) => {
        if (!course) return false;
        const instId = course.instructor?._id || course.instructor;
        const instUserId = course.instructor?.userId?._id || course.instructor?.userId;
        const myMemberId = activeOrganization?.memberId;
        const myUserId = user?._id;

        if (myMemberId && instId && instId.toString() === myMemberId.toString()) return true;
        if (myUserId && instUserId && instUserId.toString() === myUserId.toString()) return true;
        if (course.instructors && Array.isArray(course.instructors)) {
            return course.instructors.some(i => {
                const iId = i._id || i;
                const iUserId = i.userId?._id || i.userId;
                return (myMemberId && iId && iId.toString() === myMemberId.toString()) ||
                       (myUserId && iUserId && iUserId.toString() === myUserId.toString());
            });
        }
        return false;
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [coursesRes, membersRes] = await Promise.all([
                    api.get(`/organizations/${activeOrganization._id}/courses`),
                    api.get(`/organizations/${activeOrganization._id}/members`)
                ]);
                const loadedCourses = coursesRes.data || [];
                
                // Filter members for instructors (or admins/owners)
                const instructorMembers = membersRes.data.filter(m => 
                    ['INSTRUCTOR', 'ADMIN', 'OWNER'].includes(m.role)
                );
                setInstructors(instructorMembers);
                
                const myMember = instructorMembers.find(m => m.userId?._id === user?._id || m.userId === user?._id);

                let availableCourses = [];
                if (isInstructor) {
                    // Instructors can ONLY create sessions for their assigned courses
                    availableCourses = loadedCourses.filter(isCourseAssignedToMe);
                } else {
                    // Owners & Admins see all courses, with courses assigned to them sorted to top
                    const myAssigned = loadedCourses.filter(isCourseAssignedToMe);
                    const others = loadedCourses.filter(c => !isCourseAssignedToMe(c));
                    availableCourses = [...myAssigned, ...others];
                }

                setCourses(availableCourses);

                // Set course and instructor defaults
                if (availableCourses.length > 0) {
                    const firstCourse = availableCourses[0];
                    const courseInstructorId = firstCourse.instructor?._id || firstCourse.instructor || (firstCourse.instructors && firstCourse.instructors[0]?._id) || myMember?._id || '';
                    setFormData(prev => ({
                        ...prev,
                        courseId: firstCourse._id,
                        instructorId: courseInstructorId
                    }));
                } else if (myMember) {
                    setFormData(prev => ({ ...prev, instructorId: myMember._id }));
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
                setError("Failed to connect to the server to load session details.");
            } finally {
                setLoadingData(false);
            }
        };
        fetchData();
    }, [activeOrganization, user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // 15-minute buffer for form completion and recent lecture starts
        const minAllowedStart = new Date(Date.now() - 15 * 60000);
        const start = new Date(formData.startTime);
        const expires = new Date(formData.expiresAt);
        
        if (isNaN(start.getTime())) {
            setError('Please enter a valid session start time.');
            return;
        }

        if (start < minAllowedStart) {
            setError('Session start time cannot be more than 15 minutes in the past.');
            return;
        }

        if (isNaN(expires.getTime()) || expires <= start) {
            setError('Session expiry time must be after the start time.');
            return;
        }
        
        setLoading(true);
        setError('');

        try {
            const payload = {
                ...formData,
                startTime: start.toISOString(),
                expiresAt: expires.toISOString(),
                timezoneOffset: new Date().getTimezoneOffset()
            };
            const res = await api.post(`/organizations/${activeOrganization._id}/sessions`, payload);
            onSessionCreated(res.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create session');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setIsUserModified(true);
        const { name, value } = e.target;

        if (name === 'startTime' && value) {
            const newStart = new Date(value);
            const currentExpires = new Date(formData.expiresAt);

            // Auto-advance expiresAt if it's unset or would be before/equal to the new start time
            if (!formData.expiresAt || currentExpires <= newStart) {
                const autoExpires = new Date(newStart.getTime() + 120 * 60000);
                const autoExpiresLocal = new Date(autoExpires.getTime() - autoExpires.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                setFormData(prev => ({
                    ...prev,
                    startTime: value,
                    expiresAt: autoExpiresLocal
                }));
                setError('');
                return;
            }
        }

        if (name === 'expiresAt' && formData.startTime && value) {
            if (new Date(value) <= new Date(formData.startTime)) {
                setError('Expiry time must be after the start time.');
            } else {
                setError('');
            }
        }

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCourseChange = (e) => {
        setIsUserModified(true);
        const selectedId = e.target.value;
        const selectedCourse = courses.find(c => c._id === selectedId);
        const courseInstructorId = selectedCourse?.instructor?._id || selectedCourse?.instructor || (selectedCourse?.instructors && selectedCourse?.instructors[0]?._id) || formData.instructorId;

        setFormData(prev => ({
            ...prev,
            courseId: selectedId,
            instructorId: courseInstructorId
        }));
    };

    // Find instructor object for display
    const selectedCourseObj = courses.find(c => c._id === formData.courseId);
    const assignedInstructorObj = selectedCourseObj?.instructor || (selectedCourseObj?.instructors && selectedCourseObj?.instructors[0]) || instructors.find(i => i._id === formData.instructorId);
    const isSelectedCourseAssignedToMe = isCourseAssignedToMe(selectedCourseObj);

    const instructorDisplayName = (() => {
        if (isSelectedCourseAssignedToMe) {
            return `${user?.firstName || ''} ${user?.lastName || ''} (You)`.trim();
        }
        if (assignedInstructorObj?.userId && typeof assignedInstructorObj.userId === 'object') {
            return `${assignedInstructorObj.userId.firstName || ''} ${assignedInstructorObj.userId.lastName || ''} (${assignedInstructorObj.userId.email || ''})`.trim();
        }
        if (user) {
            return `${user.firstName || ''} ${user.lastName || ''} (${user.email || ''})`.trim();
        }
        return 'Assigned Lecturer';
    })();

    const handleRecalibrate = () => {
        setIsUserModified(true);
        navigator.geolocation.getCurrentPosition((position) => {
            const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
            setFormData(prev => ({ ...prev, geofenceCoordinates: loc }));
            setMapCenter(loc);
        });
    };

    const handleGeofenceToggle = (e) => {
        setIsUserModified(true);
        const isEnabled = e.target.checked;
        setFormData(prev => ({ ...prev, isGeofenceEnabled: isEnabled }));
        
        if (isEnabled) {
            navigator.geolocation.getCurrentPosition((position) => {
                const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
                setFormData(prev => ({ ...prev, geofenceCoordinates: loc }));
                setMapCenter(loc);
            }, (err) => {
                console.warn("Could not auto-fetch location", err);
            });
        }
    };

    const fifteenMinsAgo = new Date(Date.now() - 15 * 60000);
    const minDateTime = new Date(fifteenMinsAgo.getTime() - fifteenMinsAgo.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    const assignedCoursesToMe = courses.filter(isCourseAssignedToMe);
    const otherOrganizationCourses = courses.filter(c => !isCourseAssignedToMe(c));

    const filterCourseSearch = (c) => {
        const s = courseSearch.toLowerCase();
        return c.code.toLowerCase().includes(s) || c.name.toLowerCase().includes(s) || (c.batch && c.batch.toLowerCase().includes(s));
    };
    const filteredAssignedCourses = assignedCoursesToMe.filter(filterCourseSearch);
    const filteredOtherCourses = otherOrganizationCourses.filter(filterCourseSearch);
    const filteredAllCourses = courses.filter(filterCourseSearch);

    return createPortal(
        <div onClick={handleBackdropClick} className="modal-overlay z-[100] cursor-default">
            <div onClick={handleBackdropClick} className="modal-container">
                <div className={`modal-content max-w-lg ${isShaking ? 'animate-modal-shake' : ''}`}>
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
                        <div className="space-y-4 animate-fade-in">
                            {/* Course Input Skeleton */}
                            <div className="space-y-1.5">
                                <div className="skeleton w-16 h-4 rounded"></div>
                                <div className="skeleton w-full h-10 rounded-lg"></div>
                            </div>

                            {/* Assigned Lecturer Skeleton */}
                            <div className="space-y-1.5">
                                <div className="skeleton w-32 h-4 rounded"></div>
                                <div className="skeleton w-full h-10 rounded-lg"></div>
                            </div>

                            {/* Lecture Type Skeleton */}
                            <div className="space-y-1.5">
                                <div className="skeleton w-24 h-4 rounded"></div>
                                <div className="skeleton w-full h-10 rounded-lg"></div>
                            </div>

                            {/* Start Time & Expires At Skeleton */}
                            <div className="flex gap-4 min-w-0">
                                <div className="w-1/2 min-w-0 space-y-1.5">
                                    <div className="skeleton w-20 h-4 rounded"></div>
                                    <div className="skeleton w-full h-10 rounded-lg"></div>
                                </div>
                                <div className="w-1/2 min-w-0 space-y-1.5">
                                    <div className="skeleton w-20 h-4 rounded"></div>
                                    <div className="skeleton w-full h-10 rounded-lg"></div>
                                </div>
                            </div>

                            {/* Geofence Toggle Box Skeleton */}
                            <div className="skeleton w-full h-14 rounded-xl"></div>

                            {/* Action Buttons Skeleton */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <div className="skeleton w-20 h-10 rounded-lg"></div>
                                <div className="skeleton w-32 h-10 rounded-lg"></div>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group mb-4">
                                <label className="form-label">Course *</label>
                                {courses.length === 0 ? (
                                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex flex-col gap-1">
                                        <span className="font-bold">
                                            {isInstructor ? "No assigned courses found." : "No courses found in this organization."}
                                        </span>
                                        <span className="text-amber-700">
                                            {isInstructor 
                                                ? "You can only create sessions for courses assigned to you. Please ask an owner or administrator to assign you as the lecturer for a course."
                                                : "Create a course first before launching attendance sessions."
                                            }
                                        </span>
                                        {isOwnerOrAdmin && (
                                            <Link to="/app/courses" onClick={onClose} className="font-bold underline text-amber-900 mt-1">
                                                Create a Course First →
                                            </Link>
                                        )}
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div 
                                            className="form-input font-medium py-2.5 cursor-pointer flex justify-between items-center bg-white"
                                            onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
                                        >
                                            <span className={`truncate ${formData.courseId ? 'text-slate-800' : 'text-slate-400'}`}>
                                                {selectedCourseObj 
                                                    ? `${selectedCourseObj.code} - ${selectedCourseObj.name} ${selectedCourseObj.batch ? `(${selectedCourseObj.batch})` : ''}`
                                                    : 'Select a course...'
                                                }
                                            </span>
                                            <ChevronDown size={16} className={`text-slate-400 shrink-0 ml-2 transition-transform ${isCourseDropdownOpen ? 'rotate-180' : ''}`} />
                                        </div>

                                        {isCourseDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setIsCourseDropdownOpen(false)}></div>
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 overflow-hidden">
                                                    <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
                                                        <div className="relative">
                                                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                            <input 
                                                                type="text" 
                                                                placeholder="Search courses by code, name, or batch..." 
                                                                className="w-full text-sm py-1.5 pl-8 pr-3 border border-slate-200 rounded outline-none focus:border-brand-500 bg-white"
                                                                value={courseSearch}
                                                                onChange={(e) => setCourseSearch(e.target.value)}
                                                                autoFocus
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="max-h-[260px] overflow-y-auto custom-scrollbar p-1">
                                                        {isOwnerOrAdmin && assignedCoursesToMe.length > 0 && otherOrganizationCourses.length > 0 ? (
                                                            <>
                                                                {filteredAssignedCourses.length > 0 && (
                                                                    <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Assigned to You</div>
                                                                )}
                                                                {filteredAssignedCourses.map(c => (
                                                                    <div 
                                                                        key={c._id}
                                                                        className={`px-3 py-2 text-sm cursor-pointer rounded-md hover:bg-brand-50 mb-0.5 ${formData.courseId === c._id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700'}`}
                                                                        onClick={() => { handleCourseChange({ target: { value: c._id } }); setIsCourseDropdownOpen(false); setCourseSearch(''); }}
                                                                    >
                                                                        {c.code} - {c.name} {c.batch ? `(${c.batch})` : ''}
                                                                    </div>
                                                                ))}
                                                                
                                                                {filteredOtherCourses.length > 0 && (
                                                                    <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mt-2 border-t border-slate-100 pt-2">Other Organization Courses</div>
                                                                )}
                                                                {filteredOtherCourses.map(c => (
                                                                    <div 
                                                                        key={c._id}
                                                                        className={`px-3 py-2 text-sm cursor-pointer rounded-md hover:bg-brand-50 mb-0.5 ${formData.courseId === c._id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700'}`}
                                                                        onClick={() => { handleCourseChange({ target: { value: c._id } }); setIsCourseDropdownOpen(false); setCourseSearch(''); }}
                                                                    >
                                                                        {c.code} - {c.name} {c.batch ? `(${c.batch})` : ''}
                                                                    </div>
                                                                ))}
                                                                {filteredAssignedCourses.length === 0 && filteredOtherCourses.length === 0 && (
                                                                    <div className="px-3 py-4 text-sm text-center text-slate-400">No courses found</div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
                                                                {filteredAllCourses.map(c => {
                                                                    const isAssigned = isCourseAssignedToMe(c);
                                                                    return (
                                                                        <div 
                                                                            key={c._id}
                                                                            className={`px-3 py-2 text-sm cursor-pointer rounded-md hover:bg-brand-50 mb-0.5 flex justify-between items-center ${formData.courseId === c._id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700'}`}
                                                                            onClick={() => { handleCourseChange({ target: { value: c._id } }); setIsCourseDropdownOpen(false); setCourseSearch(''); }}
                                                                        >
                                                                            <span className="truncate pr-2">{c.code} - {c.name} {c.batch ? `(${c.batch})` : ''}</span>
                                                                            {isOwnerOrAdmin && isAssigned && (
                                                                                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 shrink-0">Assigned</span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                                {filteredAllCourses.length === 0 && (
                                                                    <div className="px-3 py-4 text-sm text-center text-slate-400">No courses found</div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="form-group mb-4">
                                <label className="form-label">Assigned Lecturer</label>
                                <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium flex items-center justify-between">
                                    <span className="font-semibold text-slate-800">{instructorDisplayName}</span>
                                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border shadow-2xs ${
                                        isSelectedCourseAssignedToMe 
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                            : 'bg-white text-slate-500 border-slate-200'
                                    }`}>
                                        {isSelectedCourseAssignedToMe ? 'Assigned to You' : 'Course Lecturer'}
                                    </span>
                                </div>
                            </div>

                            <div className="form-group mb-4">
                                <label className="form-label">Lecture Type</label>
                                <div className="relative">
                                    <div 
                                        className="form-input py-2.5 cursor-pointer flex justify-between items-center bg-white"
                                        onClick={() => setIsLectureTypeDropdownOpen(!isLectureTypeDropdownOpen)}
                                    >
                                        <span className="text-slate-800 font-medium">{formData.lectureType}</span>
                                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isLectureTypeDropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>
                                    {isLectureTypeDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsLectureTypeDropdownOpen(false)}></div>
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 overflow-hidden py-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                                                {['Lecture', 'Tutorial', 'Practical', 'Workshop', 'Lab', 'Field Visit', 'Field Work', 'Presentation'].map(type => (
                                                    <div 
                                                        key={type}
                                                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-brand-50 flex items-center ${formData.lectureType === type ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-700'}`}
                                                        onClick={() => {
                                                            handleChange({ target: { name: 'lectureType', value: type } });
                                                            setIsLectureTypeDropdownOpen(false);
                                                        }}
                                                    >
                                                        {type}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 min-w-0">
                                <div className="form-group mb-0 min-w-0">
                                    <label className="form-label">Start Time</label>
                                    <input 
                                        type="datetime-local" 
                                        name="startTime"
                                        className="form-input font-medium text-slate-700 w-full min-w-0 max-w-full block"
                                        value={formData.startTime}
                                        onChange={handleChange}
                                        min={minDateTime}
                                        required
                                    />
                                </div>
                                <div className="form-group mb-0 min-w-0">
                                    <label className="form-label">Expires At</label>
                                    <input 
                                        type="datetime-local" 
                                        name="expiresAt"
                                        className="form-input font-medium text-slate-700 w-full min-w-0 max-w-full block"
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
                                        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-100">
                                            <Navigation size={18} className="text-brand-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm">Enforce Location Geofence</h3>
                                            <p className="text-xs text-slate-500">Restrict check-ins to a GPS-defined radius</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={formData.isGeofenceEnabled} onChange={handleGeofenceToggle} />
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
                                        
                                        <div className="mt-4 p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                                            <div className="flex justify-between items-center mb-2.5">
                                                <div className="flex items-center gap-1.5">
                                                    <Target size={15} className="text-slate-600" />
                                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Geofence Radius</span>
                                                </div>
                                                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                                                    {formData.geofenceRadius} meters
                                                </span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="10" 
                                                max="1000" 
                                                step="10"
                                                value={formData.geofenceRadius}
                                                onChange={(e) => {
                                                    setIsUserModified(true);
                                                    setFormData({...formData, geofenceRadius: parseInt(e.target.value)});
                                                }}
                                                className="slider-range"
                                                style={{
                                                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${((formData.geofenceRadius - 10) / (1000 - 10)) * 100}%, #e2e8f0 ${((formData.geofenceRadius - 10) / (1000 - 10)) * 100}%, #e2e8f0 100%)`
                                                }}
                                            />
                                            <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2">
                                                <span>10 m</span>
                                                <div className="flex gap-1.5">
                                                    {[50, 100, 250, 500].map(radius => (
                                                        <button
                                                            key={radius}
                                                            type="button"
                                                            onClick={() => {
                                                                setIsUserModified(true);
                                                                setFormData({...formData, geofenceRadius: radius});
                                                            }}
                                                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                                                                formData.geofenceRadius === radius 
                                                                    ? 'bg-slate-800 text-white shadow-2xs' 
                                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                            }`}
                                                        >
                                                            {radius}m
                                                        </button>
                                                    ))}
                                                </div>
                                                <span>1000 m</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100">
                                <button type="button" className="btn btn-outline w-full sm:w-auto" onClick={onClose} disabled={loading}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={loading}>
                                    {loading ? 'Creating...' : 'Create Session'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CreateSessionModal;
