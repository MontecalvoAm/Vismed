'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getQuotationById, QuotationRecord } from '@/lib/firestore/quotations';
import BatchPrintRenderer from '@/components/reports/BatchPrintRenderer';
import { useAuth } from '@/context/AuthContext';
import { Loader2, ArrowLeft, Printer } from 'lucide-react';

export default function BatchPrintPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const idsParam = searchParams.get('ids');
    const ids = idsParam ? idsParam.split(',') : [];

    const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ids.length) {
            router.push('/reports');
            return;
        }

        const loadData = async () => {
            setLoading(true);
            try {
                const results = await Promise.all(ids.map(id => getQuotationById(id)));
                setQuotations(results.filter((q): q is QuotationRecord => q !== null));
            } catch (err) {
                console.error("Failed to load quotations:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [searchParams]);

    const handlePrintAll = async () => {
        setGenerating(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [215.9, 330.2] });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();

            if (!containerRef.current) return;
            const el = containerRef.current.querySelector('.pdf-container') as HTMLElement || containerRef.current;

            const fullWidth = 816;
            const fullHeight = el.scrollHeight;

            const canvas = await html2canvas(el, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                width: fullWidth,
                height: fullHeight,
                windowWidth: fullWidth,
                windowHeight: fullHeight,
            });

            const imgData = canvas.toDataURL('image/png');
            const imgW = pageW;
            const imgH = (canvas.height * imgW) / canvas.width;

            let yOffset = 0;
            let remaining = imgH;
            while (remaining > 0) {
                if (yOffset > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, -yOffset, imgW, imgH);
                remaining -= pageH;
                yOffset += pageH;
            }

            pdf.autoPrint();
            const stringPdf = pdf.output('bloburl');
            window.open(stringPdf.toString(), '_blank');

        } catch (err) {
            console.error(err);
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-slate-500 font-medium">Preparing documents...</p>
            </div>
        );
    }

    if (quotations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <p className="text-slate-500 font-medium">No valid documents found.</p>
                <button onClick={() => router.push('/reports')} className="text-primary hover:underline">Return to Reports</button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20 p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Batch Print Preview</h1>
                        <p className="text-sm text-slate-500">{quotations.length} document(s) prepared for printing</p>
                    </div>
                </div>
                <button
                    onClick={handlePrintAll}
                    disabled={generating}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold shadow-sm shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                >
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                    {generating ? 'Processing...' : 'Print All Documents'}
                </button>
            </div>

            <div className="flex flex-col items-center">
                <div className="pdf-container relative bg-white border border-slate-300 shadow-md">
                    <BatchPrintRenderer
                        ref={containerRef}
                        quotations={quotations}
                        preparedBy={user ? `${user.FirstName} ${user.LastName}` : 'System Generated'}
                    />
                </div>
            </div>
        </div>
    );
}
