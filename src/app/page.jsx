"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, QrCode, Download, X, AlertCircle, CheckCircle2, Loader2, RefreshCw, Scan } from 'lucide-react';
import QRCodeLib from 'qrcode';
import * as XLSX from 'xlsx';
import jsQR from 'jsqr';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import { signToken } from '@/lib/jose';

const hashData = async (row) => {
    console.log(row);
  return await signToken(row);
}

const QRScanner = ({ onScanSuccess, onClose }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState(null);
    const [permissionStatus, setPermissionStatus] = useState('prompt');
    const animationFrameRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        checkPermissionStatus();
        return () => stopCamera();
    }, []);

    const checkPermissionStatus = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError('Camera access is not supported in this browser. Please use a modern browser like Chrome, Firefox, Safari, or Edge.');
                setPermissionStatus('denied');
                return;
            }

            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const result = await navigator.permissions.query({ name: 'camera' });
                    setPermissionStatus(result.state);

                    result.addEventListener('change', () => {
                        setPermissionStatus(result.state);
                    });

                    if (result.state === 'granted') {
                        requestCameraPermission();
                    }
                } catch (err) {
                    console.log('Permission query not supported, will request directly');
                }
            }
        } catch (err) {
            console.log('Permission API not supported:', err);
        }
    };

    const requestCameraPermission = async () => {
        setPermissionStatus('requesting');
        setError(null);

        try {
            let stream = null;

            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { exact: 'environment' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });
            } catch (err) {
                console.log('Back camera not available, trying front camera...');

                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: 'user',
                            width: { ideal: 1280 },
                            height: { ideal: 720 }
                        }
                    });
                } catch (err2) {
                    console.log('Front camera not available, trying default camera...');

                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: { ideal: 1280 },
                            height: { ideal: 720 }
                        }
                    });
                }
            }

            if (videoRef.current && stream) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                await videoRef.current.play();
                setScanning(true);
                setPermissionStatus('granted');
                scanQRCode();
            }
        } catch (err) {
            console.error('Camera error:', err);
            setPermissionStatus('denied');

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError('Camera permission was denied. Please allow camera access in your browser settings to scan QR codes.');
            } else if (err.name === 'NotFoundError') {
                setError('No camera found on this device. Please ensure your device has a camera.');
            } else if (err.name === 'NotReadableError') {
                setError('Camera is already in use by another application. Please close other apps using the camera.');
            } else if (err.name === 'OverconstrainedError') {
                setError('Camera settings are not supported on this device. Please try a different device.');
            } else if (err.name === 'SecurityError') {
                setError('Camera access is blocked due to security settings. Please check your browser permissions.');
            } else if (err.name === 'AbortError') {
                setError('Camera access was aborted. Please try again.');
            } else {
                setError(`Unable to access camera: ${err.message || 'Unknown error'}. Please check your browser settings and try again.`);
            }
        }
    };

    const stopCamera = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        setScanning(false);
    };

    const scanQRCode = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            if (canvas.width > 0 && canvas.height > 0) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: 'dontInvert'
                });

                if (code && code.data) {
                    try {
                        const data = JSON.parse(code.data);
                        if (typeof data === 'object' && data !== null) {
                            stopCamera();
                            onScanSuccess(data);
                            return;
                        }
                    } catch (err) {
                        console.log('QR code contains non-JSON data:', err);
                    }
                }
            }
        }

        if (scanning) {
            animationFrameRef.current = requestAnimationFrame(scanQRCode);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full relative shadow-2xl">
                <button
                    onClick={() => {
                        stopCamera();
                        onClose();
                    }}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
                    aria-label="Close scanner"
                >
                    <X className="w-6 h-6 text-gray-600" />
                </button>

                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Scan QR Code</h2>
                    <p className="text-gray-600 text-sm">
                        {permissionStatus === 'granted' && scanning
                            ? 'Position the QR code within the frame'
                            : permissionStatus === 'requesting'
                                ? 'Requesting camera access...'
                                : permissionStatus === 'denied'
                                    ? 'Camera access denied'
                                    : 'Camera access required'}
                    </p>
                </div>

                {permissionStatus === 'prompt' && !error ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-indigo-50 rounded-xl">
                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                            <Scan className="w-8 h-8 text-indigo-600" />
                        </div>
                        <p className="text-gray-900 font-semibold mb-2 text-center">Camera Access Required</p>
                        <p className="text-gray-600 text-sm text-center mb-6 max-w-md">
                            To scan QR codes, we need permission to access your device's camera.
                            Click the button below and select "Allow" when prompted by your browser.
                        </p>
                        <button
                            onClick={requestCameraPermission}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
                        >
                            <Scan className="w-5 h-5" />
                            <span>Enable Camera</span>
                        </button>
                    </div>
                ) : permissionStatus === 'requesting' ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-blue-50 rounded-xl">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                        <p className="text-blue-900 font-semibold mb-2">Requesting Permission...</p>
                        <p className="text-blue-700 text-sm text-center max-w-md">
                            Please check your browser for a permission prompt and click "Allow" to grant camera access.
                        </p>
                    </div>
                ) : (permissionStatus === 'denied' || error) ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-xl">
                        <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
                        <p className="text-red-900 font-semibold mb-2">Camera Access Blocked</p>
                        <p className="text-red-700 text-sm text-center mb-4 max-w-md">
                            {error || 'Camera permission was denied. To scan QR codes, you need to allow camera access.'}
                        </p>
                        <div className="bg-white p-4 rounded-lg border border-red-200 mb-4 max-w-md">
                            <p className="text-sm text-gray-700 font-semibold mb-2">To enable camera access:</p>
                            <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                                <li>Click the camera icon in your browser's address bar</li>
                                <li>Select "Allow" for camera permissions</li>
                                <li>Refresh this page or click "Try Again" below</li>
                            </ol>
                        </div>
                        <button
                            onClick={requestCameraPermission}
                            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
                        >
                            <RefreshCw className="w-5 h-5" />
                            <span>Try Again</span>
                        </button>
                    </div>
                ) : (
                    <div className="relative">
                        <video
                            ref={videoRef}
                            className="w-full rounded-xl bg-black"
                            playsInline
                            muted
                        />
                        <canvas ref={canvasRef} className="hidden" />

                        {scanning && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-64 h-64 border-4 border-green-500 rounded-2xl relative">
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-xl"></div>
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-xl"></div>
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-xl"></div>
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-xl"></div>
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                        <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// QR Code Display Component
const QRCodeDisplay = ({ data, rowNumber, displayId }) => {
    const [status, setStatus] = useState('loading');
    const [qrDataUrl, setQrDataUrl] = useState('');

    useEffect(() => {
        let isMounted = true;
        const generateQR = async () => {
            try {
                const dataUrl = await QRCodeLib.toDataURL(JSON.stringify(data), {
                    width: 200,
                    margin: 1,
                    color: {
                        dark: '#1f2937',
                        light: '#ffffff'
                    },
                    errorCorrectionLevel: 'M'
                });

                if (isMounted) {
                    setQrDataUrl(dataUrl);
                    setStatus('success');
                }
            } catch (err) {
                console.error('QR generation error:', err);
                if (isMounted) setStatus('error');
            }
        };

        generateQR();
        return () => {
            isMounted = false;
        };
    }, [data]);

    const handleDownload = useCallback(() => {
        if (!qrDataUrl) return;

        const link = document.createElement('a');
        link.download = `qr-row-${rowNumber}.png`;
        link.href = qrDataUrl;
        link.click();
    }, [qrDataUrl, rowNumber]);

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
                        >
                            <Download className="w-4 h-4 text-gray-600" />
                        </button>
                    )}
                </div>

                <div className="relative w-[200px] h-[200px] flex items-center justify-center bg-white rounded-lg">
                    <div className="w-full h-full flex items-center justify-center">
                        {qrDataUrl && <img src={qrDataUrl} alt={`QR Code for ${displayId}`} className="w-full h-full" />}
                    </div>
                    {status === 'loading' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 rounded-lg p-4">
                            <AlertCircle className="w-8 h-8 text-red-600 mb-2" />
                            <span className="text-xs text-red-600 text-center">Generation Failed</span>
                        </div>
                    )}
                </div>

                <p className="text-sm font-medium text-gray-700 truncate max-w-full text-center px-2" title={displayId}>
                    {displayId}
                </p>
            </div>
        </div>
    );
};

