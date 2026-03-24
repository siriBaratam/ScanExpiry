import { useState, useRef } from "react";
import { createWorker } from "tesseract.js";
import { productsApi } from "../api/client";
import AddProductForm from "./AddProductForm";

function ScanProduct({ onClose, onProductAdded }) {
  const [step, setStep] = useState("capture"); // capture, processing, review
  const [image, setImage] = useState(null);
  const [extractedData, setExtractedData] = useState({});
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      videoRef.current.play();
    } catch (err) {
      setError("Camera access denied or not available");
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const captureImage = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg");
    setImage(imageData);
    stopCamera();
    processImage(imageData);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result);
        processImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (imageData) => {
    setStep("processing");
    setError("");

    try {
      // Try backend OCR first, fallback to client-side
      let parsedData;
      try {
        const response = await productsApi.ocr(imageData);
        parsedData = response.parsedData;
        parsedData.ocr_confidence = response.confidence ?? null;
      } catch (backendError) {
        console.warn("Backend OCR failed, using client-side:", backendError);
        // Fallback to client-side OCR
        const worker = await createWorker("eng");
        await worker.setParameters({
          tessedit_char_whitelist:
            "0123456789/.-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ",
        });

        const {
          data: { text, confidence },
        } = await worker.recognize(imageData);
        await worker.terminate();
        parsedData = parseOCRText(text);
        parsedData.ocr_confidence = Number.isFinite(confidence)
          ? Number(confidence.toFixed(2))
          : null;
      }

      setExtractedData(parsedData);
      setStep("review");
    } catch (err) {
      console.error("OCR error:", err);
      setError(
        "Failed to process image. Please try again or enter details manually.",
      );
      setStep("capture");
    }
  };

  const parseOCRText = (text) => {
    const data = {
      name: "",
      category: "",
      expiry_date: "",
      manufacture_date: "",
      best_before_date: "",
    };

    const cleanText = text.toLowerCase().replace(/\s+/g, " ").trim();

    const labeledDates = [
      {
        key: "expiry_date",
        regex:
          /(?:exp(?:iry)?|expires?|valid\s+till)[:\s]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i,
      },
      {
        key: "manufacture_date",
        regex:
          /(?:mfg|manufacture(?:d)?(?:\s+on)?)[:\s]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i,
      },
      {
        key: "best_before_date",
        regex:
          /best before[:\s]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i,
      },
    ];

    for (const item of labeledDates) {
      const match = text.match(item.regex);
      if (match && match[1]) {
        const normalizedDate = normalizeDate(match[1]);
        if (normalizedDate) {
          data[item.key] = normalizedDate;
        }
      }
    }

    if (!data.expiry_date) {
      const genericDatePattern =
        /([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/g;
      let match;
      while ((match = genericDatePattern.exec(text)) !== null) {
        const normalizedDate = normalizeDate(match[1]);
        if (normalizedDate) {
          data.expiry_date = normalizedDate;
          break;
        }
      }
    }

    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 2);
    if (lines.length > 0) {
      data.name =
        lines.find((line) => !/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(line)) ||
        lines[0];
    }

    const categoryMap = [
      { cat: "Dairy", terms: ["milk", "cheese", "yogurt", "butter"] },
      { cat: "Bakery", terms: ["bread", "flour", "cake", "bun"] },
      { cat: "Beverages", terms: ["soda", "juice", "water", "tea", "coffee"] },
      { cat: "Meat", terms: ["chicken", "beef", "pork", "fish", "sausage"] },
      {
        cat: "Produce",
        terms: ["apple", "banana", "orange", "tomato", "lettuce"],
      },
      { cat: "Snacks", terms: ["chips", "cookie", "cracker", "nuts"] },
    ];

    for (const item of categoryMap) {
      if (item.terms.some((term) => cleanText.includes(term))) {
        data.category = item.cat;
        break;
      }
    }

    return data;
  };

  const normalizeDate = (dateStr) => {
    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length !== 3) return null;

    let p1 = parseInt(parts[0], 10);
    let p2 = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    if (isNaN(p1) || isNaN(p2) || isNaN(year)) return null;

    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }

    const tryNormalize = (day, monthIndex) => {
      if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null;
      const candidate = new Date(year, monthIndex, day);
      if (
        candidate.getFullYear() === year &&
        candidate.getMonth() === monthIndex &&
        candidate.getDate() === day
      ) {
        return candidate.toISOString().split("T")[0];
      }
      return null;
    };

    return tryNormalize(p1, p2 - 1) || tryNormalize(p2, p1 - 1) || null;
  };

  const handleRetry = () => {
    setImage(null);
    setExtractedData({});
    setError("");
    setStep("capture");
  };

  const handleManualEntry = () => {
    setExtractedData({});
    setStep("review");
  };

  if (step === "processing") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold mb-2">Processing Image</h2>
          <p className="text-gray-600">Extracting product details...</p>
        </div>
      </div>
    );
  }

  if (step === "review") {
    return (
      <AddProductForm
        onClose={onClose}
        onProductAdded={onProductAdded}
        initialData={extractedData}
        isFromScan={true}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Scan Product</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Camera View */}
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 bg-gray-200 rounded-lg object-cover"
                style={{ display: image ? "none" : "block" }}
              />
              {image && (
                <img
                  src={image}
                  alt="Captured"
                  className="w-full h-64 bg-gray-200 rounded-lg object-cover"
                />
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              {!image ? (
                <>
                  <button
                    onClick={startCamera}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded font-semibold hover:bg-blue-700"
                  >
                    📷 Open Camera
                  </button>
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded font-semibold hover:bg-gray-700"
                  >
                    📁 Upload Image
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </>
              ) : (
                <>
                  <button
                    onClick={handleRetry}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded font-semibold hover:bg-gray-700"
                  >
                    🔄 Retake
                  </button>
                  <button
                    onClick={captureImage}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded font-semibold hover:bg-green-700"
                  >
                    📸 Capture
                  </button>
                </>
              )}
            </div>

            {/* Alternative Options */}
            <div className="border-t pt-4">
              <button
                onClick={handleManualEntry}
                className="w-full bg-slate-600 text-white py-2 px-4 rounded font-semibold hover:bg-slate-700"
              >
                ✏️ Enter Manually Instead
              </button>
            </div>

            {/* Close Button */}
            <div className="border-t pt-4">
              <button
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScanProduct;
