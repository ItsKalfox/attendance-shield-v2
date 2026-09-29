import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';

const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = 'Are you sure?', 
    message, 
    type = 'delete', // 'delete', 'confirm', 'warning'
    confirmText = 'Confirm',
    cancelText = 'Cancel'
}) => {
    if (!isOpen) return null;

    const isDelete = type === 'delete';
    const isConfirm = type === 'confirm';
    
    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center transform transition-all">
                <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${isDelete ? 'bg-red-100' : isConfirm ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                    {isDelete && <Trash2 className="h-6 w-6 text-red-600" />}
                    {isConfirm && <CheckCircle className="h-6 w-6 text-emerald-600" />}
                    {!isDelete && !isConfirm && <AlertTriangle className="h-6 w-6 text-amber-600" />}
                </div>
                
                <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 mb-6">{message}</p>
                
                <div className="flex gap-3 w-full">
                    <button 
                        onClick={onClose}
                        className="flex-1 btn btn-secondary py-2 border-slate-200"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 btn py-2 ${isDelete ? 'btn-danger' : isConfirm ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25 border-transparent' : 'btn-primary'}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmModal;
