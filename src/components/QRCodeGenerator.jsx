"use client";
import React, { useRef, useState } from "react";
import QRCode from "react-qr-code";

const QRCodeGenerator = ({ value }) => {
  const svgRef = useRef();
  const [isHovered, setIsHovered] = useState(false);
  const [format, setFormat] = useState("svg");

  const downloadQRCode = () => {
    const padding = 20;
    const scaleFactor = 10; 

    if (format === "png") {
      const svgElement = svgRef.current;
      if (svgElement) {
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
      }
    } else if (format === "svg") {
      const svgElement = svgRef.current;
      if (svgElement) {
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);
        const svgBlob = new Blob([svgString], {
          type: "image/svg+xml;charset=utf-8",
        });
        const svgUrl = URL.createObjectURL(svgBlob);
        const link = document.createElement("a");
        link.href = svgUrl;
        link.download = "qr-code.svg";
        link.click();
        URL.revokeObjectURL(svgUrl);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 justify-center items-center ">
      <div   
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ position: "relative", display: "inline-block" }}
      >
        <QRCode ref={svgRef} value={value} size={90} />

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            color: "white",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
            letterSpacing: "1.5px",
            transition: "all 0.3s ease-in-out",
          }}
          onClick={downloadQRCode}
          className=" text-[0.01rem] hover:text-[0.7rem] font-semibold opacity-0 hover:opacity-100"
        >
          Download
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <label>
          Format:
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            style={{ marginLeft: "5px", padding: "5px", fontSize: "14px" }}
          >
            <option value="png">PNG</option>
            <option value="svg">SVG</option>
          </select>
        </label>
      </div>
    </div>
  );
};

export default QRCodeGenerator;