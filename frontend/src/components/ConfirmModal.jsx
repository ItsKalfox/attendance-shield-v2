import React from 'react';
import { createPortal } from 'react-dom';
import { useModalDismiss } from '../hooks/useModalDismiss';
import { AlertTriangle, CheckCircle, Trash2, LogOut } from 'lucide-react';

const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = 'Are you sure?', 
    message, 
    type = 'delete', // 'delete', 'confirm', 'warning', 'logout', 'danger'
    confirmText = 'Confirm',
    cancelText = 'Cancel'
}) => {
    const { handleBackdropClick } = useModalDismiss({
        onClose,
        isDirty: false
    });

    if (!isOpen) return null;

    const isLogout = type === 'logout';
    const isDelete = type === 'delete' || type === 'danger' || isLogout;
    const isConfirm = type === 'confirm';
    
    return createPortal(
        <div onClick={handleBackdropClick} className="modal-overlay z-[110] cursor-default">
            <div className="modal-content max-w-sm text-center">
                <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${isDelete ? 'bg-red-100' : isConfirm ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                    {isLogout && <LogOut className="h-6 w-6 text-red-600" />}
                    {!isLogout && (type === 'delete' || type === 'danger') && <Trash2 className="h-6 w-6 text-red-600" />}
                    {isConfirm && <CheckCircle className="h-6 w-6 text-emerald-600" />}
                    {!isDelete && !isConfirm && <AlertTriangle className="h-6 w-6 text-amber-600" />}
                </div>
                
                <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 mb-6">{message}</p>
                
                <div className="flex gap-3 w-full">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl transition active:scale-95 shadow-sm ${
                            isDelete 
                                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 border-0' 
                                : isConfirm 
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25 border-0' 
                                    : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/25 border-0'
                        }`}
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
