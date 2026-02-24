'use client';

export default function CustomerInfoForm({ data, onChange, onNext }) {
    const handleChange = (e) => onChange({ ...data, [e.target.name]: e.target.value });

    const handleSubmit = (e) => {
        e.preventDefault();
        onNext();
    };

    const fields = [
        { name: 'name', label: 'Patient / Customer Name', type: 'text', placeholder: 'Full legal name', required: true, colSpan: 2 },
        { name: 'dob', label: 'Date of Birth', type: 'date', required: false },
        { name: 'gender', label: 'Gender', type: 'select', options: ['', 'Male', 'Female', 'Prefer not to say'], required: false },
        { name: 'phone', label: 'Contact Number', type: 'tel', placeholder: '+63 9XX XXX XXXX', required: true },
        { name: 'email', label: 'Email Address', type: 'email', placeholder: 'patient@email.com', required: false },
        { name: 'address', label: 'Address', type: 'text', placeholder: 'Street, City, Province', required: false, colSpan: 2 },
        { name: 'physician', label: 'Attending Physician (optional)', type: 'text', placeholder: 'Dr. Full Name', required: false },
        { name: 'notes', label: 'Remarks / Chief Complaint', type: 'text', placeholder: 'Brief description (optional)', required: false },
    ];

    return (
        <form className="qf-form" onSubmit={handleSubmit}>
            <div className="qf-form-grid">
                {fields.map((f) => (
                    <div key={f.name} className={`qf-group${f.colSpan === 2 ? ' qf-col-2' : ''}`}>
                        <label className="qf-label">
                            {f.label}
                            {f.required && <span className="qf-required"> *</span>}
                        </label>
                        {f.type === 'select' ? (
                            <select
                                name={f.name}
                                className="qf-input"
                                value={data[f.name] || ''}
                                onChange={handleChange}
                            >
                                {f.options.map((o) => (
                                    <option key={o} value={o}>{o || 'Select...'}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type={f.type}
                                name={f.name}
                                className="qf-input"
                                placeholder={f.placeholder}
                                value={data[f.name] || ''}
                                onChange={handleChange}
                                required={f.required}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Read-only auto fields */}
            <div className="qf-auto-fields">
                <div className="qf-auto-item">
                    <span className="qf-auto-label">Quotation Date</span>
                    <span className="qf-auto-value">{data.date}</span>
                </div>
                <div className="qf-auto-item">
                    <span className="qf-auto-label">Quotation No.</span>
                    <span className="qf-auto-value qf-quote-no">{data.quotationNo}</span>
                </div>
            </div>

            <div className="qf-actions">
                <button type="submit" className="btn btn-primary qf-btn">
                    Next: Select Services →
                </button>
            </div>
        </form>
    );
}
