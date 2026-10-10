import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Copy, Check, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const QRCodeModal = ({ qrToken, session, onClose }) => {
    const [copied, setCopied] = useState(false);

    const { handleBackdropClick } = useModalDismiss({
        onClose,
        isDirty: false
    });
    
    // Construct the absolute URL that the attendee will scan
    const attendUrl = `${window.location.origin}/attend/${qrToken}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(attendUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExportPDF = () => {
        if (!session) return;
        
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text('Session Attendance QR', 14, 22);
        
        const tableData = [
            ['Module Code', session.courseId?.code || '-'],
            ['Module Name', session.courseId?.name || '-'],
            ['Instructor', `${session.instructorId?.userId?.firstName || ''} ${session.instructorId?.userId?.lastName || ''}`.trim()],
            ['Start Time', new Date(session.startTime).toLocaleString()],
            ['End Time', new Date(session.expiresAt).toLocaleString()],
        ];
        
        autoTable(doc, {
            startY: 30,
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 11, cellPadding: 5 },
            columnStyles: {
                0: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 50, textColor: [30, 41, 59] },
                1: { cellWidth: 130, textColor: [71, 85, 105] }
            }
        });
        
        // Get QR Code Image
        const canvas = document.getElementById('session-qr-canvas');
        if (canvas) {
            const imgData = canvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 14, doc.lastAutoTable.finalY + 15, 70, 70);
            
            // Add link below QR
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(attendUrl, 14, doc.lastAutoTable.finalY + 95);
        }
        
        doc.save(`QR_${session.courseId?.code || 'Session'}_${new Date(session.startTime).toISOString().split('T')[0]}.pdf`);
    };

    return createPortal(
        <div onClick={handleBackdropClick} className="modal-overlay z-[100] cursor-default">
            <div onClick={handleBackdropClick} className="modal-container">
                <div className="modal-content max-w-sm text-center relative">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition bg-slate-100 hover:bg-slate-200 p-1 rounded-full"
                    >
                        <X size={20} />
                    </button>
                    
                    <h2 className="text-xl font-bold mb-2 text-slate-800">Session Created!</h2>
                    <p className="text-slate-500 mb-6 text-sm">
                        Display this QR code for students to scan, or share the link directly.
                    </p>
                    
                    <div className="bg-white p-4 rounded-xl inline-block mb-6 shadow-sm border border-slate-200">
                        <QRCodeCanvas 
                            id="session-qr-canvas"
                            value={attendUrl}
                            size={200}
                            level="H"
                            includeMargin={false}
                        />
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg p-3 mb-4 border border-slate-200 flex items-center justify-between">
                        <span className="text-xs text-slate-500 truncate mr-3 font-mono">
                            {attendUrl}
                        </span>
                        <button 
                            onClick={handleCopy}
                            className="text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 p-1.5 rounded transition shrink-0"
                            title="Copy link"
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>

                    <button 
                        className="btn btn-outline w-full mb-3 flex items-center justify-center"
                        onClick={handleExportPDF}
                    >
                        <Download size={18} className="mr-2" />
                        Export QR to PDF
                    </button>

                    <button 
                        className="btn btn-primary w-full"
                        onClick={onClose}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default QRCodeModal;
