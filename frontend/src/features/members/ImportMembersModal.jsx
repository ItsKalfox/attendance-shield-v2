import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { X, Upload, CheckCircle, AlertTriangle, Trash2, Edit2, Check, XCircle, Loader2, Download } from 'lucide-react';
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
    const [editFormData, setEditFormData] = useState({ studentId: '', name: '', email: '' });

    const isDirty = Boolean(csvFile || parsedData.length > 0 || importing);

    const { isShaking, handleBackdropClick } = useModalDismiss({
        onClose: importing ? () => {} : onClose,
        isDirty
    });

    const downloadSampleCSV = () => {
        const sampleContent = 'studentId,name,email\r\nSTU1001,John Doe,john.doe@university.edu\r\nSTU1002,Jane Smith,jane.smith@university.edu\r\nSTU1003,Alex Taylor,alex.taylor@university.edu';
        const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'attendees_import_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

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

    const applyFlags = (rows, validationResults = [], existingStudentIds = []) => {
        const emailCounts = {};
        const studentIdCounts = {};
        const existingStudentIdSet = new Set(existingStudentIds);

        rows.forEach(r => {
            const e = r.email ? r.email.toLowerCase().trim() : '';
            if (e) emailCounts[e] = (emailCounts[e] || 0) + 1;
            const s = r.studentId ? r.studentId.trim() : '';
            if (s) studentIdCounts[s] = (studentIdCounts[s] || 0) + 1;
        });

        return rows.map(r => {
            const cleanEmail = r.email ? r.email.toLowerCase().trim() : '';
            const cleanSid = r.studentId ? r.studentId.trim() : '';
            const validation = validationResults.find(v => v.email?.toLowerCase() === cleanEmail);

            const isValidEmail = validation !== undefined ? validation.valid : (r.isValidEmail ?? true);
            const provider = validation !== undefined ? validation.provider : (r.provider || null);
            const isExistingMember = validation !== undefined ? (validation.isExistingMember || false) : (r.isExistingMember || false);
            const isExistingStudentId = cleanSid ? (existingStudentIdSet.has(cleanSid) || (r.isExistingStudentId && existingStudentIds.length === 0)) : false;

            const isDuplicateEmailInCSV = cleanEmail ? emailCounts[cleanEmail] > 1 : false;
            const isDuplicateStudentIdInCSV = cleanSid ? studentIdCounts[cleanSid] > 1 : false;
            const isDuplicateInCSV = isDuplicateEmailInCSV || isDuplicateStudentIdInCSV;

            let issueType = null;
            let issueMessage = null;

            if (!isValidEmail) {
                issueType = 'unsupported_email';
                issueMessage = 'Unsupported Email (Must be Google/MS)';
            } else if (isExistingMember) {
                issueType = 'already_member';
                issueMessage = 'Already in Organization';
            } else if (isExistingStudentId) {
                issueType = 'existing_studentid';
                issueMessage = 'Student ID Already in Org';
            } else if (isDuplicateInCSV) {
                issueType = 'duplicate_in_csv';
                issueMessage = isDuplicateEmailInCSV ? 'Duplicate Email in File' : 'Duplicate ID in File';
            }

            const hasError = !isValidEmail || isExistingMember || isExistingStudentId || isDuplicateInCSV;

            return {
                ...r,
                isValidEmail,
                provider,
                isExistingMember,
                isExistingStudentId,
                isDuplicateInCSV,
                isDuplicateEmailInCSV,
                isDuplicateStudentIdInCSV,
                hasError,
                issueType,
                issueMessage
            };
        });
    };

    const processCSV = (file) => {
        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            const rows = text.split(/\r?\n/).filter(r => r.trim());
            if (rows.length < 2) {
                setError('CSV file is empty or missing data rows.');
                setLoading(false);
                return;
            }

            const rawHeaders = rows[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
            
            // Map header positions flexibly (supporting studentId, name, firstName, lastName, email)
            const headerMap = {};
            rawHeaders.forEach((h, index) => {
                const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (clean === 'studentid' || clean === 'id' || clean === 'regno' || clean === 'studentnumber' || clean === 'staffid') {
                    headerMap['studentId'] = index;
                } else if (clean === 'name' || clean === 'fullname' || clean === 'studentname' || clean === 'attendeename') {
                    headerMap['name'] = index;
                } else if (clean === 'firstname' || clean === 'first' || clean === 'fname' || clean === 'givenname') {
                    headerMap['firstName'] = index;
                } else if (clean === 'lastname' || clean === 'last' || clean === 'lname' || clean === 'surname' || clean === 'familyname') {
                    headerMap['lastName'] = index;
                } else if (clean === 'email' || clean === 'emailaddress' || clean === 'mail') {
                    headerMap['email'] = index;
                }
            });
            
            if (headerMap['email'] === undefined || (headerMap['name'] === undefined && headerMap['firstName'] === undefined)) {
                setError('CSV must contain at least "name" (or "firstName") and "email" columns.');
                setLoading(false);
                return;
            }

            const allRows = [];
            for (let i = 1; i < rows.length; i++) {
                const values = rows[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
                const studentId = headerMap['studentId'] !== undefined ? (values[headerMap['studentId']] || '') : '';
                let name = headerMap['name'] !== undefined ? (values[headerMap['name']] || '') : '';
                if (!name && headerMap['firstName'] !== undefined) {
                    const firstName = values[headerMap['firstName']] || '';
                    const lastName = headerMap['lastName'] !== undefined ? (values[headerMap['lastName']] || '') : '';
                    name = `${firstName} ${lastName}`.trim();
                }
                const email = headerMap['email'] !== undefined ? (values[headerMap['email']] || '') : '';
                
                if (email && name) {
                    allRows.push({
                        _id: i.toString(),
                        studentId,
                        name,
                        email
                    });
                }
            }
            
            if (allRows.length === 0) {
                setError('No valid data rows found in CSV.');
                setLoading(false);
                return;
            }

            validateEmails(allRows);
        };
        reader.readAsText(file);
    };

    const validateEmails = async (rows) => {
        try {
            const emails = rows.map(r => r.email).filter(Boolean);
            const studentIds = rows.map(r => r.studentId).filter(Boolean);
            const res = await api.post(`/organizations/${activeOrganization._id}/members/validate-emails`, { emails, studentIds });
            
            const rawData = res.data;
            const validationResults = Array.isArray(rawData) ? rawData : (rawData.results || []);
            const existingStudentIds = Array.isArray(rawData) ? [] : (rawData.existingStudentIds || []);

            const enrichedRows = applyFlags(rows, validationResults, existingStudentIds);
            
            setParsedData(enrichedRows);
            setStep(2);
        } catch(err) {
            setError('Failed to validate attendees against organization records and supported email providers.');
        } finally {
            setLoading(false);
        }
    };

    const startEditingRow = (row) => {
        setEditingRowId(row._id);
        setEditFormData({
            studentId: row.studentId || '',
            name: row.name || `${row.firstName || ''} ${row.lastName || ''}`.trim(),
            email: row.email || ''
        });
    };

    const saveRowEdits = async (rowId) => {
        const cleanName = editFormData.name.trim();
        const cleanEmail = editFormData.email.trim();
        const cleanStudentId = editFormData.studentId.trim();

        if (!cleanName) {
            toast.error('Name is required');
            return;
        }
        if (!cleanEmail) {
            toast.error('Email is required');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post(`/organizations/${activeOrganization._id}/members/validate-emails`, { 
                emails: [cleanEmail],
                studentIds: cleanStudentId ? [cleanStudentId] : []
            });
            const rawData = res.data;
            const validationResults = Array.isArray(rawData) ? rawData : (rawData.results || []);
            const existingStudentIds = Array.isArray(rawData) ? [] : (rawData.existingStudentIds || []);
            const validation = validationResults[0];

            setParsedData(prev => {
                const updated = prev.map(row => {
                    if (row._id === rowId) {
                        return {
                            ...row,
                            studentId: cleanStudentId,
                            name: cleanName,
                            email: cleanEmail,
                            isValidEmail: validation ? validation.valid : false,
                            provider: validation ? validation.provider : null,
                            isExistingMember: validation ? validation.isExistingMember : false,
                            isExistingStudentId: cleanStudentId ? existingStudentIds.includes(cleanStudentId) : false
                        };
                    }
                    return row;
                });
                return applyFlags(updated, validationResults, existingStudentIds);
            });
            setEditingRowId(null);
            toast.success('Record updated');
        } catch(err) {
            toast.error('Failed to validate record');
        } finally {
            setLoading(false);
        }
    };

    const removeRow = (rowId) => {
        setParsedData(prev => {
            const remaining = prev.filter(r => r._id !== rowId);
            return applyFlags(remaining);
        });
    };

    const handleImport = async () => {
        const hasIssues = parsedData.some(r => r.hasError);
        if (hasIssues) {
            toast.error("Please fix or remove invalid and duplicate records before importing.");
            return;
        }

        setImporting(true);
        setError('');
        
        try {
            const membersToImport = parsedData.map(r => ({
                studentId: r.studentId || '',
                name: r.name || `${r.firstName || ''} ${r.lastName || ''}`.trim(),
                email: r.email
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

    const issueRows = parsedData.filter(r => r.hasError);
    const issuesCount = issueRows.length;

    const unsupportedCount = parsedData.filter(r => r.issueType === 'unsupported_email').length;
    const alreadyMembersCount = parsedData.filter(r => r.issueType === 'already_member' || r.issueType === 'existing_studentid').length;
    const duplicateInCSVCount = parsedData.filter(r => r.issueType === 'duplicate_in_csv').length;

    const issueDetails = [
        unsupportedCount > 0 && `${unsupportedCount} unsupported ${unsupportedCount === 1 ? 'email' : 'emails'}`,
        alreadyMembersCount > 0 && `${alreadyMembersCount} already in organization`,
        duplicateInCSVCount > 0 && `${duplicateInCSVCount} duplicate in file`
    ].filter(Boolean).join(' • ');

    return createPortal(
        <div onClick={handleBackdropClick} className="modal-overlay z-[100] cursor-default">
            <div onClick={handleBackdropClick} className="modal-container px-2 sm:px-6">
                <div className={`modal-flex-card max-w-6xl lg:max-w-7xl xl:max-w-[1380px] p-0 ${isShaking ? 'animate-modal-shake' : ''}`}>
                    {/* Top loader if importing */}
                    {importing && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                            <Loader2 size={48} className="text-brand-500 animate-spin mb-4" />
                            <h3 className="text-xl font-bold text-slate-800">Importing Students...</h3>
                            <p className="text-slate-600 font-medium text-sm">Please wait. Creating accounts securely.</p>
                        </div>
                    )}
                    
                    <div className="modal-scroll-body p-6 sm:p-8 flex flex-col relative">
                        <button 
                            onClick={onClose}
                            disabled={importing}
                            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full disabled:opacity-50"
                        >
                            <X size={18} />
                        </button>
                        
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-slate-800">Bulk Import Attendees</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Upload a CSV file containing your student or attendee roster.</p>
                        </div>
                        
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-start font-medium">
                                <AlertTriangle size={18} className="mr-2 shrink-0 mt-0.5" />
                                <div>{error}</div>
                            </div>
                        )}
                        
                        {step === 1 && (
                            <div className="flex flex-col items-center justify-center p-10 sm:p-14 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 hover:bg-slate-100/50 transition-colors">
                                {loading ? (
                                    <>
                                        <Loader2 size={48} className="text-brand-400 mb-4 animate-spin" />
                                        <h3 className="text-lg font-bold text-slate-700 mb-2">Validating Roster...</h3>
                                        <p className="text-slate-500 text-sm">Checking MX records and existing organization memberships.</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4 border border-brand-100">
                                            <Upload size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-2">Upload CSV File</h3>
                                        <p className="text-slate-500 text-xs sm:text-sm mb-3 text-center max-w-lg">
                                            Format: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-brand-700 font-semibold">studentId</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-slate-700 font-semibold">name</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-slate-700 font-semibold">email</code>
                                        </p>
                                        
                                        <button 
                                            type="button" 
                                            onClick={downloadSampleCSV}
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 mb-6 bg-brand-50 hover:bg-brand-100/80 px-3.5 py-1.5 rounded-lg border border-brand-200/60 transition shadow-sm"
                                        >
                                            <Download size={13} />
                                            Download Sample CSV Template
                                        </button>
                                        
                                        <label className="btn btn-primary cursor-pointer shadow-lg shadow-brand-500/20 px-8 py-2.5 rounded-xl font-bold text-xs">
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
                            <div className="flex-1 flex flex-col min-h-0 space-y-4">
                                {issuesCount > 0 ? (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-red-50 border border-red-200 p-3.5 sm:p-4 rounded-2xl gap-2">
                                        <div className="flex items-start sm:items-center">
                                            <AlertTriangle size={18} className="mr-2.5 text-red-600 shrink-0 mt-0.5 sm:mt-0" /> 
                                            <div>
                                                <h3 className="font-bold text-red-700 text-xs sm:text-sm">
                                                    Found {issuesCount} {issuesCount === 1 ? 'issue' : 'issues'} in attendee roster
                                                </h3>
                                                {issueDetails && (
                                                    <p className="text-[11px] text-red-600/90 font-medium mt-0.5">
                                                        {issueDetails}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-[11px] sm:text-xs font-bold text-red-600 bg-white px-3 py-1 rounded-full shadow-sm self-start sm:self-auto shrink-0 border border-red-100">
                                            Please edit or remove before continuing
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                                        <h3 className="font-semibold text-emerald-700 text-xs sm:text-sm flex items-center">
                                            <CheckCircle size={16} className="mr-2 shrink-0" /> All {parsedData.length} records verified and ready for import!
                                        </h3>
                                        <div className="text-xs font-semibold text-emerald-700 bg-white px-3 py-1 rounded-full shadow-sm border border-emerald-200/60">
                                            Ready to import
                                        </div>
                                    </div>
                                )}
                                
                                <div className="table-container flex-1 overflow-y-auto min-h-[300px] max-h-[58vh] border border-slate-200/80 rounded-2xl relative shadow-sm">
                                    <table className="table w-full text-xs">
                                        <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm shadow-sm z-10 border-b border-slate-200">
                                            <tr>
                                                <th className="py-3 px-5 text-left font-bold text-slate-600 uppercase tracking-wider w-[18%] whitespace-nowrap">Student ID</th>
                                                <th className="py-3 px-5 text-left font-bold text-slate-600 uppercase tracking-wider w-[30%]">Name</th>
                                                <th className="py-3 px-5 text-left font-bold text-slate-600 uppercase tracking-wider w-[30%]">Email</th>
                                                <th className="py-3 px-5 text-center font-bold text-slate-600 uppercase tracking-wider w-[14%] whitespace-nowrap">Status</th>
                                                <th className="py-3 px-5 text-right font-bold text-slate-600 uppercase tracking-wider w-[8%] whitespace-nowrap">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {parsedData.map((row) => {
                                                const isEditing = editingRowId === row._id;
                                                const handleKeyDown = (e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        saveRowEdits(row._id);
                                                    } else if (e.key === 'Escape') {
                                                        e.preventDefault();
                                                        setEditingRowId(null);
                                                    }
                                                };

                                                return (
                                                    <tr key={row._id} className={`hover:bg-slate-50/60 transition ${row.hasError ? 'bg-red-50/40' : ''} ${isEditing ? 'bg-brand-50/30' : ''}`}>
                                                        <td className="py-3 px-5 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                                                             {isEditing ? (
                                                                <input 
                                                                    type="text" 
                                                                    value={editFormData.studentId}
                                                                    onChange={(e) => setEditFormData(prev => ({ ...prev, studentId: e.target.value }))}
                                                                    onKeyDown={handleKeyDown}
                                                                    placeholder="Student ID"
                                                                    className="form-input py-1 px-2.5 text-xs w-full font-mono bg-white"
                                                                    autoFocus
                                                                />
                                                            ) : (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span>{row.studentId || <span className="text-slate-300 font-sans italic font-normal">N/A</span>}</span>
                                                                    {row.isDuplicateStudentIdInCSV && (
                                                                        <span className="text-[10px] text-red-600 font-bold bg-red-100 px-1.5 py-0.5 rounded whitespace-nowrap" title="Duplicate Student ID in CSV">Dup ID</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-5 font-bold text-slate-800">
                                                            {isEditing ? (
                                                                <input 
                                                                    type="text" 
                                                                    value={editFormData.name}
                                                                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                                                                    onKeyDown={handleKeyDown}
                                                                    placeholder="Full Name"
                                                                    className="form-input py-1 px-2.5 text-xs w-full font-bold text-slate-800 bg-white"
                                                                />
                                                            ) : (
                                                                row.name || `${row.firstName || ''} ${row.lastName || ''}`.trim()
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-5">
                                                            {isEditing ? (
                                                                <input 
                                                                    type="email" 
                                                                    value={editFormData.email}
                                                                    onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                                                                    onKeyDown={handleKeyDown}
                                                                    placeholder="Email Address"
                                                                    className="form-input py-1 px-2.5 text-xs w-full bg-white"
                                                                />
                                                            ) : (
                                                                <span className={row.hasError ? 'text-red-600 font-semibold' : 'text-slate-700'}>
                                                                    {row.email}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-5 text-center whitespace-nowrap">
                                                            {row.issueType === 'unsupported_email' && (
                                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 bg-red-100 text-red-700 rounded-lg whitespace-nowrap" title="Only Google Workspace & Microsoft 365 emails are supported">
                                                                    <XCircle size={13} /> Unsupported Email
                                                                </span>
                                                            )}
                                                            {row.issueType === 'already_member' && (
                                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 bg-red-100 text-red-700 rounded-lg whitespace-nowrap" title="Attendee already exists in this organization">
                                                                    <AlertTriangle size={13} /> Already in Org
                                                                </span>
                                                            )}
                                                            {row.issueType === 'existing_studentid' && (
                                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 bg-red-100 text-red-700 rounded-lg whitespace-nowrap" title="Student ID is already assigned to a member in this organization">
                                                                    <AlertTriangle size={13} /> ID Already in Org
                                                                </span>
                                                            )}
                                                            {row.issueType === 'duplicate_in_csv' && (
                                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 bg-red-100 text-red-700 rounded-lg whitespace-nowrap" title={row.issueMessage}>
                                                                    <AlertTriangle size={13} /> Duplicate in File
                                                                </span>
                                                            )}
                                                            {!row.hasError && (
                                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg whitespace-nowrap">
                                                                    <CheckCircle size={13} /> {row.provider || 'Valid'}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-5 text-right whitespace-nowrap">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                {isEditing ? (
                                                                    <>
                                                                        <button 
                                                                            onClick={() => saveRowEdits(row._id)}
                                                                            className="text-emerald-600 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-emerald-50 bg-emerald-50/50 transition border border-emerald-200"
                                                                            title="Save and Validate"
                                                                        >
                                                                            <Check size={15} />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => setEditingRowId(null)}
                                                                            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 bg-slate-50 transition border border-slate-200"
                                                                            title="Cancel"
                                                                        >
                                                                            <X size={15} />
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <button 
                                                                            onClick={() => startEditingRow(row)}
                                                                            className="text-slate-400 hover:text-brand-600 transition p-1.5 rounded-lg hover:bg-slate-100"
                                                                            title="Edit Record"
                                                                        >
                                                                            <Edit2 size={14} />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => removeRow(row._id)}
                                                                            className="text-slate-400 hover:text-red-600 transition p-1.5 rounded-lg hover:bg-red-50"
                                                                            title="Remove Row"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {parsedData.length === 0 && (
                                                <tr>
                                                    <td colSpan="6" className="text-center py-10 text-slate-400">
                                                        No valid rows found. Please check your CSV file.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-auto shrink-0">
                                    <button className="btn btn-secondary text-xs px-4 py-2" onClick={() => setStep(1)}>
                                        Back / Upload New
                                    </button>
                                    <button 
                                        className="btn btn-primary px-7 py-2.5 shadow-lg shadow-brand-500/20 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed" 
                                        onClick={handleImport} 
                                        disabled={issuesCount > 0 || parsedData.length === 0 || importing}
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

