'use client';

import React, { useRef, useState } from 'react';
import { Download, Printer, Loader2, X } from 'lucide-react';
import { useConfirm } from '@/context/ConfirmContext';
import GuarantorPdfRenderer from '@/components/manage/GuarantorPdfRenderer';
import { QuotationRecord } from '@/lib/firestore/quotations';
import { GuarantorRecord } from '@/lib/firestore/guarantors';

interface GuarantorReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    guarantor: GuarantorRecord | null;
    quotations: QuotationRecord[];
    filterDate?: string;
    preparedBy?: string;
}

export default function GuarantorReportModal({
    isOpen,
    onClose,
    guarantor,
    quotations,
    filterDate,
    preparedBy
}: GuarantorReportModalProps) {
    const pdfRef = useRef<HTMLDivElement>(null);
    const { alert } = useConfirm();
    const [generating, setGenerating] = useState(false);

    if (!isOpen || !guarantor) return null;

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
            scale: 4, // 4 to optimize memory vs quality
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
            const dateStr = filterDate || 'All';
            const pdfFilename = `${guarantor.Name.replace(/\s+/g, '_')}_Quotations_${dateStr}.pdf`;
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm sm:p-6 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-[900px] flex flex-col my-auto max-h-[95vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">Guarantor Print Report</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content - Scrollable PDF container */}
                <div className="p-6 bg-slate-200/50 overflow-y-auto flex-grow flex justify-center">
                    <div className="relative shadow-xl ring-1 ring-black/5">
                        <GuarantorPdfRenderer
                            ref={pdfRef}
                            guarantor={guarantor}
                            quotations={quotations}
                            filterDate={filterDate}
                            preparedBy={preparedBy}
                            notes={`This report includes ${quotations.length} total quotation(s) associated with Guarantor: ${guarantor.Name}.`}
                        />
                    </div>
                </div>

                {/* Footer Action Bar */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        disabled={generating}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveAndPrint}
                        disabled={generating || quotations.length === 0}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                        Print
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={generating || quotations.length === 0}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-brand-dark-blue text-white rounded-xl hover:bg-brand-muted-blue transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Download PDF
                    </button>
                </div>
            </div>
        </div>
    );
}
