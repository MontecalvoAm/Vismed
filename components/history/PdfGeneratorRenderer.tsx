'use client';

import React, { forwardRef } from 'react';
import { QuotationRecord, QuotationItem } from '@/lib/firestore/quotations';

const fmt = (n: number) => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 });

function getValidUntil(dateStr?: string) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

interface PdfGeneratorRendererProps {
    record: QuotationRecord;
    notes?: string;
    quotationNo?: string;
    dateIssued?: string;
}

const PdfGeneratorRenderer = forwardRef<HTMLDivElement, PdfGeneratorRendererProps>(
    ({ record, notes, quotationNo, dateIssued }, ref) => {
        const items = record.Items || [];
        const grandTotal = record.Total || 0;
        const preparedBy = record.PreparedBy || '—';

        const sysGenId = quotationNo || record.id || `VISMED-${Date.now()}`;
        // Fallback date to creation date if dateIssued is not provided (used for redownloads)
        const dateString = dateIssued || (record.CreatedAt ? new Date(record.CreatedAt).toISOString() : new Date().toISOString());
        const displayDate = new Date(dateString).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

        const grouped: Record<string, QuotationItem[]> = items.reduce((acc, item) => {
            if (!acc[item.Department]) acc[item.Department] = [];
            acc[item.Department].push(item);
            return acc;
        }, {} as Record<string, QuotationItem[]>);

        return (
            <div
                ref={ref}
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
                    fontSize: '11.5px',
                    lineHeight: '1.55',
                    color: '#1e293b',
                    fontFamily: 'Inter, system-ui, sans-serif',
                }}
            >
                {/* ── HEADER ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '7mm', borderBottom: '2.5px solid #0f172a', marginBottom: '6mm' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/VisayasMedical.png" alt="Logo" style={{ width: '54px', height: '54px', objectFit: 'contain' }} />
                        <div>
                            <div style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '-0.4px', color: '#000000', textTransform: 'uppercase' }}>VisayasMed Hospital</div>
                            <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: '600', letterSpacing: '1.2px', textTransform: 'uppercase', marginTop: '2px' }}>Excellence in Healthcare Since 2001</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '10px', color: '#64748b', lineHeight: '1.7' }}>
                        <div>123 Medical Drive, Health City, HC 90210</div>
                        <div>Tel: +63 (32) 123-4567 · info@vismed.com</div>
                        <div style={{ fontWeight: '700', color: '#334155' }}>www.vismed.com</div>
                    </div>
                </div>

                {/* ── TITLE + META ── */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '5mm' }}>
                    <div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.2px' }}>Medical Services Quotation</div>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '5px', padding: '8px 12px', fontSize: '10px', minWidth: '220px' }}>
                        {[['Quotation No.', sysGenId], ['Date Issued', displayDate], ['Valid Until', getValidUntil(dateString)]].map(([l, v]) => (
                            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                <span style={{ color: '#64748b' }}>{l}:</span>
                                <strong style={{ fontFamily: l === 'Quotation No.' ? 'monospace' : 'inherit' }}>{v}</strong>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── PATIENT INFO ── */}
                <div style={{ marginBottom: '5mm' }}>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', paddingBottom: '4px', borderBottom: '1px solid #e2e8f0', marginBottom: '6px' }}>Patient Information</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
                        {[
                            ['Patient Name', record.CustomerName],
                            ['Contact Number', record.CustomerPhone],
                            ['Email Address', record.CustomerEmail],
                            ['Prepared By', preparedBy],
                        ].map(([label, value]) => (
                            <div key={label} style={{ display: 'flex', paddingBottom: '4px', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ color: '#64748b', width: '44%', flexShrink: 0, fontSize: '10.5px' }}>{label}:</span>
                                <strong style={{ color: '#0f172a', wordBreak: 'break-word', fontSize: '10.5px' }}>{value || '—'}</strong>
                            </div>
                        ))}
                        {record.HospitalName && (
                            <div style={{ gridColumn: 'span 2', display: 'flex', paddingBottom: '4px', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ color: '#64748b', width: '22%', flexShrink: 0, fontSize: '10.5px' }}>Company/Hospital:</span>
                                <strong style={{ color: '#0f172a', wordBreak: 'break-word', fontSize: '10.5px' }}>{record.HospitalName}</strong>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── SERVICES TABLE — flex-grow fills remaining space ── */}
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', marginBottom: '5mm' }}>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Service Breakdown</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9', color: '#475569' }}>
                                {['#', 'Department', 'Service Description', 'Unit Price', 'Qty', 'Amount'].map((h, i) => (
                                    <th key={h} style={{
                                        padding: '7px 9px',
                                        fontSize: '9.5px',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        borderBottom: '1px solid #e2e8f0',
                                        textAlign: [0, 4].includes(i) ? 'center' : [3, 5].includes(i) ? 'right' : 'left',
                                        width: i === 0 ? '24px' : i === 2 ? '36%' : i === 4 ? '36px' : i === 5 ? '88px' : undefined,
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                let rowNo = 0;
                                return Object.entries(grouped).map(([, deptItems]) =>
                                    deptItems.map((item) => {
                                        rowNo++;
                                        const subtotal = item.Price * item.Quantity;
                                        return (
                                            <tr key={item.Id} style={{ background: rowNo % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                                <td style={{ padding: '6px 9px', textAlign: 'center', color: '#94a3b8', borderBottom: '1px solid #f1f5f9', fontSize: '10px' }}>{rowNo}</td>
                                                <td style={{ padding: '6px 9px', color: '#334155', fontWeight: '600', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', fontSize: '10px' }}>{item.Department}</td>
                                                <td style={{ padding: '6px 9px', color: '#475569', borderBottom: '1px solid #f1f5f9', wordBreak: 'break-word', fontSize: '10px' }}>{item.Name}</td>
                                                <td style={{ padding: '6px 9px', textAlign: 'right', color: '#475569', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', fontSize: '10px' }}>{fmt(item.Price)}</td>
                                                <td style={{ padding: '6px 9px', textAlign: 'center', fontWeight: '600', borderBottom: '1px solid #f1f5f9', fontSize: '10px' }}>{item.Quantity}</td>
                                                <td style={{ padding: '6px 9px', textAlign: 'right', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', fontSize: '10.5px' }}>{fmt(subtotal)}</td>
                                            </tr>
                                        );
                                    })
                                );
                            })()}
                        </tbody>
                    </table>

                    {/* Totals — right-aligned under table */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4mm' }}>
                        <div style={{ width: '280px', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', fontSize: '11px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <span style={{ color: '#64748b', fontWeight: '500' }}>Subtotal</span>
                                <strong>{fmt(record.Subtotal || grandTotal)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', background: '#0f172a', color: '#fff' }}>
                                <span style={{ fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Grand Total</span>
                                <strong style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '-0.5px' }}>{fmt(grandTotal)}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Special Notes */}
                    {notes && (
                        <div style={{ marginTop: '4mm', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '5px', padding: '10px 14px', fontSize: '10.5px', color: '#78350f' }}>
                            <div style={{ fontWeight: '700', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', color: '#92400e' }}>Special Instructions</div>
                            {notes}
                        </div>
                    )}
                </div>

                {/* ── FOOTER BLOCK — pinned to bottom via margin-top: auto from flex-grow above ── */}
                <div style={{ borderTop: '1.5px solid #e2e8f0', paddingTop: '4mm' }}>
                    {/* Terms */}
                    <div style={{ marginBottom: '5mm', fontSize: '9.5px', color: '#64748b', lineHeight: '1.65' }}>
                        <div style={{ fontWeight: '700', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px', color: '#94a3b8' }}>Terms &amp; Conditions</div>
                        <ul style={{ paddingLeft: '14px', margin: 0, listStyleType: 'disc' }}>
                            <li>This quotation is valid for thirty (30) days from the issued date.</li>
                            <li>Pricing estimates are subject to change without prior notice upon expiration.</li>
                            <li>For services requiring hospitalization, a 50% reservation fee may apply.</li>
                            <li>This quotation does NOT constitute a confirmed medical appointment or prescription.</li>
                        </ul>
                    </div>

                    {/* Signatures */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10mm', textAlign: 'center', fontSize: '10px', paddingTop: '5mm', borderTop: '2px solid #0f172a', marginBottom: '4mm' }}>
                        {[
                            { main: preparedBy, sub: 'Billing & Accounts' },
                            { main: 'Verified By', sub: 'Finance Department' },
                            { main: record.CustomerName || 'Patient', sub: 'Patient Signature' },
                        ].map(({ main, sub }, i) => (
                            <div key={i}>
                                <div style={{ borderBottom: '1px solid #94a3b8', marginBottom: '6px', height: '30px' }} />
                                <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '11px' }}>{main}</div>
                                <div style={{ color: '#94a3b8', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>{sub}</div>
                            </div>
                        ))}
                    </div>

                    {/* System Footer */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '3mm', display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                        <span>SYS_GEN_ID: {sysGenId}</span>
                        <span>VisayasMed Hospital · Confidential · Do not duplicate without authorization</span>
                    </div>
                </div>
            </div>
        );
    }
);

PdfGeneratorRenderer.displayName = 'PdfGeneratorRenderer';

export default PdfGeneratorRenderer;
