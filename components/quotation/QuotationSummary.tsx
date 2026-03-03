'use client';

import { useRef, useState } from 'react';
import { Download, Edit3, Loader2, FileText, Printer } from 'lucide-react';
import { useConfirm } from '@/context/ConfirmContext';
import PdfGeneratorRenderer from '../history/PdfGeneratorRenderer';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { determineSessionType, determineInitialStatus } from '@/lib/utils/quotationStatus';

export default function QuotationSummary({
    customer, items, onBack, preparedBy, isEditing, editId
}: { customer: any; items: any[]; onBack: () => void; preparedBy?: string; isEditing?: boolean; editId?: string }) {
    const pdfRef = useRef<HTMLDivElement>(null);
    const { alert } = useConfirm();
    const [generating, setGenerating] = useState(false);
    const [notes, setNotes] = useState('');
    const [feedback, setFeedback] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

    const grandTotal = items.reduce((sum, i) => sum + i.subtotal, 0);

    // Determine session type and initial status using utility functions
    // Status is only auto-completed for Pharmacy items with quantity <= 1
    const itemsForStatus = items.map(i => ({ Department: i.deptName, Quantity: i.sessions }));
    const sessionType = determineSessionType(itemsForStatus);
    const finalStatus = determineInitialStatus(itemsForStatus);

    // Prepare standard record format for the renderer
    const recordFormat = {
        DocumentNo: customer.quotationNo || '',
        GuarantorId: customer.guarantorId || null,
        GuarantorName: customer.guarantorName || null,
        SessionType: sessionType,
        PaymentStatus: 'Unpaid' as const,
        CustomerFirstName: customer.firstName || '',
        CustomerMiddleName: customer.middleName || '',
        CustomerLastName: customer.lastName || '',
        CustomerName: [customer.firstName, customer.middleName, customer.lastName].filter(Boolean).join(' '),
        CustomerDob: customer.dob || '',
        CustomerGender: customer.gender || '',
        CustomerEmail: customer.email || '',
        CustomerPhone: customer.phone || '',
        CustomerAddress: customer.address || '',
        CustomerNotes: customer.notes || '',
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
        Status: finalStatus,
    };

    const saveRecord = async () => {
        try {
            if (isEditing && editId) {
                const { updateQuotation } = await import('@/lib/firestore/quotations');
                const { createAuditLog } = await import('@/lib/firestore/audit');
                await updateQuotation(editId, recordFormat);
                await createAuditLog({
                    Action: 'Edited Quotation',
                    Module: 'Quotation',
                    RecordID: editId,
                    Description: `Updated Quotation Document No: ${recordFormat.DocumentNo || editId}`
                });
            } else {
                const { addQuotation } = await import('@/lib/firestore/quotations');
                await addQuotation(recordFormat);
            }
            return true;
        } catch (dbErr) {
            console.error('Quiet fail on DB save for quotation:', dbErr);
            return false;
        }
    };

    const generatePdfInstance = async () => {
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

        return pdf;
    };

    const handleDownload = async () => {
        setGenerating(true);
        try {
            const pdf = await generatePdfInstance();

            let pdfFilename = `VisayasMed-Quotation-${customer.quotationNo}.pdf`;
            if (customer.lastName && customer.firstName) {
                pdfFilename = `${customer.lastName}_${customer.firstName}_Quotation.pdf`.replace(/\s+/g, '_');
            }

            pdf.save(pdfFilename);

            const saved = await saveRecord();
            if (saved) {
                setFeedback({ isOpen: true, type: 'success', title: 'Saved', message: 'Quotation saved successfully.' });
            } else {
                setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'Quotation document generated but failed to save to database.' });
            }
        } catch (err) {
            console.error('PDF generation error:', err);
            await alert({
                title: 'PDF Generation Failed',
                message: 'An error occurred while building the PDF instance. Please try again.',
                variant: 'danger'
            });
            setFeedback({ isOpen: true, type: 'error', title: 'Failed', message: 'Could not generate PDF download.' });
        }
        setGenerating(false);
    };

    const handleSaveAndPrint = async () => {
        setGenerating(true);
        try {
            const saved = await saveRecord();
            if (saved) {
                const pdf = await generatePdfInstance();

                // Embed javascript in the PDF to auto-print when opened
                pdf.autoPrint();

                // Use a hidden iframe to silently trigger the print dialog
                const stringPdf = pdf.output('bloburl');
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = stringPdf.toString();

                document.body.appendChild(iframe);

                // Set the feedback status immediately
                setFeedback({ isOpen: true, type: 'success', title: 'Saved & Printed', message: 'Quotation saved and ready for printing.' });

                // Optional: clean up the iframe after some time
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                }, 300000); // 5 minutes to ensure printing succeeds before removal

            } else {
                setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to save to database. Printing aborted.' });
            }
        } catch (err) {
            console.error('PDF generation/print error:', err);
            await alert({
                title: 'Print Failed',
                message: 'An error occurred while preparing the document for printing. Please try again.',
                variant: 'danger'
            });
            setFeedback({ isOpen: true, type: 'error', title: 'Failed', message: 'Could not process PDF for printing.' });
        }
        setGenerating(false);
    };

    return (
        <div className="flex flex-col gap-5 relative z-10">
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
                        <span>Review the document above before saving or downloading.</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 mt-3 sm:mt-0">
                    <button
                        type="button"
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                        onClick={handleSaveAndPrint}
                        disabled={generating}
                    >
                        {generating ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                        ) : (
                            <><Printer className="w-4 h-4" /> Save & Print</>
                        )}
                    </button>
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

            <FeedbackModal
                isOpen={feedback.isOpen}
                type={feedback.type}
                title={feedback.title}
                message={feedback.message}
                onClose={() => setFeedback(f => ({ ...f, isOpen: false }))}
            />
        </div>
    );
}
