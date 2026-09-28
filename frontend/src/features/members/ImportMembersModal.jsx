import React, { useState } from 'react';
import api from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';
import { X, Upload, CheckCircle, AlertTriangle } from 'lucide-react';

const ImportMembersModal = ({ onClose, onMembersImported }) => {
    const { activeOrganization } = useOrganization();
    
    const [csvFile, setCsvFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [step, setStep] = useState(1);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            setError('Please upload a valid CSV file.');
            return;
        }

        setCsvFile(file);
        setError('');
        
        // Parse basic preview (just first few rows to show to user)
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const rows = text.split('\n').filter(r => r.trim());
            const headers = rows[0].split(',').map(h => h.trim());
            
            // Expected: firstName, lastName, email, role, studentId
            if (!headers.includes('email') || !headers.includes('firstName')) {
                setError('CSV must contain at least "firstName" and "email" columns.');
                return;
            }

            const preview = [];
            for (let i = 1; i < Math.min(rows.length, 6); i++) {
                const values = rows[i].split(',').map(v => v.trim());
                let obj = {};
                headers.forEach((h, index) => {
                    obj[h] = values[index];
                });
                preview.push(obj);
            }
            
            setPreviewData(preview);
            setStep(2);
        };
        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (!csvFile) return;

        setLoading(true);
        setError('');
        
        // Use FormData to send file
        const formData = new FormData();
        formData.append('file', csvFile);

        try {
            // Note: The backend route expects this payload format, we need to ensure multer is used 
            // OR we can just parse the CSV fully in the frontend and send a JSON array.
            // Wait, the backend in `memberController.js` expects:
            // req.body.members as an array of objects.
            
            // Let's parse all rows and send as JSON since we didn't add Multer to the backend.
            const reader = new FileReader();
            reader.onload = async (e) => {
                const text = e.target.result;
                const rows = text.split('\n').filter(r => r.trim());
                const headers = rows[0].split(',').map(h => h.trim());
                
                const membersToImport = [];
                for (let i = 1; i < rows.length; i++) {
                    const values = rows[i].split(',');
                    let obj = {};
                    headers.forEach((h, index) => {
                        obj[h.trim()] = values[index]?.trim();
                    });
                    
                    if (obj.email && obj.firstName) {
                        membersToImport.push(obj);
                    }
                }

                try {
                    const res = await api.post(`/organizations/${activeOrganization._id}/members/import`, {
                        members: membersToImport
                    });
                    
                    setSuccessMsg(`Successfully imported members. Allowed: ${res.data.results.filter(r => r.status === 'success').length}, Failed: ${res.data.results.filter(r => r.status === 'failed').length}`);
                    setStep(3);
                } catch (err) {
                    setError(err.response?.data?.message || 'Failed to import members');
                    setLoading(false);
                }
            };
            reader.readAsText(csvFile);

        } catch (err) {
            setError('File processing error');
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-content max-w-2xl max-h-[90vh] flex flex-col p-0">
                    <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
                        <button 
                            onClick={onClose}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition bg-slate-100 hover:bg-slate-200 p-1 rounded-full"
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
                                <Upload size={48} className="text-brand-400 mb-4" />
                                <h3 className="text-lg font-bold text-slate-700 mb-2">Upload CSV File</h3>
                                <p className="text-slate-500 text-sm mb-8 text-center max-w-sm">
                                    File must contain headers: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-slate-700">firstName</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-slate-700">lastName</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-slate-700">email</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-slate-700">studentId</code> (for Attendee ID).
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
                            </div>
                        )}

                        {step === 2 && (
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="mb-6 flex items-center justify-between bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                                    <h3 className="font-semibold text-emerald-700 flex items-center">
                                        <CheckCircle size={18} className="mr-2" /> File parsed successfully
                                    </h3>
                                    <div className="text-sm font-medium text-emerald-600 bg-white px-3 py-1 rounded-full shadow-sm">
                                        Showing preview of first {previewData.length} rows
                                    </div>
                                </div>
                                
                                <div className="table-container mb-8 flex-1 overflow-y-auto">
                                    <table className="table w-full text-sm">
                                        <thead>
                                            <tr>
                                                {Object.keys(previewData[0] || {}).map((key, i) => (
                                                    <th key={i}>{key}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.map((row, i) => (
                                                <tr key={i}>
                                                    {Object.values(row).map((val, j) => (
                                                        <td key={j} className="truncate max-w-xs">{val}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex justify-between items-center pt-5 border-t border-slate-100 mt-auto">
                                    <button className="btn btn-secondary" onClick={() => setStep(1)} disabled={loading}>
                                        Choose Different File
                                    </button>
                                    <button className="btn btn-primary px-8" onClick={handleImport} disabled={loading}>
                                        {loading ? 'Importing...' : 'Start Import'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="text-center p-10 py-16">
                                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-emerald-200">
                                    <CheckCircle size={48} className="text-emerald-500" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3 text-slate-800">Import Complete</h3>
                                <p className="text-slate-500 mb-10 font-medium text-lg">{successMsg}</p>
                                
                                <button 
                                    className="btn btn-primary px-8"
                                    onClick={() => {
                                        onMembersImported();
                                        onClose();
                                    }}
                                >
                                    Return to Attendees
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportMembersModal;
