import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const nextStep = (e) => {
        e.preventDefault();
        if (!formData.firstName || !formData.lastName || !formData.email) {
            setError('Please fill in all fields');
            return;
        }
        setError('');
        setStep(2);
    };

    const prevStep = () => {
        setStep(1);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            await signup({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password
            });
            navigate('/app/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to register');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-2 text-center text-slate-800 tracking-tight">Create Account</h2>
            <p className="text-slate-500 text-sm font-medium text-center mb-6">
                Step {step} of 2
            </p>
            
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mb-4 text-sm shadow-sm flex items-center">
                    <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </div>
            )}

            <form onSubmit={step === 1 ? nextStep : handleSubmit}>
                {step === 1 && (
                    <div className="animate-fade-in">
                        <div className="flex gap-4 mb-4">
                            <div className="form-group mb-0 w-1/2">
                                <label className="form-label">First Name</label>
                                <input 
                                    type="text" 
                                    name="firstName"
                                    className="form-input" 
                                    placeholder="John"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group mb-0 w-1/2">
                                <label className="form-label">Last Name</label>
                                <input 
                                    type="text" 
                                    name="lastName"
                                    className="form-input" 
                                    placeholder="Doe"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        
                        <div className="form-group mb-6">
                            <label className="form-label">Email</label>
                            <input 
                                type="email" 
                                name="email"
                                className="form-input" 
                                placeholder="john@example.com"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary btn-block py-3 text-base shadow-brand-500/30 shadow-lg">
                            Continue
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-fade-in">
                        <div className="form-group mb-4">
                            <label className="form-label">Password</label>
                            <input 
                                type="password" 
                                name="password"
                                className="form-input" 
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                        
                        <div className="form-group mb-6">
                            <label className="form-label">Confirm Password</label>
                            <input 
                                type="password" 
                                name="confirmPassword"
                                className="form-input" 
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="flex gap-4 pt-2">
                            <button type="button" onClick={prevStep} className="btn btn-outline w-1/3 py-3" disabled={loading}>
                                Back
                            </button>
                            <button type="submit" className="btn btn-primary flex-1 py-3 shadow-brand-500/30 shadow-lg" disabled={loading}>
                                {loading ? 'Creating...' : 'Create Account'}
                            </button>
                        </div>
                    </div>
                )}
            </form>

            <div className="mt-8 text-center text-sm text-slate-500 font-medium">
                Already have an account? <Link to="/login" className="text-brand-600 font-bold hover:text-brand-700 ml-1 transition-colors">Log in</Link>
            </div>
        </div>
    );
};

export default Signup;
