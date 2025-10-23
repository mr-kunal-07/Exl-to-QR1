"use client";

import React, { useState, useCallback, useRef } from "react";
import {
    Upload,
    FileSpreadsheet,
    QrCode,
    Download,
    X,
    AlertCircle,
    CheckCircle2,
    Loader2,
} from "lucide-react";
import QRCodeLib from "qrcode";
import * as XLSX from "xlsx";
import QRCodeGenerator from "@/components/QRCodeGenerator";
import { signToken } from "@/lib/jose";

const hashData = async (row) => await signToken(row);

const ExcelQRGenerator = () => {
    const [file, setFile] = useState(null);
    const [dataObjects, setDataObjects] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const fileInputRef = useRef(null);
    const MAX_ROWS = 100;

    const resetState = useCallback(() => {
        setDataObjects([]);
        setHeaders([]);
        setError(null);
        setSuccess(null);
    }, []);

    const processExcelFile = useCallback(
        async (file) => {
            setLoading(true);
            resetState();
            try {
                const arrayBuffer = await file.arrayBuffer();
                const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonSheet = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    defval: "",
                    blankrows: false,
                    raw: false,
                });

                const rows = jsonSheet.filter(
                    (r) => Array.isArray(r) && r.some((c) => String(c || "").trim().length)
                );
                const headers = rows[0].map((h, i) => h || `Column_${i + 1}`);
                const data = rows.slice(1, MAX_ROWS + 1).map((r) =>
                    headers.reduce((acc, h, i) => ({ ...acc, [h]: String(r[i] ?? "").trim() }), {})
                );

                const valid = data.filter((obj) => Object.values(obj).some((v) => v.length));
                const withHash = await Promise.all(
                    valid.map(async (obj) => ({ ...obj, _hashedId: await hashData(obj) }))
                );

                setHeaders(headers);
                setDataObjects(withHash);
                setSuccess(`Processed ${withHash.length} row${withHash.length > 1 ? "s" : ""}`);
            } catch (err) {
                setError(err.message || "Invalid Excel file.");
            } finally {
                setLoading(false);
            }
        },
        [resetState]
    );

    const handleFileChange = useCallback(
        (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (/\.(xlsx|xls)$/i.test(f.name)) {
                setFile(f);
                processExcelFile(f);
            } else setError("Upload a valid .xlsx or .xls file");
        },
        [processExcelFile]
    );

    const handleDrop = useCallback(
        (e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f && /\.(xlsx|xls)$/i.test(f.name)) {
                setFile(f);
                processExcelFile(f);
            } else setError("Invalid file type");
        },
        [processExcelFile]
    );

    const clearFile = useCallback(() => {
        setFile(null);
        resetState();
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [resetState]);

    const downloadAllQRCodes = useCallback(async () => {
        if (!dataObjects.length) return;
        setSuccess("Preparing downloads...");
        try {
            for (let i = 0; i < dataObjects.length; i++) {
                const dataUrl = await QRCodeLib.toDataURL(JSON.stringify(dataObjects[i]), {
                    width: 512,
                    margin: 2,
                    color: { dark: "#1f2937", light: "#fff" },
                    errorCorrectionLevel: "H",
                });
                const link = document.createElement("a");
                link.download = `qr-row-${i + 2}.png`;
                link.href = dataUrl;
                link.click();
                if (i < dataObjects.length - 1) await new Promise((r) => setTimeout(r, 300));
            }
            setSuccess(`Downloaded ${dataObjects.length} QR codes`);
        } catch {
            setError("Failed to download QR codes.");
        }
    }, [dataObjects]);

    return (
        <div className="min-h-screen bg-gray-200">
            {/* Top Navigation Bar */}
            <nav className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-lg">
                                <QrCode className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold text-slate-900">QRCode By KodX</h1>
                                <p className="text-xs text-slate-500">Excel to QR Generator</p>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 py-2">
                {/* Upload Section */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900">Upload File</h3>
                            {file && (
                                <button
                                    onClick={clearFile}
                                    className="text-sm text-slate-600 hover:text-slate-900 font-medium"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        <div
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            className="relative border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                            {file ? (
                                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <div className="bg-green-100 p-2 rounded">
                                        <FileSpreadsheet className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-medium text-slate-900">{file.name}</p>
                                        <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                                    </div>
                                    <button
                                        onClick={clearFile}
                                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                                    <p className="text-base font-medium text-slate-900 mb-1">
                                        Drop your Excel file here, or click to browse
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        Supports .xlsx and .xls files up to 10MB
                                    </p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        disabled={loading}
                                    />
                                </>
                            )}
                        </div>

                        {loading && (
                            <div className="mt-4 flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                <span className="text-sm font-medium text-blue-900">Processing file...</span>
                            </div>
                        )}

                        {error && (
                            <div className="mt-4 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                <p className="text-sm text-red-900">{error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="mt-4 flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                                <p className="text-sm text-green-900">{success}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Data Table */}
                {dataObjects.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileSpreadsheet className="w-5 h-5 text-slate-600" />
                                    <h3 className="text-lg font-semibold text-slate-900">Data Preview</h3>
                                </div>
                                <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg">
                                    {dataObjects.length} rows
                                </span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Row
                                        </th>
                                        {headers.map((h, i) => (
                                            <th
                                                key={i}
                                                className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {dataObjects.slice(0, 10).map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                                {i + 2}
                                            </td>
                                            {headers.map((h, j) => (
                                                <td key={j} className="px-6 py-4 text-sm text-slate-600">
                                                    {row[h] || "-"}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {dataObjects.length > 10 && (
                            <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
                                <p className="text-sm text-slate-600">
                                    Showing 10 of {dataObjects.length} rows
                                </p>
                            </div>
                        )}
                    </div>
                )}
                {/* QR Code Section */}
                {dataObjects.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <QrCode className="w-5 h-5 text-slate-600" />
                                    <h3 className="text-lg font-semibold text-slate-900">Generated QR Codes</h3>
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                                        {dataObjects.length} codes
                                    </span>
                                </div>
                                <button
                                    onClick={downloadAllQRCodes}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                                >
                                    <Download className="w-4 h-4" />
                                    Download All
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {dataObjects.map((row, i) => (
                                    <QRCodeGenerator key={i} value={`http://localhost:3000/product?id=${row._hashedId}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!file && !loading && !dataObjects.length && (
                    <div className="text-center py-20">
                        <div className="bg-gray-100 w-28 h-28 rounded-3xl flex items-center justify-center mx-auto mb-4">
                            <QrCode className="w-14 h-14 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-400">No file uploaded</h3>
                        <p className="text-sm text-gray-500">Upload an Excel file to start</p>
                    </div>
                )}
                
            </div>
            
           
        </div>
        
    );
};

export default ExcelQRGenerator;
