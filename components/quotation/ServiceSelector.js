'use client';

import { useState } from 'react';
import departments from '@/data/departments';
import SearchableSelect from '@/components/ui/SearchableSelect';

const fmt = (n) => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 });

export default function ServiceSelector({ items, onChange, onNext, onBack }) {
    const [selectedDeptId, setSelectedDeptId] = useState('');
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [sessions, setSessions] = useState(1);
    const [error, setError] = useState('');

    const selectedDept = departments.find((d) => d.id === selectedDeptId);
    const serviceOptions = selectedDept ? selectedDept.services : [];
    const selectedService = serviceOptions.find((s) => s.id === selectedServiceId);

    const handleDeptChange = (id) => {
        setSelectedDeptId(id);
        setSelectedServiceId('');
        setError('');
    };

    const handleAddService = () => {
        if (!selectedDeptId) { setError('Please select a department.'); return; }
        if (!selectedServiceId) { setError('Please select a service.'); return; }
        if (sessions < 1) { setError('Sessions must be at least 1.'); return; }

        const existing = items.findIndex((i) => i.serviceId === selectedServiceId);
        if (existing > -1) {
            const updated = [...items];
            updated[existing] = { ...updated[existing], sessions: updated[existing].sessions + sessions };
            onChange(updated);
        } else {
            onChange([
                ...items,
                {
                    id: `${selectedServiceId}-${Date.now()}`,
                    deptId: selectedDeptId,
                    deptName: selectedDept.name,
                    serviceId: selectedServiceId,
                    serviceName: selectedService.name,
                    unitPrice: selectedService.price,
                    unit: selectedService.unit,
                    sessions,
                    subtotal: selectedService.price * sessions,
                },
            ]);
        }

        setSelectedServiceId('');
        setSessions(1);
        setError('');
    };

    const handleRemove = (id) => onChange(items.filter((i) => i.id !== id));

    const handleSessionChange = (id, val) => {
        const n = Math.max(1, parseInt(val) || 1);
        onChange(items.map((i) => i.id === id ? { ...i, sessions: n, subtotal: i.unitPrice * n } : i));
    };

    const grandTotal = items.reduce((sum, i) => sum + i.subtotal, 0);

    const grouped = items.reduce((acc, item) => {
        if (!acc[item.deptName]) acc[item.deptName] = [];
        acc[item.deptName].push(item);
        return acc;
    }, {});

    return (
        <div className="ss-page">
            {/* Left: Selector panel */}
            <div className="ss-left">
                <div className="ss-panel">
                    <h3 className="ss-panel-title">Add a Service</h3>

                    <div className="ss-field">
                        <label className="qf-label">Department</label>
                        <SearchableSelect
                            options={departments}
                            value={selectedDeptId}
                            onChange={handleDeptChange}
                            placeholder="Search department..."
                            valueKey="id"
                            displayKey="name"
                            renderOption={(d) => (
                                <span className="ss-dept-opt">
                                    <span className="ss-dept-icon">{d.icon}</span>
                                    <span>
                                        <strong>{d.name}</strong>
                                        <small>{d.description}</small>
                                    </span>
                                </span>
                            )}
                        />
                    </div>

                    <div className="ss-field">
                        <label className="qf-label">Service</label>
                        <SearchableSelect
                            options={serviceOptions}
                            value={selectedServiceId}
                            onChange={(id) => { setSelectedServiceId(id); setError(''); }}
                            placeholder={selectedDeptId ? 'Search service...' : 'Select a department first'}
                            valueKey="id"
                            displayKey="name"
                            renderOption={(s) => (
                                <span className="ss-svc-opt">
                                    <span className="ss-svc-name">{s.name}</span>
                                    <span className="ss-svc-meta">
                                        <small>{s.description}</small>
                                        <strong>{fmt(s.price)} <em>{s.unit}</em></strong>
                                    </span>
                                </span>
                            )}
                        />
                    </div>

                    {selectedService && (
                        <div className="ss-service-preview">
                            <div className="ss-preview-name">{selectedService.name}</div>
                            <div className="ss-preview-desc">{selectedService.description}</div>
                            <div className="ss-preview-price">{fmt(selectedService.price)} <span>{selectedService.unit}</span></div>
                        </div>
                    )}

                    <div className="ss-field">
                        <label className="qf-label">Number of Sessions / Quantity</label>
                        <div className="ss-qty-row">
                            <button type="button" className="ss-qty-btn" onClick={() => setSessions((s) => Math.max(1, s - 1))}>−</button>
                            <input
                                type="number"
                                className="ss-qty-input"
                                min="1"
                                value={sessions}
                                onChange={(e) => setSessions(Math.max(1, parseInt(e.target.value) || 1))}
                            />
                            <button type="button" className="ss-qty-btn" onClick={() => setSessions((s) => s + 1)}>+</button>
                        </div>
                        {selectedService && (
                            <div className="ss-subtotal-hint">
                                Subtotal: <strong>{fmt(selectedService.price * sessions)}</strong>
                            </div>
                        )}
                    </div>

                    {error && <p className="ss-error">{error}</p>}

                    <button type="button" className="btn btn-primary ss-add-btn" onClick={handleAddService}>
                        + Add to Quotation
                    </button>
                </div>
            </div>

            {/* Right: Selected services */}
            <div className="ss-right">
                <div className="ss-summary-panel">
                    <div className="ss-summary-header">
                        <h3 className="ss-panel-title">Selected Services</h3>
                        {items.length > 0 && (
                            <span className="ss-item-count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                        )}
                    </div>

                    {items.length === 0 ? (
                        <div className="ss-empty">
                            <div className="ss-empty-icon">🗒️</div>
                            <p>No services added yet. <br />Use the panel on the left to begin.</p>
                        </div>
                    ) : (
                        <div className="ss-items-list">
                            {Object.entries(grouped).map(([deptName, deptItems]) => (
                                <div key={deptName} className="ss-dept-group">
                                    <div className="ss-dept-label">{deptName}</div>
                                    {deptItems.map((item) => (
                                        <div key={item.id} className="ss-item-row">
                                            <div className="ss-item-info">
                                                <div className="ss-item-name">{item.serviceName}</div>
                                                <div className="ss-item-price-info">{fmt(item.unitPrice)} × </div>
                                            </div>
                                            <div className="ss-item-controls">
                                                <div className="ss-item-qty-row">
                                                    <button type="button" className="ss-qty-btn ss-qty-sm" onClick={() => handleSessionChange(item.id, item.sessions - 1)}>−</button>
                                                    <input
                                                        type="number"
                                                        className="ss-qty-input ss-qty-sm"
                                                        min="1"
                                                        value={item.sessions}
                                                        onChange={(e) => handleSessionChange(item.id, e.target.value)}
                                                    />
                                                    <button type="button" className="ss-qty-btn ss-qty-sm" onClick={() => handleSessionChange(item.id, item.sessions + 1)}>+</button>
                                                </div>
                                                <div className="ss-item-subtotal">{fmt(item.subtotal)}</div>
                                                <button type="button" className="ss-remove-btn" onClick={() => handleRemove(item.id)} aria-label="Remove">✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="ss-total-bar">
                        <div className="ss-total-label">Grand Total</div>
                        <div className="ss-total-amount">{fmt(grandTotal)}</div>
                    </div>
                </div>

                <div className="ss-nav-row">
                    <button type="button" className="btn btn-dark-outline" onClick={onBack}>← Back</button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => { if (items.length === 0) { setError('Please add at least one service.'); return; } onNext(); }}
                    >
                        Review Quotation →
                    </button>
                </div>
            </div>
        </div>
    );
}
