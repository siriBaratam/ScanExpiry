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
      } catch (backendError) {
        console.warn("Backend OCR failed, using client-side:", backendError);
        // Fallback to client-side OCR
        const worker = await createWorker("eng");
        await worker.setParameters({
          tessedit_char_whitelist:
            "0123456789/.-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ",
        });

        const {
          data: { text },
        } = await worker.recognize(imageData);
        await worker.terminate();
        parsedData = parseOCRText(text);
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

    // Clean and normalize text
    const cleanText = text.toLowerCase().replace(/\s+/g, " ").trim();

    // Look for expiry date patterns
    const expiryPatterns = [
      /exp(?:iry)?(?: date)?[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
      /best before[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
      /use by[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
      /([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/g,
    ];

    for (const pattern of expiryPatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        let dateStr = match[1] || match[0];
        // Normalize date format to YYYY-MM-DD
        const normalizedDate = normalizeDate(dateStr);
        if (normalizedDate) {
          if (cleanText.includes("best before")) {
            data.best_before_date = normalizedDate;
          } else {
            data.expiry_date = normalizedDate;
          }
          break;
        }
      }
    }

    // Try to extract product name (first line or prominent text)
    const lines = text.split("\n").filter((line) => line.trim().length > 2);
    if (lines.length > 0) {
      data.name = lines[0].trim();
    }

    // Basic category detection
    if (
      cleanText.includes("milk") ||
      cleanText.includes("cheese") ||
      cleanText.includes("yogurt")
    ) {
      data.category = "Dairy";
    } else if (cleanText.includes("bread") || cleanText.includes("flour")) {
      data.category = "Bakery";
    } else if (cleanText.includes("soda") || cleanText.includes("juice")) {
      data.category = "Beverages";
    }

    return data;
  };

  const normalizeDate = (dateStr) => {
    // Handle various date formats: DD/MM/YY, MM/DD/YY, DD-MM-YYYY, etc.
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length !== 3) return null;

    let day, month, year;

    // Assume DD/MM/YYYY or DD/MM/YY format (common in many countries)
    day = parseInt(parts[0]);
    month = parseInt(parts[1]) - 1; // JS months are 0-based
    year = parseInt(parts[2]);

    // Handle 2-digit years
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }

    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return null;

    // Format as YYYY-MM-DD
    return date.toISOString().split("T")[0];
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
