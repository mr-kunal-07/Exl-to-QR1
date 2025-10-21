"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, QrCode, Download, X, AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

// Utility to load external scripts safely
const useScript = (src, globalName) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Check if already loaded
        if (window[globalName]) {
            setLoaded(true);
            return;
        }

        // Check if script tag already exists
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
            const handleLoad = () => {
                if (window[globalName]) {
                    setLoaded(true);
                }
            };
            existingScript.addEventListener('load', handleLoad);
            return () => {
                existingScript.removeEventListener('load', handleLoad);
            };
        }

        // Create new script
        const script = document.createElement('script');
        script.src = src;
        script.async = true;

        const handleLoad = () => {
            if (window[globalName]) {
                setLoaded(true);
            }
        };

        const handleError = () => {
            setError(true);
        };

        script.addEventListener('load', handleLoad);
        script.addEventListener('error', handleError);

        document.head.appendChild(script);

        return () => {
            script.removeEventListener('load', handleLoad);
            script.removeEventListener('error', handleError);
        };
    }, [src, globalName]);

    return { loaded, error };
};

// QR Code Display Component
const QRCodeDisplay = ({ data, rowNumber, displayId }) => {
    const qrContainerRef = useRef(null);
    const [status, setStatus] = useState('loading');
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!qrContainerRef.current || typeof window === 'undefined' || !window.QRCode) {
            return;
        }

        const container = qrContainerRef.current;
        let timeoutId;

        const generateQR = () => {
            if (!mountedRef.current || !container) return;

            try {
                // Clear existing content
                container.innerHTML = '';

                // Create QR code data
                const qrData = JSON.stringify(data);

                // Generate QR code
                new window.QRCode(container, {
                    text: qrData,
                    width: 160,
                    height: 160,
                    colorDark: '#1f2937',
                    colorLight: '#ffffff',
                    correctLevel: window.QRCode.CorrectLevel.M
                });

                if (mountedRef.current) {
                    setStatus('success');
                }
            } catch (err) {
                console.error('QR generation error:', err);
                if (mountedRef.current) {
                    setStatus('error');
                }
            }
        };

        timeoutId = setTimeout(generateQR, 100);

        return () => {
            clearTimeout(timeoutId);
            if (container) {
                container.innerHTML = '';
            }
        };
    }, [data]);

    const handleDownload = useCallback(() => {
        if (!qrContainerRef.current) return;

        const canvas = qrContainerRef.current.querySelector('canvas');
        if (canvas) {
            try {
                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.download = `qr-row-${rowNumber}.png`;
                        link.href = url;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        setTimeout(() => URL.revokeObjectURL(url), 100);
                    }
                }, 'image/png');
            } catch (err) {
                console.error('Download error:', err);
            }
        }
    }, [rowNumber]);

    return (
        <div className="group relative bg-white p-5 border-2 border-gray-200 rounded-2xl shadow-sm hover:shadow-xl hover:border-indigo-400 transition-all duration-300">
            <div className="flex flex-col items-center space-y-3">
                <div className="flex items-center justify-between w-full">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                        Row {rowNumber}
                    </span>
                    {status === 'success' && (
                        <button
                            onClick={handleDownload}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-100 rounded-lg"
                            title="Download QR Code"
                            aria-label={`Download QR code for row ${rowNumber}`}
                        >
                            <Download className="w-4 h-4 text-gray-600" />
                        </button>
                    )}
                </div>

                <div className="relative w-40 h-40 flex items-center justify-center">
                    <div ref={qrContainerRef} className="w-full h-full flex items-center justify-center" />

                    {status === 'loading' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
                            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 rounded-lg p-2">
                            <AlertCircle className="w-6 h-6 text-red-600 mb-1" />
                            <span className="text-xs text-red-600">Generation Failed</span>
                        </div>
                    )}
                </div>

                <p
                    className="text-sm font-medium text-gray-700 truncate max-w-full text-center px-2"
                    title={displayId}
                >
                    {displayId}
                </p>
            </div>
        </div>
    );
};

