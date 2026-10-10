import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { useOrganization } from '../../context/OrganizationContext';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { X, Upload, CheckCircle, AlertTriangle, Trash2, Edit2, Check, XCircle, Loader2, Download, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

const ImportCoursesModal = ({ onClose, onCoursesImported }) => {
    const { activeOrganization } = useOrganization();

    const [csvFile, setCsvFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [availableInstructors, setAvailableInstructors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState(1);

    const [editingRowId, setEditingRowId] = useState(null);
    const [editFormData, setEditFormData] = useState({
        courseCode: '',
        courseName: '',
        batch: '',
        semester: '',
        startDate: '',
        endDate: '',
        instructorEmail: '',
        description: ''
    });

    const isDirty = Boolean(csvFile || parsedData.length > 0 || importing);

    const { isShaking, handleBackdropClick } = useModalDismiss({
        onClose: importing ? () => {} : onClose,
        isDirty
    });

    const downloadSampleCSV = () => {
        const sampleContent = 'courseCode,courseName,batch,semester,startDate,endDate,instructorEmail,description\r\nCS101,Introduction to Computer Science,2026,Semester 1,2026-09-01,2026-12-15,instructor@example.com,Introductory programming and computer science principles\r\nCS102,Data Structures & Algorithms,2026,Semester 1,2026-09-01,2026-12-15,instructor@example.com,Core algorithmic techniques and problem solving\r\nMATH201,Discrete Mathematics,2026,Semester 1,2026-09-01,2026-12-15,instructor@example.com,Logic set theory and discrete structures';
        const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'courses_import_template.csv';
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

    const applyFlags = (rows, validationResults = []) => {
        const codeCounts = {};

        rows.forEach(r => {
            const code = (r.courseCode || '').toLowerCase().trim();
            if (code) codeCounts[code] = (codeCounts[code] || 0) + 1;
        });

        return rows.map(r => {
            const cleanCode = (r.courseCode || '').toLowerCase().trim();
            const validation = validationResults.find(v => (v.courseCode || '').toLowerCase().trim() === cleanCode);

            const isDuplicateCodeInCSV = cleanCode ? codeCounts[cleanCode] > 1 : false;
            const isCodeDuplicateInOrg = validation !== undefined ? validation.isCodeDuplicateInOrg : (r.isCodeDuplicateInOrg || false);
            const isDateInvalid = validation !== undefined ? validation.isDateInvalid : (r.isDateInvalid || false);
            const instructorFound = validation !== undefined ? validation.instructorFound : (r.instructorFound || null);
            const rawErrors = validation !== undefined ? validation.errors : (r.errors || []);

            const isMissingFields = !r.courseCode?.trim() || !r.courseName?.trim() || !r.batch?.trim() || !r.semester?.trim();
            const isMissingInstructor = !r.instructorEmail?.trim() || !instructorFound;

            let issueType = null;
            let issueMessage = null;

            if (isDuplicateCodeInCSV) {
                issueType = 'duplicate_in_csv';
                issueMessage = 'Duplicate Code in File';
            } else if (isCodeDuplicateInOrg) {
                issueType = 'code_in_org';
                issueMessage = 'Code Already in Organization';
            } else if (isDateInvalid) {
                issueType = 'invalid_dates';
                issueMessage = 'Invalid Date Range (End date < Start date)';
            } else if (isMissingInstructor) {
                issueType = 'instructor_not_found';
                issueMessage = 'Instructor Not Found in Org';
            } else if (isMissingFields) {
                issueType = 'missing_fields';
                issueMessage = 'Missing Required Fields';
            }

            const hasError = isDuplicateCodeInCSV || isCodeDuplicateInOrg || isDateInvalid || isMissingInstructor || isMissingFields || rawErrors.length > 0;

            return {
                ...r,
                isDuplicateCodeInCSV,
                isCodeDuplicateInOrg,
                isDateInvalid,
                instructorFound,
                hasError,
                issueType,
                issueMessage,
                errors: rawErrors
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

            const headerMap = {};
            rawHeaders.forEach((h, index) => {
                const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (clean === 'coursecode' || clean === 'code' || clean === 'cid' || clean === 'subjectcode') {
                    headerMap['courseCode'] = index;
                } else if (clean === 'coursename' || clean === 'name' || clean === 'title' || clean === 'coursetitle' || clean === 'subject') {
                    headerMap['courseName'] = index;
                } else if (clean === 'batch' || clean === 'year' || clean === 'cohort' || clean === 'class') {
                    headerMap['batch'] = index;
                } else if (clean === 'semester' || clean === 'term' || clean === 'sem') {
                    headerMap['semester'] = index;
                } else if (clean === 'startdate' || clean === 'start' || clean === 'fromdate' || clean === 'from') {
                    headerMap['startDate'] = index;
                } else if (clean === 'enddate' || clean === 'end' || clean === 'todate' || clean === 'to') {
                    headerMap['endDate'] = index;
                } else if (clean === 'instructoremail' || clean === 'instructor' || clean === 'teacheremail' || clean === 'lectureremail' || clean === 'email') {
                    headerMap['instructorEmail'] = index;
                } else if (clean === 'description' || clean === 'desc' || clean === 'details' || clean === 'summary') {
                    headerMap['description'] = index;
                }
            });

            if (headerMap['courseCode'] === undefined || headerMap['courseName'] === undefined) {
                setError('CSV must contain at least "courseCode" and "courseName" columns.');
                setLoading(false);
                return;
            }

            const allRows = [];
            for (let i = 1; i < rows.length; i++) {
                const values = rows[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
                const courseCode = headerMap['courseCode'] !== undefined ? (values[headerMap['courseCode']] || '') : '';
                const courseName = headerMap['courseName'] !== undefined ? (values[headerMap['courseName']] || '') : '';
                const batch = headerMap['batch'] !== undefined ? (values[headerMap['batch']] || '') : '';
                const semester = headerMap['semester'] !== undefined ? (values[headerMap['semester']] || '') : '';
                const startDate = headerMap['startDate'] !== undefined ? (values[headerMap['startDate']] || '') : '';
                const endDate = headerMap['endDate'] !== undefined ? (values[headerMap['endDate']] || '') : '';
                const instructorEmail = headerMap['instructorEmail'] !== undefined ? (values[headerMap['instructorEmail']] || '') : '';
                const description = headerMap['description'] !== undefined ? (values[headerMap['description']] || '') : '';

                if (courseCode || courseName) {
                    allRows.push({
                        _id: i.toString(),
                        courseCode,
                        courseName,
                        batch,
                        semester,
                        startDate,
                        endDate,
                        instructorEmail,
                        description
                    });
                }
            }

            if (allRows.length === 0) {
                setError('No valid course rows found in CSV.');
                setLoading(false);
                return;
            }

            validateCourses(allRows);
        };
        reader.readAsText(file);
    };

    const validateCourses = async (rows) => {
        try {
            const res = await api.post(`/organizations/${activeOrganization._id}/courses/validate-import`, {
                courses: rows.map(r => ({
                    courseCode: r.courseCode,
                    courseName: r.courseName,
                    batch: r.batch,
                    semester: r.semester,
                    startDate: r.startDate,
                    endDate: r.endDate,
                    instructorEmail: r.instructorEmail,
                    description: r.description
                }))
            });

            const validationResults = res.data.results || [];
            if (res.data.availableInstructors) {
                setAvailableInstructors(res.data.availableInstructors);
            }

            const enrichedRows = applyFlags(rows, validationResults);
            setParsedData(enrichedRows);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to validate courses against organization records.');
        } finally {
            setLoading(false);
        }
    };

    const startEditingRow = (row) => {
        setEditingRowId(row._id);
        setEditFormData({
            courseCode: row.courseCode || '',
            courseName: row.courseName || '',
            batch: row.batch || '',
            semester: row.semester || '',
            startDate: row.startDate || '',
            endDate: row.endDate || '',
            instructorEmail: row.instructorEmail || '',
            description: row.description || ''
        });
    };

    const saveRowEdits = async (rowId) => {
        const cleanCode = editFormData.courseCode.trim().toUpperCase();
        const cleanName = editFormData.courseName.trim();
        const cleanBatch = editFormData.batch.trim();
        const cleanSemester = editFormData.semester.trim();
        const cleanEmail = editFormData.instructorEmail.trim().toLowerCase();
        const cleanStartDate = editFormData.startDate.trim();
        const cleanEndDate = editFormData.endDate.trim();
        const cleanDesc = editFormData.description.trim();

        if (!cleanCode) {
            toast.error('Course Code is required');
            return;
        }
        if (!cleanName) {
            toast.error('Course Name is required');
            return;
        }
        if (!cleanBatch || !cleanSemester) {
            toast.error('Batch and Semester are required');
            return;
        }
        if (!cleanEmail) {
            toast.error('Instructor Email is required');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post(`/organizations/${activeOrganization._id}/courses/validate-import`, {
                courses: [{
                    courseCode: cleanCode,
                    courseName: cleanName,
                    batch: cleanBatch,
                    semester: cleanSemester,
                    startDate: cleanStartDate,
                    endDate: cleanEndDate,
                    instructorEmail: cleanEmail,
                    description: cleanDesc
                }]
            });

            const validationResults = res.data.results || [];
            const validation = validationResults[0];

            setParsedData(prev => {
                const updated = prev.map(row => {
                    if (row._id === rowId) {
                        return {
                            ...row,
                            courseCode: cleanCode,
                            courseName: cleanName,
                            batch: cleanBatch,
                            semester: cleanSemester,
                            startDate: validation?.startDate || cleanStartDate,
                            endDate: validation?.endDate || cleanEndDate,
                            instructorEmail: cleanEmail,
                            description: cleanDesc,
                            isCodeDuplicateInOrg: validation ? validation.isCodeDuplicateInOrg : false,
                            isDateInvalid: validation ? validation.isDateInvalid : false,
                            instructorFound: validation ? validation.instructorFound : null,
                            errors: validation ? validation.errors : []
                        };
                    }
                    return row;
                });
                return applyFlags(updated, validationResults);
            });

            setEditingRowId(null);
            toast.success('Course record updated');
        } catch (err) {
            toast.error('Failed to validate course record');
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
            toast.error('Please fix or remove invalid and duplicate course records before creating.');
            return;
        }

        setImporting(true);
        setError('');

        try {
            const coursesToCreate = parsedData.map(r => ({
                courseCode: r.courseCode.trim().toUpperCase(),
                courseName: r.courseName.trim(),
                batch: r.batch.trim(),
                semester: r.semester.trim(),
                startDate: r.startDate || null,
                endDate: r.endDate || null,
                instructorEmail: r.instructorEmail.trim().toLowerCase(),
                instructorMemberId: r.instructorFound?.memberId,
                description: r.description ? r.description.trim() : ''
            }));

            const res = await api.post(`/organizations/${activeOrganization._id}/courses/bulk-create`, {
                courses: coursesToCreate
            });

            toast.success(`Successfully created ${res.data.total} courses!`);
            onCoursesImported();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create courses. Transaction was rolled back.');
            setImporting(false);
        }
    };

    const issueRows = parsedData.filter(r => r.hasError);
    const issuesCount = issueRows.length;

    const duplicateInCSVCount = parsedData.filter(r => r.issueType === 'duplicate_in_csv').length;
    const codeInOrgCount = parsedData.filter(r => r.issueType === 'code_in_org').length;
    const dateInvalidCount = parsedData.filter(r => r.issueType === 'invalid_dates').length;
    const instructorNotFoundCount = parsedData.filter(r => r.issueType === 'instructor_not_found').length;
    const missingFieldsCount = parsedData.filter(r => r.issueType === 'missing_fields').length;

    const issueDetails = [
        duplicateInCSVCount > 0 && `${duplicateInCSVCount} duplicate in file`,
        codeInOrgCount > 0 && `${codeInOrgCount} code already in org`,
        dateInvalidCount > 0 && `${dateInvalidCount} invalid date range`,
        instructorNotFoundCount > 0 && `${instructorNotFoundCount} instructor not found`,
        missingFieldsCount > 0 && `${missingFieldsCount} missing fields`
    ].filter(Boolean).join(' • ');

    return createPortal(
        <div onClick={handleBackdropClick} className="modal-overlay z-[100] cursor-default">
            <div onClick={handleBackdropClick} className="modal-container px-2 sm:px-6">
                <div className={`modal-content w-full max-w-6xl lg:max-w-7xl xl:max-w-[1420px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[90dvh] flex flex-col p-0 overflow-hidden relative shadow-2xl rounded-2xl sm:rounded-3xl border-0 ${isShaking ? 'animate-modal-shake' : ''}`}>
                    {/* Top loader if importing */}
                    {importing && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                            <Loader2 size={48} className="text-brand-500 animate-spin mb-4" />
                            <h3 className="text-xl font-bold text-slate-800">Creating Courses...</h3>
                            <p className="text-slate-600 font-medium text-sm">Please wait. Registering all courses securely.</p>
                        </div>
                    )}

                    <div className="p-6 sm:p-8 flex-1 overflow-y-auto min-h-0 flex flex-col relative">
                        <button 
                            onClick={onClose}
                            disabled={importing}
                            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full disabled:opacity-50"
                        >
                            <X size={18} />
                        </button>

                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-slate-800">Bulk Create Courses</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Upload a CSV file containing multiple course details to create in bulk.</p>
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
                                        <h3 className="text-lg font-bold text-slate-700 mb-2">Validating Courses...</h3>
                                        <p className="text-slate-500 text-sm">Checking course codes, date ranges, and instructor memberships.</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4 border border-brand-100">
                                            <BookOpen size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-2">Upload Course CSV</h3>
                                        <p className="text-slate-500 text-xs sm:text-sm mb-3 text-center max-w-xl">
                                            Format: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-brand-700 font-semibold">courseCode</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-slate-700">courseName</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-slate-700">batch</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-slate-700">semester</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-slate-700">startDate</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-slate-700">endDate</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-slate-700">instructorEmail</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-slate-700">description</code>
                                        </p>

                                        <button 
                                            type="button" 
                                            onClick={downloadSampleCSV}
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 mb-6 bg-brand-50 hover:bg-brand-100/80 px-3.5 py-1.5 rounded-lg border border-brand-200/60 transition shadow-sm"
                                        >
                                            <Download size={13} />
                                            Download Sample Courses CSV Template
                                        </button>

                                        <label className="btn btn-primary cursor-pointer shadow-lg shadow-brand-500/20 px-8 py-2.5 rounded-xl font-bold text-xs">
                                            Select CSV File
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
                                                    Found {issuesCount} {issuesCount === 1 ? 'issue' : 'issues'} in course import list
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
                                            <CheckCircle size={16} className="mr-2 shrink-0" /> All {parsedData.length} courses verified and ready to create!
                                        </h3>
                                        <div className="text-xs font-semibold text-emerald-700 bg-white px-3 py-1 rounded-full shadow-sm border border-emerald-200/60">
                                            Ready to create
                                        </div>
                                    </div>
                                )}

                                {/* Datalist for available instructors */}
                                <datalist id="available-instructors-list">
                                    {availableInstructors.map(inst => (
                                        <option key={inst.memberId} value={inst.email}>
                                            {inst.name} ({inst.role})
                                        </option>
                                    ))}
                                </datalist>

                                <div className="table-container flex-1 overflow-y-auto min-h-[320px] max-h-[58vh] border border-slate-200/80 rounded-2xl relative shadow-sm">
                                    <table className="table w-full text-xs">
                                        <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm shadow-sm z-10 border-b border-slate-200">
                                            <tr>
                                                <th className="py-3 px-4 text-left font-bold text-slate-600 uppercase tracking-wider w-[12%] whitespace-nowrap">Course Code</th>
                                                <th className="py-3 px-4 text-left font-bold text-slate-600 uppercase tracking-wider w-[18%]">Course Name</th>
                                                <th className="py-3 px-4 text-left font-bold text-slate-600 uppercase tracking-wider w-[14%] whitespace-nowrap">Batch / Sem</th>
                                                <th className="py-3 px-4 text-left font-bold text-slate-600 uppercase tracking-wider w-[18%] whitespace-nowrap">Duration</th>
                                                <th className="py-3 px-4 text-left font-bold text-slate-600 uppercase tracking-wider w-[18%]">Instructor</th>
                                                <th className="py-3 px-4 text-center font-bold text-slate-600 uppercase tracking-wider w-[12%] whitespace-nowrap">Status</th>
                                                <th className="py-3 px-4 text-right font-bold text-slate-600 uppercase tracking-wider w-[8%] whitespace-nowrap">Actions</th>
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
                                                        {/* Course Code */}
                                                        <td className="py-3 px-4 font-mono text-xs font-bold text-slate-800 whitespace-nowrap">
                                                            {isEditing ? (
                                                                <input 
                                                                    type="text" 
                                                                    value={editFormData.courseCode}
                                                                    onChange={(e) => setEditFormData(prev => ({ ...prev, courseCode: e.target.value }))}
                                                                    onKeyDown={handleKeyDown}
                                                                    placeholder="Code (e.g. CS101)"
                                                                    className="form-input py-1 px-2 text-xs w-full font-mono font-bold bg-white"
                                                                    autoFocus
                                                                />
                                                            ) : (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-brand-700 bg-brand-50 border border-brand-200/60 px-2 py-0.5 rounded-md">{row.courseCode}</span>
                                                                    {row.isDuplicateCodeInCSV && (
                                                                        <span className="text-[10px] text-red-600 font-bold bg-red-100 px-1.5 py-0.5 rounded whitespace-nowrap" title="Duplicate Course Code in File">Dup Code</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Course Name */}
                                                        <td className="py-3 px-4 font-bold text-slate-800">
                                                            {isEditing ? (
                                                                <div className="space-y-1">
                                                                    <input 
                                                                        type="text" 
                                                                        value={editFormData.courseName}
                                                                        onChange={(e) => setEditFormData(prev => ({ ...prev, courseName: e.target.value }))}
                                                                        onKeyDown={handleKeyDown}
                                                                        placeholder="Course Name"
                                                                        className="form-input py-1 px-2 text-xs w-full font-bold bg-white"
                                                                    />
                                                                    <input 
                                                                        type="text" 
                                                                        value={editFormData.description}
                                                                        onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                                                                        onKeyDown={handleKeyDown}
                                                                        placeholder="Description (optional)"
                                                                        className="form-input py-0.5 px-2 text-[11px] w-full text-slate-600 bg-white"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    <div>{row.courseName}</div>
                                                                    {row.description && (
                                                                        <div className="text-[11px] text-slate-400 font-normal truncate max-w-xs">{row.description}</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Batch & Semester */}
                                                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                                                            {isEditing ? (
                                                                <div className="flex items-center gap-1">
                                                                    <input 
                                                                        type="text" 
                                                                        value={editFormData.batch}
                                                                        onChange={(e) => setEditFormData(prev => ({ ...prev, batch: e.target.value }))}
                                                                        onKeyDown={handleKeyDown}
                                                                        placeholder="Batch"
                                                                        className="form-input py-1 px-1.5 text-xs w-1/2 bg-white"
                                                                    />
                                                                    <input 
                                                                        type="text" 
                                                                        value={editFormData.semester}
                                                                        onChange={(e) => setEditFormData(prev => ({ ...prev, semester: e.target.value }))}
                                                                        onKeyDown={handleKeyDown}
                                                                        placeholder="Sem"
                                                                        className="form-input py-1 px-1.5 text-xs w-1/2 bg-white"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="text-xs">
                                                                    <span className="font-semibold text-slate-700">{row.batch || '-'}</span>
                                                                    <span className="text-slate-400 mx-1">•</span>
                                                                    <span className="text-slate-600">{row.semester || '-'}</span>
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Duration */}
                                                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                                                            {isEditing ? (
                                                                <div className="flex items-center gap-1">
                                                                    <input 
                                                                        type="date" 
                                                                        value={editFormData.startDate}
                                                                        onChange={(e) => setEditFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                                                        onKeyDown={handleKeyDown}
                                                                        className="form-input py-1 px-1 text-[11px] w-1/2 bg-white"
                                                                        title="Start Date"
                                                                    />
                                                                    <span className="text-slate-400">-</span>
                                                                    <input 
                                                                        type="date" 
                                                                        value={editFormData.endDate}
                                                                        onChange={(e) => setEditFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                                                        onKeyDown={handleKeyDown}
                                                                        className="form-input py-1 px-1 text-[11px] w-1/2 bg-white"
                                                                        title="End Date"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="text-xs">
                                                                    {row.startDate || row.endDate ? (
                                                                        <span>{row.startDate || 'Start'} to {row.endDate || 'End'}</span>
                                                                    ) : (
                                                                        <span className="text-slate-300 italic">No dates</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Instructor */}
                                                        <td className="py-3 px-4">
                                                            {isEditing ? (
                                                                <input 
                                                                    type="email" 
                                                                    list="available-instructors-list"
                                                                    value={editFormData.instructorEmail}
                                                                    onChange={(e) => setEditFormData(prev => ({ ...prev, instructorEmail: e.target.value }))}
                                                                    onKeyDown={handleKeyDown}
                                                                    placeholder="Instructor Email"
                                                                    className="form-input py-1 px-2 text-xs w-full bg-white"
                                                                />
                                                            ) : (
                                                                <div>
                                                                    {row.instructorFound ? (
                                                                        <div className="flex flex-col">
                                                                            <span className="font-semibold text-slate-800">{row.instructorFound.name}</span>
                                                                            <span className="text-[11px] text-slate-400">{row.instructorEmail}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-red-600 font-semibold">{row.instructorEmail || 'No Instructor'}</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Status Badge */}
                                                        <td className="py-3 px-4 text-center whitespace-nowrap">
                                                            {row.issueType === 'duplicate_in_csv' && (
                                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 bg-red-100 text-red-700 rounded-lg whitespace-nowrap" title={row.issueMessage}>
                                                                    <AlertTriangle size={13} /> Duplicate in File
                                                                </span>
                                                            )}
                                                            {row.issueType === 'code_in_org' && (
                                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 bg-red-100 text-red-700 rounded-lg whitespace-nowrap" title="Course code already exists in this organization">
                                                                    <AlertTriangle size={13} /> Code Exists in Org
                                                                </span>
                                                            )}
                                                            {row.issueType === 'invalid_dates' && (
                                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 bg-red-100 text-red-700 rounded-lg whitespace-nowrap" title="End date must be on or after start date">
                                                                    <XCircle size={13} /> Invalid Dates
                                                                </span>
                                                            )}
                                                            {row.issueType === 'instructor_not_found' && (
                                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 bg-red-100 text-red-700 rounded-lg whitespace-nowrap" title="Instructor email must match an active Owner, Instructor, or Admin in this organization">
                                                                    <XCircle size={13} /> Instructor Not Found
                                                                </span>
                                                            )}
                                                            {row.issueType === 'missing_fields' && (
                                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 bg-red-100 text-red-700 rounded-lg whitespace-nowrap" title="Course code, name, batch, semester, and instructor are required">
                                                                    <XCircle size={13} /> Missing Fields
                                                                </span>
                                                            )}
                                                            {!row.hasError && (
                                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg whitespace-nowrap">
                                                                    <CheckCircle size={13} /> Ready
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Actions */}
                                                        <td className="py-3 px-4 text-right whitespace-nowrap">
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
                                                                            title="Edit Course"
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
                                                    <td colSpan="7" className="text-center py-10 text-slate-400">
                                                        No valid course rows found. Please check your CSV file.
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
                                        Confirm & Create {parsedData.length} Courses
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

export default ImportCoursesModal;
