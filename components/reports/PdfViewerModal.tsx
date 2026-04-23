'use client';

import { useRef, useState } from 'react';
import { Download, X, Loader2 } from 'lucide-react';
import { useConfirm } from '@/context/ConfirmContext';
import { QuotationRecord } from '@/lib/firestore/quotations';
import PdfGeneratorRenderer from './PdfGeneratorRenderer';

interface PdfViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    quotation: QuotationRecord | null;
}

export default function PdfViewerModal({ isOpen, onClose, quotation }: PdfViewerModalProps) {
    const pdfRef = useRef<HTMLDivElement>(null);
    const { alert } = useConfirm();
    const [generating, setGenerating] = useState(false);

    if (!isOpen || !quotation) return null;

    const sysGenId = quotation.id || `VISMED-${Date.now()}`;
    const dateIssued = quotation.CreatedAt ? new Date(quotation.CreatedAt).toISOString() : new Date().toISOString();

    const handleDownload = async () => {
        setGenerating(true);
        try {
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
                scale: 5,
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

            let pdfFilename = `VisayasMed-Quotation-${sysGenId}.pdf`;
            if (quotation.CustomerName) {
                const nameParts = quotation.CustomerName.trim().split(' ');
                const lastName = nameParts.length > 1 ? nameParts.pop() : '';
                const firstName = nameParts.join('_');
                pdfFilename = `${lastName}_${firstName}_Quotation.pdf`.replace(/^_|_$/g, '');
            }

            pdf.save(pdfFilename);
        } catch (err) {
            console.error('PDF generation error:', err);
            await alert({
                title: 'Download Failed',
                message: 'PDF download failed. Please try again.',
                variant: 'danger'
            });
        }
        setGenerating(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#ebeef2] rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col h-[90vh] overflow-hidden border border-slate-700">

                {/* Header Action Bar */}
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 z-20 shadow-sm shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Document Viewer</h2>
                        <p className="text-xs text-slate-500 font-medium font-mono mt-0.5">{sysGenId}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleDownload}
                            disabled={generating}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-dark-blue rounded-xl hover:bg-brand-muted-blue shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {generating ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                            ) : (
                                <><Download className="w-4 h-4" /> Download PDF</>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* PDF Canvas Container */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#ebeef2] relative z-10 custom-scrollbar">
                    <div className="mx-auto shadow-2xl rounded-lg overflow-hidden shrink-0 border border-slate-300 w-fit h-fit">
                        <PdfGeneratorRenderer
                            ref={pdfRef}
                            record={quotation}
                            quotationNo={sysGenId}
                            dateIssued={dateIssued}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
