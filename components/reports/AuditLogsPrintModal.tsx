'use client';

import React, { useRef, useState } from 'react';
import { Download, Printer, Loader2, X, FileText } from 'lucide-react';
import { useConfirm } from '@/context/ConfirmContext';
import AuditLogsPrintRenderer from './AuditLogsPrintRenderer';

interface AuditLogsPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    group: any;
    preparedBy: string;
}

export default function AuditLogsPrintModal({
    isOpen,
    onClose,
    group,
    preparedBy
}: AuditLogsPrintModalProps) {
    const pdfRef = useRef<HTMLDivElement>(null);
    const { alert } = useConfirm();
    const [generating, setGenerating] = useState(false);

    if (!isOpen || !group) return null;

    const generatePdfInstance = async () => {
        const html2canvas = (await import('html2canvas')).default;
        const { jsPDF } = await import('jspdf');

        const el = pdfRef.current;
        if (!el) throw new Error('PDF ref is null');

        // Bond paper: 215.9mm × 330.2mm
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [215.9, 330.2] });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();

        const fullWidth = 816;
        const fullHeight = el.scrollHeight;

        const canvas = await html2canvas(el, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            width: fullWidth,
            height: fullHeight,
            windowWidth: fullWidth,
            windowHeight: fullHeight,
            x: 0,
            y: 0,
            logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        const imgW = pageW;
        const imgH = (canvas.height * imgW) / canvas.width;

        let yOffset = 0;
        let remaining = imgH;
        while (remaining > 0) {
            pdf.addImage(imgData, 'PNG', 0, -yOffset, imgW, imgH);
            remaining -= pageH;
            yOffset += pageH;
            if (remaining > 0) pdf.addPage();
        }

        return pdf;
    };

    const handleDownload = async () => {
        setGenerating(true);
        try {
            const pdf = await generatePdfInstance();
            const pdfFilename = `AuditLogs_Quotation_${group.recordId}.pdf`.replace(/\s+/g, '_');
            pdf.save(pdfFilename);
        } catch (err) {
            console.error('PDF generation error:', err);
            await alert({
                title: 'PDF Generation Failed',
                message: 'Could not generate PDF download.',
                variant: 'danger'
            });
        }
        setGenerating(false);
    };

    const handleSaveAndPrint = async () => {
        setGenerating(true);
        try {
            const pdf = await generatePdfInstance();
            pdf.autoPrint();

            const stringPdf = pdf.output('bloburl');
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = stringPdf.toString();

            document.body.appendChild(iframe);

            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            }, 300000);
        } catch (err) {
            console.error('PDF print error:', err);
            await alert({
                title: 'Print Failed',
                message: 'Could not process PDF for printing.',
                variant: 'danger'
            });
        }
        setGenerating(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm sm:p-6 overflow-y-auto">
            <div className="bg-slate-50 rounded-2xl shadow-xl w-full max-w-[1000px] flex flex-col my-auto max-h-[95vh] overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-brand-light-grey/50">
                            <FileText className="w-5 h-5 text-brand-dark-blue" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Print History Logs</h2>
                            <p className="text-xs text-slate-500 font-medium">Quotation #: {group.recordId}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content - Scrollable PDF container */}
                <div className="p-6 bg-slate-200/50 overflow-y-auto flex-grow flex justify-center">
                    <div className="relative shadow-xl ring-1 ring-black/5 bg-white rounded-xl overflow-hidden">
                        <AuditLogsPrintRenderer
                            ref={pdfRef}
                            group={group}
                            preparedBy={preparedBy}
                        />
                    </div>
                </div>

                {/* Footer Action Bar */}
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-2 text-sm text-slate-500 hidden sm:flex">
                        <FileText className="w-4 h-4 text-brand-muted-blue" />
                        <span>Review the document above before printing or downloading.</span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl transition-all shadow-sm w-full sm:w-auto"
                            disabled={generating}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveAndPrint}
                            disabled={generating || group.logs.length === 0}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                            {generating ? 'Processing...' : 'Print'}
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={generating || group.logs.length === 0}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-brand-dark-blue text-white rounded-xl hover:bg-brand-muted-blue focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark-blue transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            {generating ? 'Processing...' : 'Download PDF'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
