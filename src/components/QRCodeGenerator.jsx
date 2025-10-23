"use client";

import React, { useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Download, Copy, Check } from "lucide-react";

const QRCodeGenerator = ({ value = "https://example.com" }) => {
  const svgRef = useRef();
  const [format, setFormat] = useState("svg");
  const [copied, setCopied] = useState(false);

  const downloadQRCode = () => {
    const padding = 20;
    const scaleFactor = 10;
    const svgElement = svgRef.current;
    if (!svgElement) return;

    if (format === "png") {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        canvas.width = img.width * scaleFactor + padding * 2;
        canvas.height = img.height * scaleFactor + padding * 2;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, padding, padding, img.width * scaleFactor, img.height * scaleFactor);
        const pngUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = "qr-code.png";
        link.click();
        URL.revokeObjectURL(url);
      };

      img.src = url;
    } else {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const link = document.createElement("a");
      link.href = svgUrl;
      link.download = "qr-code.svg";
      link.click();
      URL.revokeObjectURL(svgUrl);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy QR data:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-6 bg-gradient-to-b from-white to-gray-50 rounded-3xl shadow-lg border border-gray-100 w-full max-w-xs transition-all duration-300 hover:shadow-xl">

      {/* QR Container */}
      <div className="relative w-fit">
        {/* Top-right icons */}
        <div className="absolute -top-3 -right-3 flex gap-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-lg shadow-sm border border-gray-200">
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-gray-100 rounded-md transition"
            title="Copy QR Data"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-gray-600" />}
          </button>
          <button
            onClick={downloadQRCode}
            className="p-1.5 hover:bg-gray-100 rounded-md transition"
            title="Download QR Code"
          >
            <Download size={16} className="text-gray-600" />
          </button>
        </div>

        <div className="p-4 bg-white rounded-xl shadow-inner border border-gray-200 transition-all duration-300">
          <QRCode ref={svgRef} value={value} size={140} />
        </div>
      </div>

      {/* Format Selector */}
      <div className="flex flex-col items-center w-full">
        <label className="text-sm text-gray-600 font-medium mb-2">
          Export Format
        </label>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="px-3 py-2 w-32 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 hover:border-blue-400 bg-white"
        >
          <option value="png">PNG</option>
          <option value="svg">SVG</option>
        </select>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