// Scanned Data Display Component
const ScannedDataDisplay = ({ scannedData, onClose }) => {
    if (!scannedData || Object.keys(scannedData).length === 0) return null;

    const entries = Object.entries(scannedData);

    const formatValue = (value) => {
        if (value === null || value === undefined) return '-';
        if (typeof value === 'object') return JSON.stringify(value, null, 2);
        return String(value);
    };

    const formatKey = (key) => {
        return key
            .replace(/[_-]/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-auto relative shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
                    aria-label="Close"
                >
                    <X className="w-6 h-6 text-gray-500" />
                </button>

                <div className="mb-8">
                    <div className="flex items-center mb-3">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-3">
                            <CheckCircle2 className="w-7 h-7 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900">Scanned QR Data</h2>
                            <p className="text-gray-500 text-sm mt-1">Information extracted from the QR code</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr className="bg-gradient-to-r from-green-50 to-emerald-50">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-1/3">
                                        Field Name
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-2/3">
                                        Value
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {entries.map(([key, value], idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 align-top whitespace-normal break-words">
                                            {formatKey(key)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700 align-top whitespace-pre-wrap break-words">
                                            {formatValue(value)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-8 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                        Total fields: <span className="font-semibold text-gray-700">{entries.length}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                    >
                        Close
                    </button>
                </div>
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
    const [showScanner, setShowScanner] = useState(false);
    const [scannedData, setScannedData] = useState(null);
    const fileInputRef = useRef(null);

    const MAX_ROWS = 100;

    const resetState = useCallback(() => {
        setDataObjects([]);
        setHeaders([]);
        setError(null);
        setSuccess(null);
    }, []);
    
    const handleScanSuccess = useCallback((data) => {
        setScannedData(data);
        setShowScanner(false);
        setSuccess('QR code scanned successfully!');
    }, []);

   const processExcelFile = useCallback(async (file) => {
        setLoading(true);
        resetState();

        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

            if (!workbook.SheetNames?.length) throw new Error('No sheets found in the Excel file');

            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            if (!worksheet) throw new Error('Could not read the worksheet');

            const jsonSheet = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: '',
                blankrows: false,
                raw: false
            });

            if (!jsonSheet?.length) throw new Error('The Excel sheet appears to be empty');

            const nonEmptyRows = jsonSheet.filter(row =>
                Array.isArray(row) && row.some(cell => String(cell || '').trim().length > 0)
            );

            if (nonEmptyRows.length < 2) throw new Error('Excel file must contain at least a header row and one data row');

            const rawHeaders = nonEmptyRows[0];
            const cleanHeaders = rawHeaders.map((h, idx) => {
                const header = String(h || '').trim();
                return header.length > 0 ? header : `Column_${idx + 1}`;
            });

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

            const dataRows = nonEmptyRows.slice(1, MAX_ROWS + 1);
            const objects = dataRows.map((row) => {
                const obj = {};
                uniqueHeaders.forEach((header, colIdx) => {
                    const value = row[colIdx];
                    obj[header] = String(value ?? '').trim();
                });
                return obj;
            });

            const validObjects = objects.filter(obj => Object.values(obj).some(val => val.length > 0));

            if (!validObjects.length) throw new Error('No valid data rows found. All rows appear to be empty.');

            const objectsWithHash = await Promise.all(
                validObjects.map(async (obj) => ({
                    ...obj,
                    _hashedId: await hashData(obj)
                }))
            );

            setHeaders(uniqueHeaders);
            setDataObjects(objectsWithHash);
            setSuccess(`Successfully processed ${objectsWithHash.length} row${objectsWithHash.length !== 1 ? 's' : ''} from "${sheetName}"`);
        } catch (err) {
            console.error('Processing error:', err);
            setError(err.message || 'Failed to process Excel file. Please ensure it is a valid Excel file.');
        } finally {
            setLoading(false);
        }
    }, [resetState]);

    console.log(dataObjects);
    const handleFileChange = useCallback((e) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (selectedFile.name.toLowerCase().match(/\.(xlsx|xls)$/)) {
            setFile(selectedFile);
            processExcelFile(selectedFile);
        } else {
            setError('Please select a valid Excel file (.xlsx or .xls)');
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [processExcelFile]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files?.[0];
        if (!droppedFile) return;

        if (droppedFile.name.toLowerCase().match(/\.(xlsx|xls)$/)) {
            setFile(droppedFile);
            processExcelFile(droppedFile);
        } else {
            setError('Please drop a valid Excel file (.xlsx or .xls)');
        }
    }, [processExcelFile]);

    const clearFile = useCallback(() => {
        setFile(null);
        resetState();
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [resetState]);

    const downloadAllQRCodes = useCallback(async () => {
        if (!dataObjects.length) return;

        setSuccess('Preparing downloads... This may take a moment.');

        try {
            for (let i = 0; i < dataObjects.length; i++) {
                const dataUrl = await QRCodeLib.toDataURL(JSON.stringify(dataObjects[i]), {
                    width: 512,
                    margin: 2,
                    color: {
                        dark: '#1f2937',
                        light: '#ffffff'
                    },
                    errorCorrectionLevel: 'H'
                });

                const link = document.createElement('a');
                link.download = `qr-row-${i + 2}.png`;
                link.href = dataUrl;
                link.click();

                if (i < dataObjects.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }

            setSuccess(`Successfully downloaded ${dataObjects.length} QR codes!`);
        } catch (err) {
            console.error('Download error:', err);
            setError('Failed to download QR codes. Please try downloading individually.');
        }
    }, [dataObjects]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <header className="text-center mb-12">
                    <div className="flex items-center justify-center mb-4">
                        <div className="bg-indigo-100 p-3 rounded-2xl mr-3">
                            <QrCode className="w-10 h-10 text-indigo-600" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-gray-900">Excel QR Generator</h1>
                    </div>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                        Transform your Excel data into scannable QR codes instantly. Each row becomes a unique QR code.
                    </p>

                    <div className="mt-6">
                        <button
                            onClick={() => setShowScanner(true)}
                            className="inline-flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
                        >
                            <Scan className="w-5 h-5" />
                            <span>Scan QR Code</span>
                        </button>
                    </div>
                </header>

                <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border-2 border-gray-100">
                    <div className="flex items-center mb-6">
                        <Upload className="w-6 h-6 text-indigo-600 mr-2" />
                        <h2 className="text-2xl font-bold text-gray-900">Upload Excel File</h2>
                    </div>

                    <div
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
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
                                >
                                    <X className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <p className="text-xl font-semibold text-gray-700 mb-2">Drop your Excel file here</p>
                                <p className="text-gray-500 mb-4">or click to browse</p>
                                <p className="text-sm text-gray-400">Supports .xlsx and .xls formats</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                    disabled={loading}
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
                                <thead className="bg-linear-to-r from-indigo-50 to-purple-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Row</th>
                                        {headers.map((header, idx) => (
                                            <th key={idx} className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {dataObjects.slice(0, 10).map((row, rowIdx) => (
                                        <tr key={rowIdx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{rowIdx + 2}</td>
                                            {headers.map((header, colIdx) => (
                                                <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
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

                {dataObjects.length > 0 && (
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
                            >
                                <Download className="w-4 h-4" />
                                <span>Download All</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {dataObjects.map((row, idx) => (
                                <QRCodeGenerator
                                    key={idx}
                                    value={`http://localhost:3000/product?id=${row._hashedId}`}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {!file && !loading && (
                    <div className="text-center py-20">
                        <div className="bg-gray-100 w-32 h-32 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <QrCode className="w-16 h-16 text-gray-300" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-400 mb-2">Ready to Generate QR Codes</h3>
                        <p className="text-gray-500">Upload an Excel file (.xlsx or .xls) to get started</p>
                    </div>
                )}
            </div>

            {showScanner && (
                <QRScanner
                    onScanSuccess={handleScanSuccess}
                    onClose={() => setShowScanner(false)}
                />
            )}

            {scannedData && (
                <ScannedDataDisplay
                    scannedData={scannedData}
                    onClose={() => setScannedData(null)}
                />
            )}
        </div>
    );
}