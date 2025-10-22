'use client';

import React, { useState, useEffect } from 'react';
import { Key, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { verifyToken } from '@/lib/jose';

const TokenDecoderPage = () => {
    const [decodedData, setDecodedData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const decodeTokenFromURL = async () => {
            try {
                const params = new URLSearchParams(window.location.search);
                const token = params.get('id');

                if (!token) {
                    setError('No token found in URL. Please provide a token using ?id=YOUR_TOKEN');
                    setLoading(false);
                    return;
                }

                const decoded = await verifyToken(token);
                console.log("decoded => ", decoded);

                if (!decoded || typeof decoded !== 'object') {
                    throw new Error('Invalid token format');
                }

                setDecodedData(decoded);
                setLoading(false);
            } catch (err) {
                console.error('Decoding error:', err);
                setError(err.message || 'Failed to decode token. Please ensure it is a valid token.');
                setLoading(false);
            }
        };

        decodeTokenFromURL();
    }, []);
    const { exp, iat, ...rest } = decodedData || {};
    const entries = decodedData ? Object.entries(rest) : [];

    return (
        <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <header className="text-center mb-12">
                    <div className="flex items-center justify-center mb-4">
                        <div className="bg-indigo-100 p-3 rounded-2xl mr-3">
                            <Key className="w-10 h-10 text-indigo-600" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-gray-900">Product Information</h1>
                    </div>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                        Decode and view token information in a readable format
                    </p>
                </header>

                <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-gray-100">
                    {loading && (
                        <div className="flex items-center justify-center space-x-3 text-indigo-600 py-12">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span className="font-medium text-lg">Decoding token...</span>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-start space-x-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-red-900">Error</p>
                                <p className="text-red-700 text-sm mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {decodedData && !loading && !error && (
                        <>
                            <div className="flex items-start space-x-3 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg mb-6">
                                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="font-semibold text-green-900">Token Decoded Successfully</p>
                                    <p className="text-green-700 text-sm mt-1">Found {entries.length} fields</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-xl border-2 border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                Field
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                Value
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {entries.map(([key, value], idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                    {key}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-700">
                                                    {typeof value === 'object' && value !== null
                                                        ? JSON.stringify(value, null, 2)
                                                        : String(value)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TokenDecoderPage;