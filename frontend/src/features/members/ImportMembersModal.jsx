import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';
import { X, Upload, CheckCircle, AlertTriangle, Trash2, Edit2, Check, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ImportMembersModal = ({ onClose, onMembersImported }) => {
    const { activeOrganization } = useOrganization();
    
    const [csvFile, setCsvFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState(1);
    
    const [editingRowId, setEditingRowId] = useState(null);
    const [editEmailValue, setEditEmailValue] = useState('');

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            setError('Please upload a valid CSV file.');
            return;
        }

        setCsvFile(file);
        setError('');
        processCSV(file);
    };

    const processCSV = (file) => {
        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            const rows = text.split('\n').filter(r => r.trim());
            const headers = rows[0].split(',').map(h => h.trim());
            
            if (!headers.includes('email') || !headers.includes('firstName')) {
                setError('CSV must contain at least "firstName" and "email" columns.');
                setLoading(false);
                return;
            }

            const allRows = [];
            for (let i = 1; i < rows.length; i++) {
                const values = rows[i].split(',').map(v => v.trim());
                let obj = { _id: i.toString() };
                headers.forEach((h, index) => {
                    obj[h] = values[index] || '';
                });
                
                if (obj.email && obj.firstName) {
                    allRows.push(obj);
                }
            }
            
            validateEmails(allRows);
        };
        reader.readAsText(file);
    };

    const validateEmails = async (rows) => {
        try {
            const emails = rows.map(r => r.email).filter(Boolean);
            const res = await api.post(`/organizations/${activeOrganization._id}/members/validate-emails`, { emails });
            const validationResults = res.data;
            
            const enrichedRows = rows.map(row => {
                const validation = validationResults.find(v => v.email === row.email);
                return {
                    ...row,
                    isValidEmail: validation ? validation.valid : false,
                    provider: validation ? validation.provider : null
                };
            });
            
            setParsedData(enrichedRows);
            setStep(2);
        } catch(err) {
            setError('Failed to validate emails against supported providers.');
        } finally {
            setLoading(false);
        }
    };

    const revalidateSingleEmail = async (rowId, newEmail) => {
        setLoading(true);
        try {
            const res = await api.post(`/organizations/${activeOrganization._id}/members/validate-emails`, { emails: [newEmail] });
            const validation = res.data[0];
            
            setParsedData(prev => prev.map(row => {
                if (row._id === rowId) {
                    return {
                        ...row,
                        email: newEmail,
                        isValidEmail: validation ? validation.valid : false,
                        provider: validation ? validation.provider : null
                    };
                }
                return row;
            }));
            setEditingRowId(null);
        } catch(err) {
            toast.error('Failed to validate email');
        } finally {
            setLoading(false);
        }
    };

    const removeRow = (rowId) => {
        setParsedData(prev => prev.filter(r => r._id !== rowId));
    };

    const handleImport = async () => {
        const hasInvalid = parsedData.some(r => !r.isValidEmail);
        if (hasInvalid) {
            toast.error("Please fix or remove invalid emails before importing.");
            return;
        }

        setImporting(true);
        setError('');
        
        try {
            const membersToImport = parsedData.map(r => ({
                firstName: r.firstName,
                lastName: r.lastName || '',
                email: r.email,
                studentId: r.studentId || ''
            }));

            const res = await api.post(`/organizations/${activeOrganization._id}/members/import`, {
                members: membersToImport
            });
            
            toast.success(`Successfully imported ${res.data.createdAccounts + res.data.existingAdded} members!`);
            onMembersImported();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to import members. The transaction was rolled back safely.');
            setImporting(false);
        }
    };

    const invalidCount = parsedData.filter(r => !r.isValidEmail).length;

    return createPortal(
        <div className="modal-overlay z-[100]">
            <div className="modal-container">
                <div className="modal-content max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden relative">
                    {/* Top loader if importing */}
                    {importing && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                            <Loader2 size={48} className="text-brand-500 animate-spin mb-4" />
                            <h3 className="text-xl font-bold text-slate-800">Importing Students...</h3>
                            <p className="text-slate-600 font-medium">Please wait. Creating accounts securely.</p>
                        </div>
                    )}
                    
                    <div className="p-6 sm:p-8 flex-1 overflow-y-auto min-h-0 flex flex-col relative">
                        <button 
                            onClick={onClose}
                            disabled={importing}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition bg-slate-100 hover:bg-slate-200 p-1 rounded-full disabled:opacity-50"
                        >
                            <X size={20} />
                        </button>
                        
                        <h2 className="text-xl font-bold mb-6 text-slate-800">Bulk Import Attendees</h2>
                        
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-start font-medium">
                                <AlertTriangle size={18} className="mr-2 shrink-0 mt-0.5" />
                                <div>{error}</div>
                            </div>
                        )}
                        
                        {step === 1 && (
                            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 hover:bg-slate-100/50 transition-colors">
                                {loading ? (
                                    <>
                                        <Loader2 size={48} className="text-brand-400 mb-4 animate-spin" />
                                        <h3 className="text-lg font-bold text-slate-700 mb-2">Validating Emails...</h3>
                                        <p className="text-slate-500 text-sm">Checking MX records for Google/Microsoft support.</p>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={48} className="text-brand-400 mb-4" />
                                        <h3 className="text-lg font-bold text-slate-700 mb-2">Upload CSV File</h3>
                                        <p className="text-slate-500 text-sm mb-8 text-center max-w-sm">
                                            File must contain headers: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-slate-700">firstName</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-slate-700">lastName</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-slate-700">email</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-slate-700">studentId</code>.
                                        </p>
                                        
                                        <label className="btn btn-primary cursor-pointer shadow-lg shadow-brand-500/20 px-8">
                                            Select File
                                            <input 
                                                type="file" 
                                                accept=".csv" 
                                                className="hidden" 
                                                onChange={handleFileChange}
                                            />
                                        </label>
                                    </>
                                )}
                            </div>
                        )}

                        {step === 2 && (
                            <div className="flex-1 flex flex-col min-h-0">
                                {invalidCount > 0 ? (
                                    <div className="mb-6 flex items-center justify-between bg-red-50 border border-red-200 p-4 rounded-xl">
                                        <h3 className="font-semibold text-red-700 flex items-center">
                                            <AlertTriangle size={18} className="mr-2" /> 
                                            Found {invalidCount} unsupported {invalidCount === 1 ? 'email' : 'emails'}
                                        </h3>
                                        <div className="text-sm font-medium text-red-600 bg-white px-3 py-1 rounded-full shadow-sm">
                                            Please edit or remove before continuing
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-6 flex items-center justify-between bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                                        <h3 className="font-semibold text-emerald-700 flex items-center">
                                            <CheckCircle size={18} className="mr-2" /> All {parsedData.length} records verified!
                                        </h3>
                                        <div className="text-sm font-medium text-emerald-600 bg-white px-3 py-1 rounded-full shadow-sm">
                                            Ready to import
                                        </div>
                                    </div>
                                )}
                                
                                <div className="table-container mb-8 flex-1 overflow-y-auto border border-slate-200 rounded-xl relative">
                                    <table className="table w-full text-sm">
                                        <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
                                            <tr>
                                                <th className="w-[20%]">First Name</th>
                                                <th className="w-[20%]">Last Name</th>
                                                <th className="w-[35%]">Email</th>
                                                <th className="w-[15%]">Status</th>
                                                <th className="w-[10%] text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedData.map((row) => (
                                                <tr key={row._id} className={!row.isValidEmail ? 'bg-red-50/50' : ''}>
                                                    <td className="font-medium text-slate-800">{row.firstName}</td>
                                                    <td className="text-slate-600">{row.lastName}</td>
                                                    <td>
                                                        {editingRowId === row._id ? (
                                                            <div className="flex items-center gap-2">
                                                                <input 
                                                                    type="email" 
                                                                    value={editEmailValue}
                                                                    onChange={(e) => setEditEmailValue(e.target.value)}
                                                                    className="form-input py-1 px-2 text-sm max-w-[200px]"
                                                                    autoFocus
                                                                />
                                                                <button 
                                                                    onClick={() => revalidateSingleEmail(row._id, editEmailValue)}
                                                                    className="text-emerald-600 hover:text-emerald-700 p-1"
                                                                >
                                                                    <Check size={16} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => setEditingRowId(null)}
                                                                    className="text-slate-400 hover:text-slate-600 p-1"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className={!row.isValidEmail ? 'text-red-600 font-medium' : 'text-slate-700'}>
                                                                {row.email}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {row.isValidEmail ? (
                                                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md">
                                                                <CheckCircle size={12} /> {row.provider || 'Valid'}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-red-100 text-red-700 rounded-md">
                                                                <XCircle size={12} /> Invalid/Unsupported
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {editingRowId !== row._id && (
                                                                <>
                                                                    <button 
                                                                        onClick={() => {
                                                                            setEditingRowId(row._id);
                                                                            setEditEmailValue(row.email);
                                                                        }}
                                                                        className="text-slate-400 hover:text-brand-600 transition p-1"
                                                                        title="Edit Email"
                                                                    >
                                                                        <Edit2 size={16} />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => removeRow(row._id)}
                                                                        className="text-slate-400 hover:text-red-600 transition p-1"
                                                                        title="Remove Row"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {parsedData.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-8 text-slate-500">
                                                        No valid rows found. Please check your CSV.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex justify-between items-center pt-5 border-t border-slate-100 mt-auto shrink-0">
                                    <button className="btn btn-secondary" onClick={() => setStep(1)}>
                                        Cancel
                                    </button>
                                    <button 
                                        className="btn btn-primary px-8 shadow-lg shadow-brand-500/20" 
                                        onClick={handleImport} 
                                        disabled={invalidCount > 0 || parsedData.length === 0}
                                    >
                                        Confirm & Import {parsedData.length} Records
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ImportMembersModal;
