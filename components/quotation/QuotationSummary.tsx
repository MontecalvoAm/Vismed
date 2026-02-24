'use client';

import { useRef, useState } from 'react';
import { Download, Edit3, Loader2 } from 'lucide-react';

const fmt = (n: number) => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 });

function getValidUntil(dateStr: string) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function QuotationSummary({ customer, items, onBack }: { customer: any, items: any[], onBack: () => void }) {
    const pdfRef = useRef<HTMLDivElement>(null);
    const [generating, setGenerating] = useState(false);
    const [notes, setNotes] = useState('');

    const grandTotal = items.reduce((sum, i) => sum + i.subtotal, 0);

    const grouped = items.reduce((acc, item) => {
        if (!acc[item.deptName]) acc[item.deptName] = [];
        acc[item.deptName].push(item);
        return acc;
    }, {});

    const handleDownload = async () => {
        setGenerating(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');

            const el = pdfRef.current;
            if (!el) throw new Error("PDF ref is null");

            const canvas = await html2canvas(el, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const imgW = pageW;
            const imgH = (canvas.height * imgW) / canvas.width;

            let yOffset = 0;
            let remaining = imgH;

            while (remaining > 0) {
                const sliceH = Math.min(pageH, remaining);
                pdf.addImage(imgData, 'PNG', 0, -yOffset, imgW, imgH);
                remaining -= pageH;
                yOffset += pageH;
                if (remaining > 0) pdf.addPage();
            }

            pdf.save(`VisayasMed-Quotation-${customer.quotationNo}.pdf`);
        } catch (err) {
            console.error('PDF generation error:', err);
            alert('PDF generation failed. Please ensure jsPDF and html2canvas are installed.');
        }
        setGenerating(false);
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl mb-2">
                <button type="button" className="w-full sm:w-auto px-5 py-2.5 flex items-center justify-center font-medium bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg shadow-sm transition-all focus:outline-none" onClick={onBack}>
                    <Edit3 className="w-4 h-4 mr-2" /> Edit Services
                </button>
                <div className="w-full sm:w-auto flex-grow flex items-center justify-center sm:justify-end gap-2 text-sm text-slate-500 hidden md:flex mx-4 border-l border-slate-200 pl-4">
                    Review the document below. The displayed PDF matches exactly what will be downloaded.
                </div>
                <button
                    type="button"
                    className="w-full sm:w-auto px-6 py-2.5 flex items-center justify-center font-medium bg-primary text-white hover:bg-primary/90 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed"
                    onClick={handleDownload}
                    disabled={generating}
                >
                    {generating ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating PDF...</>
                    ) : (
                        <><Download className="w-4 h-4 mr-2" /> Download Document</>
                    )}
                </button>
            </div>

            {/* Notes Input Field */}
            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Special Instructions / Additional Notes</label>
                <textarea
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none shadow-inner"
                    rows={2}
                    placeholder="e.g. Patient requests morning schedule, insurance coverage details, etc. (This will be included at the bottom of the PDF)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>

            {/* PDF PREVIEW FRAME */}
            <div className="bg-slate-200/50 p-4 sm:p-8 rounded-2xl flex justify-center border border-slate-200/50 shadow-inner overflow-x-auto print:p-0 print:border-none print:shadow-none print:bg-white">
                <div
                    ref={pdfRef}
                    className="bg-white border text-sm border-slate-300 shadow-xl print:shadow-none text-black mx-auto w-full max-w-[210mm] min-h-[297mm] box-border p-[15mm] shrink-0 font-sans"
                    style={{
                        // 210mm is A4 width. Forcing layout limits inside preview to mimic PDF page scaling exactly.
                        width: '210mm',
                        minHeight: '297mm',
                    }}
                >
                    {/* Brand Banner */}
                    <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-slate-200">
                        <div className="flex items-center">
                            <img src="/VisayasMedical.png" alt="Logo" className="w-[50px] h-[50px] object-contain mr-4" />
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">VisayasMed Hospital</h1>
                                <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase mt-1">Excellence in Healthcare Since 2001</p>
                            </div>
                        </div>
                        <div className="text-right text-[10px] leading-relaxed text-slate-500">
                            <div>123 Medical Drive, Health City, HC 90210</div>
                            <div>Tel: +1 (555) 123-4567 <span className="mx-1">•</span> info@vismed.com</div>
                            <div className="font-semibold mt-0.5 text-slate-800">www.vismed.com</div>
                        </div>
                    </div>

                    {/* Title & Meta Data */}
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-slate-800 mb-1">MEDICAL SERVICES QUOTATION</h2>
                        </div>
                        <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs min-w-[220px]">
                            <div className="flex justify-between mb-1.5"><span className="text-slate-500 mr-4">Summary No.:</span><strong className="font-mono">{customer.quotationNo}</strong></div>
                            <div className="flex justify-between mb-1.5"><span className="text-slate-500 mr-4">Date Issued:</span><strong>{customer.date}</strong></div>
                            <div className="flex justify-between"><span className="text-slate-500 mr-4">Valid Until:</span><strong>{getValidUntil(customer.date)}</strong></div>
                        </div>
                    </div>

                    {/* Patient Information Grid */}
                    <div className="mb-8">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1">Patient Information</div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                            <div className="flex pb-1 border-b border-slate-100/50"><span className="w-1/3 text-slate-500">Name:</span><strong className="w-2/3 truncate text-slate-900">{customer.name || '—'}</strong></div>
                            <div className="flex pb-1 border-b border-slate-100/50"><span className="w-1/3 text-slate-500">Contact:</span><strong className="w-2/3 truncate text-slate-900">{customer.phone || '—'}</strong></div>

                            <div className="flex pb-1 border-b border-slate-100/50"><span className="w-1/3 text-slate-500">Date of Birth:</span><strong className="w-2/3 text-slate-900">{customer.dob || '—'}</strong></div>
                            <div className="flex pb-1 border-b border-slate-100/50"><span className="w-1/3 text-slate-500">Email:</span><strong className="w-2/3 truncate text-slate-900">{customer.email || '—'}</strong></div>

                            <div className="flex pb-1 border-b border-slate-100/50"><span className="w-1/3 text-slate-500">Gender:</span><strong className="w-2/3 text-slate-900">{customer.gender || '—'}</strong></div>
                            <div className="flex pb-1 border-b border-slate-100/50"><span className="w-1/3 text-slate-500">Physician:</span><strong className="w-2/3 truncate text-slate-900">{customer.physician || '—'}</strong></div>

                            <div className="col-span-2 flex pb-1 border-b border-slate-100/50">
                                <span className="w-[16%] text-slate-500 shrink-0">Address:</span>
                                <strong className="text-slate-900">{customer.address || '—'}</strong>
                            </div>
                            {customer.notes && (
                                <div className="col-span-2 flex pb-1">
                                    <span className="w-[16%] text-slate-500 shrink-0">Remarks:</span>
                                    <strong className="text-slate-900">{customer.notes}</strong>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Services Breakdown Table */}
                    <div className="mb-6">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Service Breakdown</div>
                        <table className="w-full text-sm border-collapse rounded-lg overflow-hidden border border-slate-200">
                            <thead>
                                <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                                    <th className="py-2.5 px-3 text-center w-12 font-semibold text-xs uppercase">#</th>
                                    <th className="py-2.5 px-3 text-left font-semibold text-xs uppercase">Department</th>
                                    <th className="py-2.5 px-3 text-left font-semibold text-xs uppercase w-[35%]">Service Description</th>
                                    <th className="py-2.5 px-3 text-right font-semibold text-xs uppercase">Unit Price</th>
                                    <th className="py-2.5 px-3 text-center font-semibold text-xs uppercase w-20">Qty</th>
                                    <th className="py-2.5 px-3 text-right font-semibold text-xs uppercase w-28">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    let rowNo = 0;
                                    return Object.entries(grouped).map(([deptName, deptItems]: [string, any]) =>
                                        deptItems.map((item: any, _idx: number) => {
                                            rowNo++;
                                            const isEven = rowNo % 2 === 0;
                                            return (
                                                <tr key={item.id} className={`${isEven ? 'bg-slate-50/50' : 'bg-white'} border-b border-slate-100 last:border-0`}>
                                                    <td className="py-3 px-3 text-center text-slate-500 text-xs">{rowNo}</td>
                                                    <td className="py-3 px-3 text-slate-800 font-medium">{item.deptName}</td>
                                                    <td className="py-3 px-3 text-slate-600 truncate max-w-[200px]">{item.serviceName}</td>
                                                    <td className="py-3 px-3 text-right text-slate-600 tabular-nums">{fmt(item.unitPrice)}</td>
                                                    <td className="py-3 px-3 text-center font-medium bg-slate-50/50 tabular-nums">{item.sessions}</td>
                                                    <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">{fmt(item.subtotal)}</td>
                                                </tr>
                                            );
                                        })
                                    );
                                })()}
                            </tbody>
                        </table>
                    </div>

                    {/* Total Summary Rows */}
                    <div className="flex justify-end mb-8">
                        <div className="w-[300px] border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                            <div className="flex justify-between p-3 border-b border-slate-200 text-sm">
                                <span className="text-slate-600 font-medium">Subtotal</span>
                                <strong className="tabular-nums text-slate-900">{fmt(grandTotal)}</strong>
                            </div>
                            <div className="flex justify-between p-3 bg-slate-800 text-white">
                                <span className="font-bold uppercase text-xs tracking-wider mt-0.5">Grand Total</span>
                                <span className="font-black text-lg tabular-nums tracking-tight leading-none">{fmt(grandTotal)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Custom Notes Block */}
                    {notes && (
                        <div className="mb-8">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Additional Instructions</div>
                            <div className="bg-amber-50/50 border border-amber-200/50 rounded-lg p-4 text-sm text-slate-700 italic">
                                "{notes}"
                            </div>
                        </div>
                    )}

                    {/* Terms & Conditions */}
                    <div className="mb-12 pt-6 border-t border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                        <div className="font-bold text-[10px] text-slate-400 uppercase tracking-widest mb-2">Terms & Conditions</div>
                        <ul className="list-disc pl-4 space-y-0.5">
                            <li>This quotation is valid for thirty (30) days from the issued date.</li>
                            <li>Pricing estimates are subject to change without prior notice upon expiration.</li>
                            <li>For services requiring hospitalization or booking, a 50% reservation fee may apply.</li>
                            <li>This quotation does NOT constitute a confirmed medical appointment or prescription.</li>
                        </ul>
                    </div>

                    {/* Signature Area */}
                    <div className="pt-8 border-t-2 border-slate-800 grid grid-cols-3 gap-8 text-center text-xs mt-auto">
                        <div>
                            <div className="h-0 border-b border-slate-400 mb-2 w-full max-w-[150px] mx-auto"></div>
                            <div className="font-medium text-slate-800">Prepared By</div>
                            <div className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-wider">Billing & Accounts</div>
                        </div>
                        <div>
                            <div className="h-0 border-b border-slate-400 mb-2 w-full max-w-[150px] mx-auto"></div>
                            <div className="font-medium text-slate-800">Verified By</div>
                            <div className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-wider">Finance Department</div>
                        </div>
                        <div>
                            <div className="h-0 border-b border-slate-400 mb-2 w-full max-w-[150px] mx-auto"></div>
                            <div className="font-medium text-slate-800 truncate px-2">{customer.name || 'Patient'}</div>
                            <div className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-wider">Patient Signature</div>
                        </div>
                    </div>

                    {/* Absolute Footer Logo for PDF Print tracking */}
                    <div className="mt-8 text-center text-[9px] text-slate-400 font-mono pt-4 border-t border-slate-100 flex justify-between items-center opacity-80">
                        <span>SYS_GEN_ID: {customer.quotationNo}</span>
                        <span>VisayasMed Hospital • Confidential • Do not duplicate without authorization</span>
                    </div>

                </div>
            </div>
        </div>
    );
}
