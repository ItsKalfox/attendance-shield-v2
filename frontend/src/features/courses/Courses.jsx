import { Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useOrganization } from '../../context/OrganizationContext';
import { BookOpen, PlusCircle } from 'lucide-react';
import api from '../../services/api';
import CreateCourseModal from './CreateCourseModal';

const Courses = () => {
    const { activeOrganization } = useOrganization();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        const fetchCourses = async () => {
            if (!activeOrganization) return;
            try {
                setLoading(true);
                const res = await api.get(`/organizations/${activeOrganization._id}/courses`);
                setCourses(res.data);
            } catch (error) {
                console.error("Failed to fetch courses:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, [activeOrganization]);

    const handleCourseCreated = (newCourse) => {
        setCourses(prev => [...prev, newCourse]);
    };

    if (loading) {
        return <div className="p-4">Loading courses...</div>;
    }

    return (
        <>
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center">
                    <BookOpen className="mr-3 text-indigo-400" /> 
                    Courses
                </h1>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    <PlusCircle size={18} className="mr-2" />
                    Create Course
                </button>
            </div>

            {courses.length === 0 ? (
                <div className="card">
                    <div className="text-center py-12">
                        <p className="text-slate-400 mb-4">You haven't created any courses yet.</p>
                        <button className="btn btn-outline" onClick={() => setShowCreateModal(true)}>
                            Create First Course
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map(course => (
                        <Link to={`/app/courses/${course._id}`} key={course._id} className="card hover:border-indigo-500/50 block transition group">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-bold truncate group-hover:text-indigo-400 transition">{course.name}</h3>
                                <span className="badge badge-primary shrink-0">{course.code}</span>
                            </div>
                            <p className="text-sm text-slate-400 line-clamp-2 mb-4 h-10">
                                {course.description || "No description provided."}
                            </p>
                            <div className="text-sm text-slate-300">
                                Instructors: {course.instructors?.length || 0}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
        
        {showCreateModal && (
            <CreateCourseModal 
                onClose={() => setShowCreateModal(false)} 
                onCourseCreated={handleCourseCreated} 
            />
        )}
        </>
    );
};

export default Courses;
