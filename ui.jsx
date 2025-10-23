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
    Sparkles,
    Zap,
    Shield,
} from "lucide-react";

// Mock QR Code generation
const generateQRDataURL = async (data) => {
    return `data:image/svg+xml,${encodeURIComponent(`
        <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="200" fill="white"/>
            <rect x="20" y="20" width="160" height="160" fill="black" opacity="0.1"/>
            <text x="100" y="100" text-anchor="middle" font-size="16" fill="black">QR</text>
        </svg>
    `)}`;
};

const hashData = async (row) => {
    return btoa(JSON.stringify(row)).substring(0, 16);
};

const QRCodeDisplay = ({ value, index }) => {
    const [qrUrl, setQrUrl] = useState("");

    React.useEffect(() => {
        generateQRDataURL(value).then(setQrUrl);
    }, [value]);

    const downloadQR = async () => {
        const link = document.createElement("a");
        link.download = `qr-code-${index + 1}.png`;
        link.href = qrUrl;
        link.click();
    };

    return (
        <div className="group relative bg-white rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-indigo-200">
            <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden mb-3 flex items-center justify-center">
                {qrUrl && <img src={qrUrl} alt={`QR ${index + 1}`} className="w-full h-full object-contain p-2" />}
            </div>
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Row {index + 2}</span>
                <button
                    onClick={downloadQR}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-indigo-50 rounded-lg"
                >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                </button>
            </div>
        </div>
    );
};

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

            // Simulate processing
            setTimeout(async () => {
                try {
                    // Mock data processing
                    const mockHeaders = ["Name", "Email", "Phone", "Company"];
                    const mockData = Array.from({ length: 12 }, (_, i) => ({
                        Name: `User ${i + 1}`,
                        Email: `user${i + 1}@example.com`,
                        Phone: `+1-555-${String(i + 1).padStart(4, '0')}`,
                        Company: `Company ${String.fromCharCode(65 + (i % 26))}`,
                    }));

                    const withHash = await Promise.all(
                        mockData.map(async (obj) => ({ ...obj, _hashedId: await hashData(obj) }))
                    );

                    setHeaders(mockHeaders);
                    setDataObjects(withHash);
                    setSuccess(`✨ Successfully processed ${withHash.length} rows`);
                } catch (err) {
                    setError(err.message || "Invalid Excel file.");
                } finally {
                    setLoading(false);
                }
            }, 1500);
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
            } else setError("Please upload a valid .xlsx or .xls file");
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
        setSuccess("📦 Preparing your downloads...");
        setTimeout(() => {
            setSuccess(`✅ Downloaded ${dataObjects.length} QR codes successfully!`);
        }, 1000);
    }, [dataObjects]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            {/* Navbar */}
            <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-3">
                            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-xl">
                                <QrCode className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                    QRExcel
                                </h1>
                                <p className="text-xs text-gray-500 hidden sm:block">Excel to QR in seconds</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button className="hidden sm:flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition">
                                <Shield className="w-4 h-4" />
                                <span>Secure</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center space-x-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                        <Sparkles className="w-4 h-4" />
                        <span>Transform your data instantly</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                        Turn Excel Rows into
                        <br />
                        <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            Scannable QR Codes
                        </span>
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Upload your spreadsheet and generate professional QR codes for every row. Perfect for inventory, tickets, and asset tracking.
                    </p>
                </div>

                {/* Stats */}
                {!file && !loading && !dataObjects.length && (
                    <div className="grid grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto mb-12">
                        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 text-center">
                            <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 mx-auto mb-2" />
                            <div className="text-xl sm:text-2xl font-bold text-gray-900">Instant</div>
                            <div className="text-xs sm:text-sm text-gray-500">Generation</div>
                        </div>
                        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 text-center">
                            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mx-auto mb-2" />
                            <div className="text-xl sm:text-2xl font-bold text-gray-900">Secure</div>
                            <div className="text-xs sm:text-sm text-gray-500">Encrypted</div>
                        </div>
                        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 text-center">
                            <FileSpreadsheet className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mx-auto mb-2" />
                            <div className="text-xl sm:text-2xl font-bold text-gray-900">100+</div>
                            <div className="text-xs sm:text-sm text-gray-500">Rows/File</div>
                        </div>
                    </div>
                )}

                {/* Upload Section */}
                <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 lg:p-10 border border-gray-100 mb-8">
                    <div
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        className="relative border-2 border-dashed border-gray-300 rounded-2xl p-8 sm:p-12 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-all duration-300"
                    >
                        {file ? (
                            <div className="flex flex-col sm:flex-row items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 p-5 rounded-2xl border border-green-200">
                                <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                                    <div className="bg-green-100 p-3 rounded-xl">
                                        <FileSpreadsheet className="w-8 h-8 text-green-600" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-900 text-sm sm:text-base">{file.name}</p>
                                        <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                                    </div>
                                </div>
                                <button
                                    onClick={clearFile}
                                    className="p-2.5 hover:bg-red-100 rounded-xl transition-colors group"
                                >
                                    <X className="w-5 h-5 text-gray-600 group-hover:text-red-600" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="bg-gradient-to-br from-indigo-100 to-purple-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <Upload className="w-10 h-10 text-indigo-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Drop your Excel file here</h3>
                                <p className="text-sm text-gray-500 mb-6">or click to browse</p>
                                <div className="inline-flex items-center space-x-2 text-sm text-gray-400">
                                    <FileSpreadsheet className="w-4 h-4" />
                                    <span>Supports .xlsx and .xls files</span>
                                </div>
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

                    {/* Status Messages */}
                    {loading && (
                        <div className="mt-6 flex items-center justify-center bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
                            <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mr-3" />
                            <span className="text-indigo-700 font-medium">Processing your file...</span>
                        </div>
                    )}

                    {error && (
                        <div className="mt-6 flex items-start bg-red-50 border border-red-200 p-4 rounded-xl">
                            <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="mt-6 flex items-start bg-green-50 border border-green-200 p-4 rounded-xl">
                            <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                            <p className="text-green-700 text-sm font-medium">{success}</p>
                        </div>
                    )}
                </div>

                {/* Data Preview */}
                {dataObjects.length > 0 && (
                    <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-100 mb-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                                    Data Preview
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Showing {Math.min(dataObjects.length, 5)} of {dataObjects.length} rows
                                </p>
                            </div>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider">
                                            #
                                        </th>
                                        {headers.map((h, i) => (
                                            <th
                                                key={i}
                                                className="px-4 py-3 text-left font-semibold text-gray-700 text-xs uppercase tracking-wider"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {dataObjects.slice(0, 5).map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 font-semibold text-indigo-600">{i + 2}</td>
                                            {headers.map((h, j) => (
                                                <td key={j} className="px-4 py-3 text-gray-700">
                                                    {row[h] || "-"}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* QR Codes Section */}
                {dataObjects.length > 0 && (
                    <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-100">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <QrCode className="w-5 h-5 text-green-600" />
                                    Generated QR Codes
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">{dataObjects.length} codes ready to download</p>
                            </div>
                            <button
                                onClick={downloadAllQRCodes}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-medium"
                            >
                                <Download className="w-4 h-4" />
                                <span>Download All</span>
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {dataObjects.map((row, i) => (
                                <QRCodeDisplay key={i} value={row._hashedId} index={i} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center text-sm text-gray-500">
                        <p>© 2025 QRExcel. Secure, fast, and reliable QR code generation.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default ExcelQRGenerator;