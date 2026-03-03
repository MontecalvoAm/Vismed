import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface FeedbackModalProps {
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
    isOpen,
    type,
    title,
    message,
    onClose,
}) => {
    if (!isOpen) return null;

    const isSuccess = type === 'success';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl transform animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center space-y-4">
                    {/* Icon */}
                    <div className={`p-4 rounded-full ${isSuccess ? 'bg-teal-50' : 'bg-red-50'}`}>
                        {isSuccess ? (
                            <CheckCircle2 className="w-12 h-12 text-teal-600" />
                        ) : (
                            <XCircle className="w-12 h-12 text-red-600" />
                        )}
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-slate-800">
                            {title}
                        </h3>
                        <p className="text-sm text-slate-500">
                            {message}
                        </p>
                    </div>

                    {/* Action */}
                    <button
                        onClick={onClose}
                        className={`mt-6 w-full py-2.5 px-4 rounded-xl font-semibold text-white transition-all active:scale-[0.98] ${isSuccess
                                ? 'bg-teal-600 hover:bg-teal-700'
                                : 'bg-slate-800 hover:bg-slate-900'
                            }`}
                    >
                        Okay
                    </button>
                </div>
            </div>
        </div>
    );
};
