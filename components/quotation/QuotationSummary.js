'use client';

import { useRef, useState } from 'react';

const fmt = (n) => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 });

export default function QuotationSummary({ customer, items, onBack }) {
    const pdfRef = useRef(null);
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

            pdf.save(`VisMed-Quotation-${customer.quotationNo}.pdf`);
        } catch (err) {
            console.error('PDF generation error:', err);
            alert('PDF generation failed. Please ensure jsPDF and html2canvas are installed.');
        }
        setGenerating(false);
    };

    return (
        <div className="qs-page">
            {/* Action bar */}
            <div className="qs-actions">
                <button type="button" className="btn btn-dark-outline" onClick={onBack}>← Edit Services</button>
                <button type="button" className="btn btn-primary" onClick={handleDownload} disabled={generating}>
                    {generating ? '⏳ Generating PDF...' : '⬇ Download PDF'}
                </button>
            </div>

            {/* Notes field */}
            <div className="qs-notes-wrap">
                <label className="qf-label">Special Instructions / Notes (included in PDF)</label>
                <textarea
                    className="qf-input qs-notes"
                    rows={2}
                    placeholder="e.g. Patient requests morning schedule, insurance coverage notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>

            {/* PDF TEMPLATE */}
            <div ref={pdfRef} className="pdf-template">
                {/* Header */}
                <div className="pdf-header">
                    <div className="pdf-logo-block">
                        <div className="pdf-logo-icon">✚</div>
                        <div>
                            <div className="pdf-hospital-name">VisMed Medical Hospital</div>
                            <div className="pdf-hospital-tagline">Excellence in Healthcare Since 2001</div>
                        </div>
                    </div>
                    <div className="pdf-header-info">
                        <div>123 Medical Drive, Health City, HC 90210</div>
                        <div>Tel: +1 (555) 123-4567 · info@vismed.com</div>
                        <div>www.vismed.com</div>
                    </div>
                </div>
                <div className="pdf-divider" />

                {/* Title */}
                <div className="pdf-title-row">
                    <div className="pdf-doc-title">MEDICAL SERVICES QUOTATION</div>
                    <div className="pdf-doc-meta">
                        <div className="pdf-meta-row"><span>Quotation No.:</span><strong>{customer.quotationNo}</strong></div>
                        <div className="pdf-meta-row"><span>Date Issued:</span><strong>{customer.date}</strong></div>
                        <div className="pdf-meta-row"><span>Valid Until:</span><strong>{getValidUntil(customer.date)}</strong></div>
                    </div>
                </div>
                <div className="pdf-divider" />

                {/* Patient info */}
                <div className="pdf-section-title">Patient Information</div>
                <div className="pdf-patient-grid">
                    <div className="pdf-patient-row"><span>Name:</span><strong>{customer.name || '—'}</strong></div>
                    <div className="pdf-patient-row"><span>Date of Birth:</span><strong>{customer.dob || '—'}</strong></div>
                    <div className="pdf-patient-row"><span>Gender:</span><strong>{customer.gender || '—'}</strong></div>
                    <div className="pdf-patient-row"><span>Contact:</span><strong>{customer.phone || '—'}</strong></div>
                    <div className="pdf-patient-row"><span>Email:</span><strong>{customer.email || '—'}</strong></div>
                    <div className="pdf-patient-row pdf-col-2"><span>Address:</span><strong>{customer.address || '—'}</strong></div>
                    <div className="pdf-patient-row pdf-col-2"><span>Attending Physician:</span><strong>{customer.physician || '—'}</strong></div>
                    {customer.notes && <div className="pdf-patient-row pdf-col-2"><span>Remarks:</span><strong>{customer.notes}</strong></div>}
                </div>
                <div className="pdf-divider" />

                {/* Services table */}
                <div className="pdf-section-title">Services & Pricing</div>
                <table className="pdf-table">
                    <thead>
                        <tr>
                            <th className="pdf-th">#</th>
                            <th className="pdf-th pdf-th-left">Department</th>
                            <th className="pdf-th pdf-th-left">Service Description</th>
                            <th className="pdf-th">Unit Price</th>
                            <th className="pdf-th">Sessions / Qty</th>
                            <th className="pdf-th">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(() => {
                            let rowNo = 0;
                            return Object.entries(grouped).map(([deptName, deptItems]) =>
                                deptItems.map((item) => {
                                    rowNo++;
                                    return (
                                        <tr key={item.id} className={rowNo % 2 === 0 ? 'pdf-tr-alt' : ''}>
                                            <td className="pdf-td pdf-td-center">{rowNo}</td>
                                            <td className="pdf-td">{item.deptName}</td>
                                            <td className="pdf-td">{item.serviceName}</td>
                                            <td className="pdf-td pdf-td-right">{fmt(item.unitPrice)}</td>
                                            <td className="pdf-td pdf-td-center">{item.sessions}</td>
                                            <td className="pdf-td pdf-td-right pdf-td-bold">{fmt(item.subtotal)}</td>
                                        </tr>
                                    );
                                })
                            );
                        })()}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="pdf-totals">
                    <div className="pdf-total-row">
                        <span>Subtotal</span>
                        <strong>{fmt(grandTotal)}</strong>
                    </div>
                    <div className="pdf-total-divider" />
                    <div className="pdf-total-row pdf-grand-total">
                        <span>GRAND TOTAL</span>
                        <strong>{fmt(grandTotal)}</strong>
                    </div>
                </div>

                {/* Notes */}
                {notes && (
                    <>
                        <div className="pdf-divider" />
                        <div className="pdf-section-title">Special Instructions</div>
                        <div className="pdf-notes-text">{notes}</div>
                    </>
                )}

                {/* Terms */}
                <div className="pdf-divider" />
                <div className="pdf-terms">
                    <div className="pdf-section-title">Terms & Conditions</div>
                    <ul>
                        <li>This quotation is valid for 30 days from the date of issue.</li>
                        <li>Prices are subject to change without prior notice after the validity period.</li>
                        <li>A 50% down payment is required upon confirmation of services.</li>
                        <li>Cancellations must be made at least 24 hours in advance.</li>
                        <li>This quotation does not constitute a medical prescription or guarantee of availability.</li>
                    </ul>
                </div>

                {/* Signature block */}
                <div className="pdf-signatures">
                    <div className="pdf-sig-block">
                        <div className="pdf-sig-line"></div>
                        <div className="pdf-sig-label">Prepared by</div>
                        <div className="pdf-sig-sub">VisMed Billing & Records</div>
                    </div>
                    <div className="pdf-sig-block">
                        <div className="pdf-sig-line"></div>
                        <div className="pdf-sig-label">Approved by</div>
                        <div className="pdf-sig-sub">Department Head / Physician</div>
                    </div>
                    <div className="pdf-sig-block">
                        <div className="pdf-sig-line"></div>
                        <div className="pdf-sig-label">Received by</div>
                        <div className="pdf-sig-sub">Patient / Authorized Representative</div>
                    </div>
                </div>

                {/* PDF Footer */}
                <div className="pdf-footer">
                    <span>VisMed Medical Hospital · 123 Medical Drive, Health City · +1 (555) 123-4567 · www.vismed.com</span>
                    <span>This document is computer-generated and is valid without signature unless otherwise stated.</span>
                </div>
            </div>
        </div>
    );
}

function getValidUntil(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}
