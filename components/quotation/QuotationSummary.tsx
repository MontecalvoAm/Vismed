'use client';

import { useRef, useState } from 'react';
import { Download, Edit3, Loader2, FileText } from 'lucide-react';

const fmt = (n: number) => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 });

function getValidUntil(dateStr: string) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function QuotationSummary({ customer, items, onBack }: { customer: any; items: any[]; onBack: () => void }) {
    const pdfRef = useRef<HTMLDivElement>(null);
    const [generating, setGenerating] = useState(false);
    const [notes, setNotes] = useState('');

    const grandTotal = items.reduce((sum, i) => sum + i.subtotal, 0);

    const grouped: Record<string, any[]> = items.reduce((acc, item) => {
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

            pdf.save(`VisayasMed-Quotation-${customer.quotationNo}.pdf`);
        } catch (err) {
            console.error('PDF generation error:', err);
            alert('PDF generation failed. Please try again.');
        }
        setGenerating(false);
    };

    return (
        <div className="flex flex-col gap-5">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-4 border border-slate-200 rounded-2xl">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>Review the document below before downloading.</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm"
                        onClick={onBack}
                    >
                        <Edit3 className="w-4 h-4" /> Edit Services
                    </button>
                    <button
                        type="button"
                        className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-primary text-white rounded-xl hover:bg-primary/90 focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
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
            <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
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
            <div className="bg-slate-200/60 p-4 sm:p-8 rounded-2xl border border-slate-200 overflow-x-auto shadow-inner">
                <div
                    ref={pdfRef}
                    style={{
                        margin: '0 auto',
                        width: '816px',
                        minWidth: '816px',
                        minHeight: '1246px',
                        padding: '50px 57px',
                        boxSizing: 'border-box',
                        background: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        fontSize: '10px',
                        lineHeight: '1.55',
                        color: '#1e293b',
                        fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                >
                    {/* ── HEADER ── */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '7mm', borderBottom: '2.5px solid #0f172a', marginBottom: '6mm' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/VisayasMedical.png" alt="Logo" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
                            <div>
                                <div style={{ fontSize: '17px', fontWeight: '900', letterSpacing: '-0.4px', color: '#0f172a', textTransform: 'uppercase' }}>VisayasMed Hospital</div>
                                <div style={{ fontSize: '8px', color: '#64748b', fontWeight: '600', letterSpacing: '1.2px', textTransform: 'uppercase', marginTop: '2px' }}>Excellence in Healthcare Since 2001</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '8.5px', color: '#64748b', lineHeight: '1.7' }}>
                            <div>123 Medical Drive, Health City, HC 90210</div>
                            <div>Tel: +63 (32) 123-4567 · info@vismed.com</div>
                            <div style={{ fontWeight: '700', color: '#334155' }}>www.vismed.com</div>
                        </div>
                    </div>

                    {/* ── TITLE + META ── */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '5mm' }}>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.2px' }}>Medical Services Quotation</div>
                        </div>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '5px', padding: '6px 10px', fontSize: '8.5px', minWidth: '190px' }}>
                            {[['Quotation No.', customer.quotationNo], ['Date Issued', customer.date], ['Valid Until', getValidUntil(customer.date)]].map(([l, v]) => (
                                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                    <span style={{ color: '#64748b' }}>{l}:</span>
                                    <strong style={{ fontFamily: l === 'Quotation No.' ? 'monospace' : 'inherit' }}>{v}</strong>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── PATIENT INFO ── */}
                    <div style={{ marginBottom: '5mm' }}>
                        <div style={{ fontSize: '7.5px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', paddingBottom: '3px', borderBottom: '1px solid #e2e8f0', marginBottom: '4px' }}>Patient Information</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 20px' }}>
                            {[
                                ['Patient Name', customer.name],
                                ['Contact Number', customer.phone],
                                ['Date of Birth', customer.dob],
                                ['Email Address', customer.email],
                                ['Gender', customer.gender],
                                ['Attending Physician', customer.physician],
                            ].map(([label, value]) => (
                                <div key={label} style={{ display: 'flex', paddingBottom: '3px', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ color: '#64748b', width: '44%', flexShrink: 0, fontSize: '9px' }}>{label}:</span>
                                    <strong style={{ color: '#0f172a', wordBreak: 'break-word', fontSize: '9px' }}>{value || '—'}</strong>
                                </div>
                            ))}
                            {customer.address && (
                                <div style={{ gridColumn: 'span 2', display: 'flex', paddingBottom: '3px', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ color: '#64748b', width: '22%', flexShrink: 0, fontSize: '9px' }}>Address:</span>
                                    <strong style={{ color: '#0f172a', wordBreak: 'break-word', fontSize: '9px' }}>{customer.address}</strong>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── SERVICES TABLE — flex-grow fills remaining space ── */}
                    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', marginBottom: '5mm' }}>
                        <div style={{ fontSize: '7.5px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>Service Breakdown</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9', color: '#475569' }}>
                                    {['#', 'Department', 'Service Description', 'Unit Price', 'Qty', 'Amount'].map((h, i) => (
                                        <th key={h} style={{
                                            padding: '5px 7px',
                                            fontSize: '8px',
                                            fontWeight: '700',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            borderBottom: '1px solid #e2e8f0',
                                            textAlign: [0, 4].includes(i) ? 'center' : [3, 5].includes(i) ? 'right' : 'left',
                                            width: i === 0 ? '24px' : i === 2 ? '36%' : i === 4 ? '36px' : i === 5 ? '80px' : undefined,
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    let rowNo = 0;
                                    return Object.entries(grouped).map(([, deptItems]) =>
                                        deptItems.map((item: any) => {
                                            rowNo++;
                                            return (
                                                <tr key={item.id} style={{ background: rowNo % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                                    <td style={{ padding: '5px 7px', textAlign: 'center', color: '#94a3b8', borderBottom: '1px solid #f1f5f9', fontSize: '9px' }}>{rowNo}</td>
                                                    <td style={{ padding: '5px 7px', color: '#334155', fontWeight: '600', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', fontSize: '9px' }}>{item.deptName}</td>
                                                    <td style={{ padding: '5px 7px', color: '#475569', borderBottom: '1px solid #f1f5f9', wordBreak: 'break-word', fontSize: '9px' }}>{item.serviceName}</td>
                                                    <td style={{ padding: '5px 7px', textAlign: 'right', color: '#475569', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', fontSize: '9px' }}>{fmt(item.unitPrice)}</td>
                                                    <td style={{ padding: '5px 7px', textAlign: 'center', fontWeight: '600', borderBottom: '1px solid #f1f5f9', fontSize: '9px' }}>{item.sessions}</td>
                                                    <td style={{ padding: '5px 7px', textAlign: 'right', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', fontSize: '9px' }}>{fmt(item.subtotal)}</td>
                                                </tr>
                                            );
                                        })
                                    );
                                })()}
                            </tbody>
                        </table>

                        {/* Totals — right-aligned under table */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4mm' }}>
                            <div style={{ width: '240px', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', fontSize: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                    <span style={{ color: '#64748b', fontWeight: '500' }}>Subtotal</span>
                                    <strong>{fmt(grandTotal)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', background: '#0f172a', color: '#fff' }}>
                                    <span style={{ fontWeight: '700', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Grand Total</span>
                                    <strong style={{ fontSize: '13px', fontWeight: '900', letterSpacing: '-0.5px' }}>{fmt(grandTotal)}</strong>
                                </div>
                            </div>
                        </div>

                        {/* Special Notes */}
                        {notes && (
                            <div style={{ marginTop: '4mm', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '5px', padding: '7px 10px', fontSize: '9px', color: '#78350f' }}>
                                <div style={{ fontWeight: '700', fontSize: '7.5px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px', color: '#92400e' }}>Special Instructions</div>
                                {notes}
                            </div>
                        )}
                    </div>

                    {/* ── FOOTER BLOCK — pinned to bottom via margin-top: auto from flex-grow above ── */}
                    <div style={{ borderTop: '1.5px solid #e2e8f0', paddingTop: '4mm' }}>
                        {/* Terms */}
                        <div style={{ marginBottom: '5mm', fontSize: '8.5px', color: '#64748b', lineHeight: '1.65' }}>
                            <div style={{ fontWeight: '700', fontSize: '7.5px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px', color: '#94a3b8' }}>Terms &amp; Conditions</div>
                            <ul style={{ paddingLeft: '14px', margin: 0, listStyleType: 'disc' }}>
                                <li>This quotation is valid for thirty (30) days from the issued date.</li>
                                <li>Pricing estimates are subject to change without prior notice upon expiration.</li>
                                <li>For services requiring hospitalization, a 50% reservation fee may apply.</li>
                                <li>This quotation does NOT constitute a confirmed medical appointment or prescription.</li>
                            </ul>
                        </div>

                        {/* Signatures */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10mm', textAlign: 'center', fontSize: '9px', paddingTop: '5mm', borderTop: '2px solid #0f172a', marginBottom: '4mm' }}>
                            {[
                                { main: 'Prepared By', sub: 'Billing & Accounts' },
                                { main: 'Verified By', sub: 'Finance Department' },
                                { main: customer.name || 'Patient', sub: 'Patient Signature' },
                            ].map(({ main, sub }, i) => (
                                <div key={i}>
                                    <div style={{ borderBottom: '1px solid #94a3b8', marginBottom: '5px', height: '20px' }} />
                                    <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '9px' }}>{main}</div>
                                    <div style={{ color: '#94a3b8', fontSize: '7.5px', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>{sub}</div>
                                </div>
                            ))}
                        </div>

                        {/* System Footer */}
                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '3mm', display: 'flex', justifyContent: 'space-between', fontSize: '7.5px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                            <span>SYS_GEN_ID: {customer.quotationNo}</span>
                            <span>VisayasMed Hospital · Confidential · Do not duplicate without authorization</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
