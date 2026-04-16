'use client';

import React, { forwardRef } from 'react';
import { QuotationRecord } from '@/lib/firestore/quotations';

const fmt = (n: number) => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 });

interface BatchPrintRendererProps {
    quotations: QuotationRecord[];
    reportNo?: string;
    dateGenerated?: string;
    preparedBy?: string;
}

const BatchPrintRenderer = forwardRef<HTMLDivElement, BatchPrintRendererProps>(
    ({ quotations, reportNo, dateGenerated, preparedBy }, ref) => {
        const grandTotal = quotations.reduce((sum, q) => sum + (q.Total || 0), 0);
        const sysGenId = reportNo || `REP-BATCH-${Date.now().toString().slice(-6)}`;
        const generatedOn = dateGenerated || new Date().toISOString();
        const displayDate = new Date(generatedOn).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

        const itemsPerPage = 18; // Similar to GuarantorPdfRenderer but lacking Guarantor info section, we can fit slightly more items
        const pages = [];
        for (let i = 0; i < quotations.length; i += itemsPerPage) {
            pages.push(quotations.slice(i, i + itemsPerPage));
        }
        if (pages.length === 0) pages.push([]);

        return (
            <div ref={ref} style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#ebeef2' }}>
                {pages.map((pageItems, pageIndex) => {
                    const isLastPage = pageIndex === pages.length - 1;

                    return (
                        <div
                            key={pageIndex}
                            style={{
                                margin: '0 auto',
                                width: '816px',
                                minWidth: '816px',
                                height: '1248px',
                                minHeight: '1248px',
                                padding: '48px 57px',
                                boxSizing: 'border-box',
                                background: '#fff',
                                display: 'flex',
                                flexDirection: 'column',
                                fontSize: '11.5px',
                                lineHeight: '1.55',
                                color: '#1e293b',
                                fontFamily: 'Inter, system-ui, sans-serif',
                                position: 'relative',
                                overflow: 'hidden',
                                borderBottom: isLastPage ? 'none' : '1px solid #ebeef2'
                            }}
                        >
                            {/* Watermark */}
                            <img
                                src="/VisayasMedical.png"
                                alt="Watermark Logo"
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: '500px',
                                    height: '500px',
                                    objectFit: 'contain',
                                    opacity: 0.12,
                                    pointerEvents: 'none',
                                    zIndex: 0,
                                }}
                            />

                            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>

                                    {/* HEADER */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: '7mm', borderBottom: '2.5px solid #0056B3', marginBottom: '6mm', textAlign: 'center' }}>
                                        <img src="/VisayasMedical.png" alt="Logo" style={{ width: '64px', height: '64px', objectFit: 'contain', opacity: 0.9, marginBottom: '6px' }} />
                                        <div>
                                            <div style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '-0.4px', color: '#0056B3', textTransform: 'uppercase' }}>VisayasMed Hospital</div>
                                            <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: '600', letterSpacing: '1.2px', textTransform: 'uppercase', marginTop: '2px' }}>A MEMBER OF APPLEONE MEDICAL GROUP</div>
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#64748b', lineHeight: '1.7', marginTop: '6px' }}>
                                            <div>85 Osmeña Blvd., Brgy. Sta. Cruz, Cebu City, Philippines 6000</div>
                                            <div>Tel: (032) 253 1901 • www.visayasmedcebu.com.ph</div>
                                        </div>
                                    </div>

                                    {/* TITLE + META */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '5mm' }}>
                                        <div>
                                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.2px' }}>Batch Quotations Report</div>
                                        </div>
                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '5px', padding: '8px 12px', fontSize: '10px', minWidth: '220px' }}>
                                            {[['Report No.', sysGenId], ['Date Generated', displayDate], ['Total Records', quotations.length.toString()]].map(([l, v]) => (
                                                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                    <span style={{ color: '#334155', fontWeight: '700' }}>{l}:</span>
                                                    <strong style={{ fontFamily: l === 'Report No.' ? 'monospace' : 'inherit', color: '#0f172a', fontWeight: '800' }}>{v}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* TABLE */}
                                    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '5mm', flexGrow: 1 }}>
                                        <div style={{ fontSize: '10px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Records List {pages.length > 1 ? `(Page ${pageIndex + 1})` : ''}</div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                                            <thead>
                                                <tr style={{ background: '#f1f5f9', color: '#475569' }}>
                                                    {['#', 'Doc No.', 'Patient Name', 'Date Issued', 'Prepared By', 'Amount'].map((h, i) => (
                                                        <th key={h} style={{
                                                            padding: '7px 9px',
                                                            fontSize: '9.5px',
                                                            fontWeight: '700',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.5px',
                                                            borderBottom: '1px solid #e2e8f0',
                                                            textAlign: [0].includes(i) ? 'center' : [5].includes(i) ? 'right' : 'left',
                                                            width: i === 0 ? '24px' : i === 1 ? '15%' : i === 2 ? '30%' : i === 5 ? '88px' : undefined,
                                                        }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pageItems.map((q, idx) => {
                                                    const rowNo = pageIndex * itemsPerPage + idx + 1;
                                                    const qDate = q.CreatedAt ? new Date(q.CreatedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                                                    return (
                                                        <tr key={q.id || idx} style={{ background: rowNo % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                                            <td style={{ padding: '6px 9px', textAlign: 'center', color: '#94a3b8', borderBottom: '1px solid #f1f5f9', fontSize: '10px' }}>{rowNo}</td>
                                                            <td style={{ padding: '6px 9px', color: '#334155', fontWeight: '600', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', fontSize: '10px', fontFamily: 'monospace' }}>{q.DocumentNo || q.id}</td>
                                                            <td style={{ padding: '6px 9px', color: '#475569', borderBottom: '1px solid #f1f5f9', wordBreak: 'break-word', fontSize: '10px', fontWeight: '700' }}>{q.CustomerName || '—'}</td>
                                                            <td style={{ padding: '6px 9px', color: '#475569', borderBottom: '1px solid #f1f5f9', wordBreak: 'break-word', fontSize: '10px' }}>{qDate}</td>
                                                            <td style={{ padding: '6px 9px', color: '#475569', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', fontSize: '10px' }}>{q.PreparedBy || '—'}</td>
                                                            <td style={{ padding: '6px 9px', textAlign: 'right', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', fontSize: '10.5px' }}>{fmt(q.Total || 0)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>

                                        {/* Totals */}
                                        {isLastPage && (
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4mm' }}>
                                                <div style={{ width: '280px', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', fontSize: '11px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', background: '#fff', color: '#0f172a' }}>
                                                        <span style={{ fontWeight: '800', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</span>
                                                        <strong style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '-0.5px' }}>{fmt(grandTotal)}</strong>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* FOOTER */}
                                <div style={{ borderTop: '1.5px solid #e2e8f0', paddingTop: '4mm', marginTop: 'auto' }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr 1fr',
                                        gap: '10mm',
                                        textAlign: 'center',
                                        fontSize: '10px',
                                        paddingTop: '5mm',
                                        marginBottom: '4mm',
                                        visibility: isLastPage ? 'visible' : 'hidden'
                                    }}>
                                        {[
                                            { main: preparedBy || 'System Generated', sub: 'Prepared By:' },
                                            { main: '', sub: '' },
                                            { main: 'Verified By', sub: '' },
                                        ].map(({ main, sub }, i) => (
                                            <div key={i}>
                                                {sub ? (
                                                    <>
                                                        <div style={{ borderBottom: '1px solid #94a3b8', marginBottom: '6px', height: '30px' }} />
                                                        <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '11px' }}>{main}</div>
                                                        <div style={{ color: '#94a3b8', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>{sub}</div>
                                                    </>
                                                ) : <div />}
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '3mm', display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                                        <span>REP_ID: {sysGenId}</span>
                                        <span style={{ fontWeight: '600' }}>Page {pageIndex + 1} of {pages.length}</span>
                                        <span>VisayasMed Hospital · Confidential · Do not duplicate without authorization</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }
);

BatchPrintRenderer.displayName = 'BatchPrintRenderer';
export default BatchPrintRenderer;
