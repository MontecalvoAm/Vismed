'use client';

import { useRef, useState } from 'react';
import { Download, Edit3, Loader2, FileText } from 'lucide-react';
import PdfGeneratorRenderer from '../history/PdfGeneratorRenderer';

export default function QuotationSummary({ customer, items, onBack, preparedBy }: { customer: any; items: any[]; onBack: () => void; preparedBy?: string }) {
    const pdfRef = useRef<HTMLDivElement>(null);
    const [generating, setGenerating] = useState(false);
    const [notes, setNotes] = useState('');

    const grandTotal = items.reduce((sum, i) => sum + i.subtotal, 0);

    // Prepare standard record format for the renderer
    const recordFormat = {
        CustomerName: customer.name || 'Unknown',
        CustomerEmail: customer.email || '',
        CustomerPhone: customer.phone || '',
        HospitalName: 'VisayasMed Hospital',
        PreparedBy: preparedBy || '',
        Items: items.map((i) => ({
            Id: i.id || Math.random().toString(),
            Name: i.serviceName,
            Department: i.deptName,
            Price: i.unitPrice,
            Quantity: i.sessions,
            Unit: i.unit || '',
        })),
        Subtotal: grandTotal,
        Vat: 0,
        Total: grandTotal,
        Status: 'Incomplete' as const,
    };

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

            // Use fixed width to avoid capturing extra horizontal space
            const fullWidth = 816;
            const fullHeight = el.scrollHeight;

            const canvas = await html2canvas(el, {
                scale: 3,
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

            let pdfFilename = `VisayasMed-Quotation-${customer.quotationNo}.pdf`;
            if (customer.name) {
                const nameParts = customer.name.trim().split(' ');
                const lastName = nameParts.length > 1 ? nameParts.pop() : '';
                const firstName = nameParts.join('_');
                pdfFilename = `${lastName}_${firstName}_Quotation.pdf`.replace(/^_|_$/g, '');
            }

            pdf.save(pdfFilename);

            try {
                const { addQuotation } = await import('@/lib/firestore/quotations');
                await addQuotation(recordFormat);
            } catch (dbErr) {
                console.error('Quiet fail on DB save for quotation:', dbErr);
            }
        } catch (err) {
            console.error('PDF generation error:', err);
            alert('PDF generation failed. Please try again.');
        }
        setGenerating(false);
    };

    return (
        <div className="flex flex-col gap-5 relative z-10">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white/95 backdrop-blur border border-slate-300 rounded-2xl p-4 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
                    <button
                        type="button"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm shrink-0"
                        onClick={onBack}
                    >
                        <Edit3 className="w-4 h-4" /> Edit Services
                    </button>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <FileText className="w-4 h-4 text-brand-muted-blue" />
                        <span>Review the document below before downloading.</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 mt-3 sm:mt-0">
                    <button
                        type="button"
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-brand-dark-blue text-white rounded-xl hover:bg-brand-muted-blue focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark-blue transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                        onClick={handleDownload}
                        disabled={generating}
                    >
                        {generating ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                        ) : (
                            <><Download className="w-4 h-4" /> Download PDF</>
                        )}
                    </button>
                </div>
            </div>

            {/* Notes */}
            <div className="bg-white/95 backdrop-blur p-4 border border-slate-300 rounded-xl shadow-md">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Special Instructions (optional)</label>
                <textarea
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                    rows={2}
                    placeholder="e.g. Patient requests morning schedule, insurance details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>

            {/* ══════════════════════════════════════════
                PDF DOCUMENT — Bond Paper 816px (215.9mm at 96dpi)
                Uses flex-column so footer is always at bottom
               ══════════════════════════════════════════ */}
            <div className="bg-brand-light-grey/40 p-4 sm:p-8 rounded-2xl border border-slate-300 overflow-x-auto shadow-inner relative z-10 backdrop-blur-md">
                <PdfGeneratorRenderer
                    ref={pdfRef}
                    record={recordFormat}
                    notes={notes}
                    quotationNo={customer.quotationNo}
                    dateIssued={customer.date}
                />
            </div>
        </div>
    );
}