// Main App Component
export default function ExcelQRGenerator() {
    const [file, setFile] = useState(null);
    const [dataObjects, setDataObjects] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const fileInputRef = useRef(null);

    const MAX_ROWS = 100;

    // Load external libraries
    const xlsx = useScript(
        'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
        'XLSX'
    );
    const qrcode = useScript(
        'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
        'QRCode'
    );

    const librariesReady = xlsx.loaded && qrcode.loaded;
    const libraryError = xlsx.error || qrcode.error;

    const resetState = useCallback(() => {
        setDataObjects([]);
        setHeaders([]);
        setError(null);
        setSuccess(null);
    }, []);

    const processExcelFile = useCallback(async (file) => {
        if (!librariesReady || !window.XLSX) {
            setError('Libraries are still loading. Please wait a moment and try again.');
            return;
        }

        setLoading(true);
        resetState();

        try {
            // Read file
            const arrayBuffer = await file.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);

            // Parse workbook
            const workbook = window.XLSX.read(data, { type: 'array' });

            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error('No sheets found in the Excel file');
            }

            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            if (!worksheet) {
                throw new Error('Could not read the worksheet');
            }

            // Convert to JSON
            const jsonSheet = window.XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: '',
                blankrows: false,
                raw: false
            });

            if (!jsonSheet || jsonSheet.length === 0) {
                throw new Error('The Excel sheet appears to be empty');
            }

            // Filter empty rows
            const nonEmptyRows = jsonSheet.filter(row =>
                Array.isArray(row) && row.some(cell => {
                    if (cell === null || cell === undefined) return false;
                    return String(cell).trim().length > 0;
                })
            );

            if (nonEmptyRows.length < 2) {
                throw new Error('Excel file must contain at least a header row and one data row');
            }

            // Process headers
            const rawHeaders = nonEmptyRows[0];
            const cleanHeaders = rawHeaders.map((h, idx) => {
                if (h === null || h === undefined) return `Column_${idx + 1}`;
                const header = String(h).trim();
                return header.length > 0 ? header : `Column_${idx + 1}`;
            });

            // Handle duplicate headers
            const headerSet = new Set();
            const uniqueHeaders = cleanHeaders.map((h) => {
                let header = h;
                let counter = 1;
                while (headerSet.has(header)) {
                    header = `${h}_${counter}`;
                    counter++;
                }
                headerSet.add(header);
                return header;
            });

            // Process data rows
            const dataRows = nonEmptyRows.slice(1, MAX_ROWS + 1);

            const objects = dataRows.map((row) => {
                const obj = {};
                uniqueHeaders.forEach((header, colIdx) => {
                    const value = row[colIdx];
                    obj[header] = (value === null || value === undefined) ? '' : String(value).trim();
                });
                return obj;
            });

            // Filter out completely empty rows
            const validObjects = objects.filter(obj =>
                Object.values(obj).some(val => val.length > 0)
            );

            if (validObjects.length === 0) {
                throw new Error('No valid data rows found. All rows appear to be empty.');
            }

            setHeaders(uniqueHeaders);
            setDataObjects(validObjects);
            setSuccess(`Successfully processed ${validObjects.length} row${validObjects.length !== 1 ? 's' : ''} from "${sheetName}"`);
        } catch (err) {
            console.error('Processing error:', err);
            setError(err.message || 'Failed to process Excel file. Please ensure it is a valid Excel file.');
        } finally {
            setLoading(false);
        }
    }, [librariesReady, resetState]);

    const handleFileChange = useCallback((e) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        const fileName = selectedFile.name.toLowerCase();
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            setFile(selectedFile);
            processExcelFile(selectedFile);
        } else {
            setError('Please select a valid Excel file (.xlsx or .xls)');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [processExcelFile]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files?.[0];

        if (!droppedFile) return;

        const fileName = droppedFile.name.toLowerCase();
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            setFile(droppedFile);
            processExcelFile(droppedFile);
        } else {
            setError('Please drop a valid Excel file (.xlsx or .xls)');
        }
    }, [processExcelFile]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
    }, []);

    const clearFile = useCallback(() => {
        setFile(null);
        resetState();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [resetState]);

    const downloadAllQRCodes = useCallback(async () => {
        if (typeof window === 'undefined' || !window.QRCode || dataObjects.length === 0) return;

        setSuccess('Preparing downloads... This may take a moment.');

        try {
            const tempContainer = document.createElement('div');
            tempContainer.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
            document.body.appendChild(tempContainer);

            for (let i = 0; i < dataObjects.length; i++) {
                const qrDiv = document.createElement('div');
                tempContainer.appendChild(qrDiv);

                new window.QRCode(qrDiv, {
                    text: JSON.stringify(dataObjects[i]),
                    width: 512,
                    height: 512,
                    colorDark: '#1f2937',
                    colorLight: '#ffffff',
                    correctLevel: window.QRCode.CorrectLevel.H
                });

                await new Promise(resolve => setTimeout(resolve, 150));

                const canvas = qrDiv.querySelector('canvas');
                if (canvas) {
                    await new Promise((resolve) => {
                        canvas.toBlob((blob) => {
                            if (blob) {
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.download = `qr-row-${i + 2}.png`;
                                link.href = url;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                setTimeout(() => URL.revokeObjectURL(url), 100);
                            }
                            resolve();
                        }, 'image/png');
                    });
                }

                if (i < dataObjects.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }

            setTimeout(() => {
                if (tempContainer.parentNode === document.body) {
                    document.body.removeChild(tempContainer);
                }
            }, 1000);

            setSuccess(`Successfully downloaded ${dataObjects.length} QR codes!`);
        } catch (err) {
            console.error('Download error:', err);
            setError('Failed to download QR codes. Please try downloading individually.');
        }
    }, [dataObjects]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <header className="text-center mb-12">
                    <div className="flex items-center justify-center mb-4">
                        <div className="bg-indigo-100 p-3 rounded-2xl mr-3">
                            <QrCode className="w-10 h-10 text-indigo-600" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-gray-900">
                            Excel QR Generator
                        </h1>
                    </div>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                        Transform your Excel data into scannable QR codes instantly. Each row becomes a unique QR code.
                    </p>
                </header>

                {/* Library Status */}
                {!librariesReady && !libraryError && (
                    <div className="mb-8 flex items-center justify-center space-x-3 p-4 bg-indigo-50 rounded-xl">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                        <span className="font-medium text-indigo-900">Loading required libraries...</span>
                    </div>
                )}

                {libraryError && (
                    <div className="mb-8 flex items-center justify-between p-4 bg-red-50 rounded-xl">
                        <div className="flex items-center space-x-3">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            <span className="font-medium text-red-900">Failed to load libraries. Please refresh the page.</span>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            aria-label="Refresh page"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span>Refresh</span>
                        </button>
                    </div>
                )}

                {/* Upload Section */}
                <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border-2 border-gray-100">
                    <div className="flex items-center mb-6">
                        <Upload className="w-6 h-6 text-indigo-600 mr-2" />
                        <h2 className="text-2xl font-bold text-gray-900">Upload Excel File</h2>
                    </div>

                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className="relative border-3 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-indigo-400 transition-colors duration-300 bg-gray-50"
                    >
                        {file ? (
                            <div className="flex items-center justify-center space-x-4 flex-wrap gap-2">
                                <FileSpreadsheet className="w-12 h-12 text-green-600" />
                                <div className="text-left">
                                    <p className="text-lg font-semibold text-gray-900">{file.name}</p>
                                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                                </div>
                                <button
                                    onClick={clearFile}
                                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                                    disabled={loading}
                                    aria-label="Clear selected file"
                                >
                                    <X className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <p className="text-xl font-semibold text-gray-700 mb-2">
                                    Drop your Excel file here
                                </p>
                                <p className="text-gray-500 mb-4">or click to browse</p>
                                <p className="text-sm text-gray-400">Supports .xlsx and .xls formats</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                    disabled={loading || !librariesReady}
                                    aria-label="Upload Excel file"
                                />
                            </>
                        )}
                    </div>

                    {loading && (
                        <div className="mt-6 flex items-center justify-center space-x-3 text-indigo-600">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="font-medium">Processing your file...</span>
                        </div>
                    )}

                    {error && (
                        <div className="mt-6 flex items-start space-x-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-red-900">Error</p>
                                <p className="text-red-700 text-sm mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="mt-6 flex items-start space-x-3 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-green-900">Success</p>
                                <p className="text-green-700 text-sm mt-1">{success}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Data Preview */}
                {dataObjects.length > 0 && (
                    <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border-2 border-gray-100">
                        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                            <div className="flex items-center">
                                <FileSpreadsheet className="w-6 h-6 text-purple-600 mr-2" />
                                <h2 className="text-2xl font-bold text-gray-900">Data Preview</h2>
                            </div>
                            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                Showing {Math.min(dataObjects.length, 10)} of {dataObjects.length} rows
                            </span>
                        </div>

                        <div className="overflow-x-auto rounded-xl border-2 border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Row
                                        </th>
                                        {headers.map((header, idx) => (
                                            <th
                                                key={idx}
                                                className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
                                            >
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {dataObjects.slice(0, 10).map((row, rowIdx) => (
                                        <tr key={rowIdx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                {rowIdx + 2}
                                            </td>
                                            {headers.map((header, colIdx) => (
                                                <td
                                                    key={colIdx}
                                                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                                                >
                                                    {row[header] || '-'}
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
                {dataObjects.length > 0 && librariesReady && (
                    <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-gray-100">
                        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                            <div className="flex items-center">
                                <QrCode className="w-6 h-6 text-green-600 mr-2" />
                                <h2 className="text-2xl font-bold text-gray-900">Generated QR Codes</h2>
                                <span className="ml-3 text-sm text-gray-500 bg-green-100 px-3 py-1 rounded-full">
                                    {dataObjects.length} {dataObjects.length === 1 ? 'code' : 'codes'}
                                </span>
                            </div>
                            <button
                                onClick={downloadAllQRCodes}
                                className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95"
                                aria-label="Download all QR codes"
                            >
                                <Download className="w-4 h-4" />
                                <span>Download All</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {dataObjects.map((row, idx) => {
                                const displayId = row[headers[0]] || `Row ${idx + 2}`;
                                return (
                                    <QRCodeDisplay
                                        key={`qr-${idx}`}
                                        data={row}
                                        rowNumber={idx + 2}
                                        displayId={displayId}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!file && !loading && librariesReady && (
                    <div className="text-center py-20">
                        <div className="bg-gray-100 w-32 h-32 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <QrCode className="w-16 h-16 text-gray-300" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-400 mb-2">Ready to Generate QR Codes</h3>
                        <p className="text-gray-500">Upload an Excel file (.xlsx or .xls) to get started</p>
                    </div>
                )}
            </div>
        </div>
    );
}