import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, User, Calendar, BookOpen, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import api from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const StudentAttendanceModal = ({ isOpen, onClose, organizationId, courseId, studentOrgMemberId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen || !studentOrgMemberId || !courseId) return;

        const fetchStudentAttendance = async () => {
            try {
                setLoading(true);
                setError('');
                const res = await api.get(`/organizations/${organizationId}/courses/${courseId}/students/${studentOrgMemberId}/attendance`);
                setData(res.data);
            } catch (err) {
                console.error("Failed to load student attendance:", err);
                setError(err.response?.data?.message || 'Failed to load attendance report');
            } finally {
                setLoading(false);
            }
        };

        fetchStudentAttendance();
    }, [isOpen, organizationId, courseId, studentOrgMemberId]);

    if (!isOpen) return null;

    const generatePDF = () => {
        if (!data) return;

        const doc = new jsPDF();
        const { student, course, breakdown, summary } = data;

        // Colors
        const primaryColor = [15, 23, 42]; // slate-900
        const brandColor = [79, 70, 229]; // indigo-600

        // Title Header
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, 210, 40, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('STUDENT ATTENDANCE REPORT', 14, 20);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated on: ${new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}`, 14, 28);

        // Course Info Box
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(14, 46, 182, 32, 3, 3, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(`${course.code} - ${course.name}`, 20, 56);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`Batch: ${course.batch || 'N/A'}    |    Semester: ${course.semester || 'N/A'}`, 20, 64);
        doc.text(`Lecturer: ${course.instructor?.name || 'Assigned Staff'} (${course.instructor?.email || ''})`, 20, 72);

        // Student Info Box
        doc.roundedRect(14, 82, 182, 26, 3, 3, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(`Student: ${student.name}`, 20, 92);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`Email: ${student.email}    |    Student ID: ${student.studentId || 'N/A'}`, 20, 100);

        // Summary Statistics Box
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(14, 114, 182, 24, 3, 3, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(`Total Sessions: ${summary.totalConducted}`, 24, 128);
        doc.text(`Attended: ${summary.totalAttended}`, 75, 128);
        doc.text(`Absent: ${summary.totalAbsent}`, 120, 128);

        const eligibilityText = summary.isEligible ? 'ELIGIBLE' : 'SHORT ATTENDANCE';
        const eligibilityColor = summary.isEligible ? [16, 185, 129] : [239, 68, 68];
        doc.setTextColor(eligibilityColor[0], eligibilityColor[1], eligibilityColor[2]);
        doc.text(`Rate: ${summary.overallPercentage}% (${eligibilityText})`, 155, 128);

        // Table Data
        const tableBody = breakdown
            .filter(item => item.conducted > 0)
            .map(item => [
                item.type,
                item.conducted.toString(),
                item.attended.toString(),
                item.absent.toString(),
                `${item.percentage}%`
            ]);

        // If no sessions yet, include all standard rows
        const finalRows = tableBody.length > 0 ? tableBody : breakdown.map(item => [
            item.type,
            '0',
            '0',
            '0',
            '0%'
        ]);

        autoTable(doc, {
            startY: 145,
            head: [['Session Type', 'Conducted', 'Attended', 'Absent', 'Attendance %']],
            body: finalRows,
            theme: 'grid',
            headStyles: {
                fillColor: brandColor,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { fontStyle: 'bold', halign: 'left' },
                1: { halign: 'center' },
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { halign: 'center', fontStyle: 'bold' }
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            styles: {
                fontSize: 9,
                cellPadding: 4
            }
        });

        // Footer / Signature Section
        const finalY = doc.lastAutoTable.finalY || 220;
        const signatureY = Math.min(finalY + 30, 260);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);

        doc.line(24, signatureY, 80, signatureY);
        doc.text('Lecturer / Instructor Signature', 26, signatureY + 6);

        doc.line(130, signatureY, 186, signatureY);
        doc.text('Department Head / Official Stamp', 132, signatureY + 6);

        // Save PDF
        const sanitizedStudentName = student.name.replace(/[^a-zA-Z0-9]/g, '_');
        doc.save(`${course.code}_${sanitizedStudentName}_Attendance_Report.pdf`);
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
            <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Student Attendance Report</h2>
                            <p className="text-xs text-slate-500">Comprehensive breakdown across all lecture formats</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {data && (
                            <button
                                onClick={generatePDF}
                                className="flex items-center px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition"
                            >
                                <Download size={14} className="mr-1.5" /> Export PDF
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                            <span className="text-sm font-medium">Calculating attendance metrics...</span>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    ) : data ? (
                        <div className="space-y-6">
                            {/* Profile & Course Meta Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Student Info */}
                                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-1.5">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Student Information</div>
                                    <div className="text-base font-bold text-slate-900">{data.student.name}</div>
                                    <div className="text-xs text-slate-600 flex items-center">
                                        <span className="font-medium mr-2">Email:</span> {data.student.email}
                                    </div>
                                    {data.student.studentId && (
                                        <div className="text-xs text-slate-600 flex items-center">
                                            <span className="font-medium mr-2">Student ID:</span> 
                                            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{data.student.studentId}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Course Info */}
                                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-1.5">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course Specification</div>
                                    <div className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        <span className="font-mono text-xs px-2 py-0.5 bg-brand-100 text-brand-700 rounded font-bold">
                                            {data.course.code}
                                        </span>
                                        <span className="truncate">{data.course.name}</span>
                                    </div>
                                    <div className="text-xs text-slate-600">
                                        <span className="font-medium">Cohort:</span> {data.course.batch || '-'} &bull; <span className="font-medium">Term:</span> {data.course.semester || '-'}
                                    </div>
                                    {data.course.instructor && (
                                        <div className="text-xs text-slate-600 truncate">
                                            <span className="font-medium">Lecturer:</span> {data.course.instructor.name}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Overall Stats Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-center">
                                    <div className="text-[11px] font-semibold text-slate-400 uppercase">Total Sessions</div>
                                    <div className="text-xl font-bold text-slate-900 mt-1">{data.summary.totalConducted}</div>
                                </div>
                                <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-center">
                                    <div className="text-[11px] font-semibold text-emerald-600 uppercase">Attended</div>
                                    <div className="text-xl font-bold text-emerald-600 mt-1">{data.summary.totalAttended}</div>
                                </div>
                                <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-center">
                                    <div className="text-[11px] font-semibold text-rose-500 uppercase">Absent</div>
                                    <div className="text-xl font-bold text-rose-500 mt-1">{data.summary.totalAbsent}</div>
                                </div>
                                <div className={`p-3.5 rounded-xl border text-center ${
                                    data.summary.isEligible 
                                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                                        : 'bg-amber-50/60 border-amber-200 text-amber-800'
                                }`}>
                                    <div className="text-[11px] font-semibold uppercase">Overall Rate</div>
                                    <div className="text-xl font-extrabold mt-1">{data.summary.overallPercentage}%</div>
                                    <div className="text-[10px] font-bold mt-0.5">
                                        {data.summary.isEligible ? 'Eligible (>=80%)' : 'Short (<80%)'}
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Breakdown Table */}
                            <div className="rounded-xl border border-slate-200 overflow-hidden">
                                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase tracking-wider">
                                    Attendance by Session Format
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-100/60 text-slate-500 font-semibold border-b border-slate-200">
                                            <tr>
                                                <th className="py-2.5 px-4">Session Format</th>
                                                <th className="py-2.5 px-4 text-center">Conducted</th>
                                                <th className="py-2.5 px-4 text-center">Attended</th>
                                                <th className="py-2.5 px-4 text-center">Absent</th>
                                                <th className="py-2.5 px-4 text-center">Percentage</th>
                                                <th className="py-2.5 px-4 w-32">Progress</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {data.breakdown.map((item) => (
                                                <tr key={item.type} className="hover:bg-slate-50/50 transition">
                                                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                                                        {item.type}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center text-slate-600">
                                                        {item.conducted}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center font-bold text-emerald-600">
                                                        {item.attended}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center font-bold text-rose-500">
                                                        {item.absent}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center font-bold text-slate-900">
                                                        {item.conducted > 0 ? `${item.percentage}%` : '-'}
                                                    </td>
                                                    <td className="py-2.5 px-4">
                                                        {item.conducted > 0 ? (
                                                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-300 ${
                                                                        item.percentage >= 80 ? 'bg-emerald-500' : item.percentage >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                                                    }`}
                                                                    style={{ width: `${item.percentage}%` }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-300">No sessions</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default StudentAttendanceModal;
