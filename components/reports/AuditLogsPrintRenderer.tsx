'use client';

import React, { forwardRef } from 'react';

const fmtDate = (dateVal: any) => {
    if (!dateVal) return '—';
    const d = new Date(dateVal as string);
    return `${d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`;
};

interface AuditLogsPrintRendererProps {
    group: any; // { recordId: string, logs: any[] }
    dateGenerated?: string;
    preparedBy?: string;
}

const AuditLogsPrintRenderer = forwardRef<HTMLDivElement, AuditLogsPrintRendererProps>(
    ({ group, dateGenerated, preparedBy }, ref) => {
        const sysGenId = `LOGS-${Date.now().toString().slice(-6)}`;
        const generatedOn = dateGenerated || new Date().toISOString();
        const displayDate = new Date(generatedOn).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

        // Grab first log metadata for patient info
        const firstLogMeta = group.logs.length > 0 ? (group.logs[0].Metadata || {}) : {};
        const patientName = firstLogMeta.PatientName || '—';

        const itemsPerPage = 12; // Adjust if rows take up too much vertical space due to nested item tracking tables.
        const pages = [];
        for (let i = 0; i < group.logs.length; i += itemsPerPage) {
            pages.push(group.logs.slice(i, i + itemsPerPage));
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
                                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.2px' }}>Quotation History Logs</div>
                                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginTop: '4px' }}>Patient: <span style={{ color: '#0f172a' }}>{patientName}</span></div>
                                        </div>
                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '5px', padding: '8px 12px', fontSize: '10px', minWidth: '220px' }}>
                                            {[['Report No.', sysGenId], ['Date Generated', displayDate], ['Quotation #', group.recordId]].map(([l, v]) => (
                                                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                    <span style={{ color: '#334155', fontWeight: '700' }}>{l}:</span>
                                                    <strong style={{ fontFamily: l === 'Report No.' || l === 'Quotation #' ? 'monospace' : 'inherit', color: '#0f172a', fontWeight: '800' }}>{v}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* TABLE */}
                                    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '5mm', flexGrow: 1 }}>
                                        <div style={{ fontSize: '10px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Log Activity {pages.length > 1 ? `(Page ${pageIndex + 1})` : ''}</div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                                            <thead>
                                                <tr style={{ background: '#f1f5f9', color: '#475569' }}>
                                                    {['Date & Time', 'Action', 'Description', 'Edited By'].map((h, i) => (
                                                        <th key={h} style={{
                                                            padding: '7px 9px',
                                                            fontSize: '9.5px',
                                                            fontWeight: '700',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.5px',
                                                            borderBottom: '1px solid #e2e8f0',
                                                            textAlign: 'left',
                                                            width: i === 0 ? '120px' : i === 1 ? '100px' : i === 3 ? '120px' : undefined,
                                                        }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pageItems.map((log: any, idx: number) => {
                                                    return (
                                                        <tr key={log.id || idx} style={{ background: idx % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                                            <td style={{ padding: '6px 9px', color: '#334155', borderBottom: '1px solid #f1f5f9', fontSize: '10px', fontWeight: '600' }}>{fmtDate(log.CreatedAt)}</td>
                                                            <td style={{ padding: '6px 9px', color: '#334155', fontWeight: '700', borderBottom: '1px solid #f1f5f9', fontSize: '9.5px' }}>{log.Action}</td>
                                                            <td style={{ padding: '6px 9px', color: '#334155', borderBottom: '1px solid #f1f5f9', wordBreak: 'break-word', fontSize: '10px' }}>
                                                                <div style={{ fontWeight: 700, marginBottom: '4px' }}>{log.Description}</div>
                                                                {log.Action === 'UPDATE_TRACKING' && (log.OldValues as any)?.Items && (log.NewValues as any)?.Items && (
                                                                    <div style={{ marginTop: '4px', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                                            <thead style={{ background: '#e2e8f0' }}>
                                                                                <tr>
                                                                                    <th style={{ padding: '4px', fontSize: '8px', textAlign: 'left' }}>Item</th>
                                                                                    <th style={{ padding: '4px', fontSize: '8px', textAlign: 'center' }}>Target Qty</th>
                                                                                    <th style={{ padding: '4px', fontSize: '8px', textAlign: 'center' }}>Before</th>
                                                                                    <th style={{ padding: '4px', fontSize: '8px', textAlign: 'center' }}>After</th>
                                                                                    <th style={{ padding: '4px', fontSize: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>Remaining Qty</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody style={{ background: '#fff' }}>
                                                                                {(log.NewValues as any).Items.map((newItem: any, i: number) => {
                                                                                    const oldItem = (log.OldValues as any).Items.find((oi: any) => oi.Id === newItem.Id) || (log.OldValues as any).Items[i];
                                                                                    const oldUsed = oldItem ? oldItem.Used : 0;
                                                                                    const newUsed = newItem.Used;
                                                                                    const targetQty: number | string = newItem.Qty || oldItem?.Qty || '-';
                                                                                    const itemName = newItem.Name || oldItem?.Name || 'Unknown Item';
                                                                                    const remainingQty = typeof targetQty === 'number' ? targetQty - newUsed : '-';
                                                                                    if (oldUsed !== newUsed) {
                                                                                        return (
                                                                                            <tr key={newItem.Id || i} style={{ borderTop: '1px solid #f1f5f9' }}>
                                                                                                <td style={{ padding: '4px', fontSize: '8px', fontWeight: 700 }}>{itemName}</td>
                                                                                                <td style={{ padding: '4px', fontSize: '8px', fontWeight: 700, textAlign: 'center' }}>{targetQty}</td>
                                                                                                <td style={{ padding: '4px', fontSize: '8px', fontWeight: 700, textAlign: 'center', color: '#dc2626' }}>{oldUsed}</td>
                                                                                                <td style={{ padding: '4px', fontSize: '8px', fontWeight: 700, textAlign: 'center', color: '#16a34a' }}>{newUsed}</td>
                                                                                                <td style={{ padding: '4px', fontSize: '8px', fontWeight: 700, textAlign: 'center', color: remainingQty === '-' ? '#94a3b8' : remainingQty === 0 ? '#16a34a' : '#d97706' }}>{remainingQty}</td>
                                                                                            </tr>
                                                                                        );
                                                                                    }
                                                                                    return null;
                                                                                })}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td style={{ padding: '6px 9px', color: '#475569', borderBottom: '1px solid #f1f5f9', fontSize: '10px', fontWeight: '600' }}>{(log.Metadata || {}).EditedBy || '—'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* FOOTER */}
                                <div style={{ borderTop: '1.5px solid #e2e8f0', paddingTop: '4mm', marginTop: 'auto' }}>
                                    {/* Terms (Repeated on every page) */}
                                    <div style={{ marginBottom: '5mm', fontSize: '9.5px', color: '#64748b', lineHeight: '1.65' }}>
                                        <div style={{ fontWeight: '700', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px', color: '#94a3b8' }}>Terms &amp; Conditions</div>
                                        <ul style={{ paddingLeft: '14px', margin: 0, listStyleType: 'disc' }}>
                                            <li>This historical log report is generated strictly for internal monitoring and auditing.</li>
                                            <li>Values shown reflect the precise quantity modifications made to external tracking records.</li>
                                            <li>For any discrepancies or corrections, please contact the IT Administration.</li>
                                            <li>This generated log document does NOT constitute a confirmed medical appointment or prescription.</li>
                                        </ul>
                                    </div>

                                    {/* Signatures (Only on last page, preserve space on other pages) */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr 1fr',
                                        gap: '10mm',
                                        textAlign: 'center',
                                        fontSize: '10px',
                                        paddingTop: '5mm',
                                        borderTop: '2px solid #0f172a',
                                        marginBottom: '4mm',
                                        visibility: isLastPage ? 'visible' : 'hidden'
                                    }}>
                                        {[
                                            { main: preparedBy || 'System Generated', sub: 'Prepared By:' },
                                            { main: 'Verified By', sub: '' },
                                            { main: patientName || 'Patient', sub: 'Patient Signature' },
                                        ].map(({ main, sub }, i) => (
                                            <div key={i}>
                                                <div style={{ borderBottom: '1px solid #94a3b8', marginBottom: '6px', height: '30px' }} />
                                                <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '11px' }}>{main}</div>
                                                <div style={{ color: '#94a3b8', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>{sub}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '3mm', display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                                        <span>REP_LOGS: {sysGenId}</span>
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

AuditLogsPrintRenderer.displayName = 'AuditLogsPrintRenderer';
export default AuditLogsPrintRenderer;
