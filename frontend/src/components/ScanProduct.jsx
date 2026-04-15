import { useState, useRef } from "react";
import { productsApi } from "../api/client";
import AddProductForm from "./AddProductForm";

function ScanProduct({ onClose, onProductAdded }) {
  const [step, setStep] = useState("capture"); // capture, processing, review
  const [image, setImage] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
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
      await videoRef.current.play();
      setIsCameraOpen(true);
      setError("");
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
    setIsCameraOpen(false);
  };

  const captureImage = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const width = video.videoWidth || video.clientWidth || 640;
    const height = video.videoHeight || video.clientHeight || 480;

    if (!width || !height) {
      setError("Camera frame is not ready yet. Please try again.");
      return;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);
    const imageData = canvas.toDataURL("image/jpeg", 0.92);
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

  const compressImage = (imageData) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const img = new Image();
      img.onload = () => {
        const maxWidth = 800;
        const maxHeight = 800;
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);

        // Start with 0.6 quality, reduce if still too large
        let quality = 0.6;
        let compressedData = canvas.toDataURL("image/jpeg", quality);

        // If still too large (> 5MB base64), reduce quality further
        while (compressedData.length > 5000000 && quality > 0.1) {
          quality -= 0.1;
          compressedData = canvas.toDataURL("image/jpeg", quality);
        }

        // Final size check
        const sizeInMB = (compressedData.length / 1048576).toFixed(2);
        if (compressedData.length > 10000000) {
          reject(
            new Error(
              `Image too large (${sizeInMB}MB). Please use a smaller image.`,
            ),
          );
        } else if (compressedData.length > 5000000) {
          console.warn(
            `Large image (${sizeInMB}MB). Processing may take longer.`,
          );
          resolve(compressedData);
        } else {
          resolve(compressedData);
        }
      };
      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };
      img.src = imageData;
    });
  };

  const processImage = async (imageData) => {
    setStep("processing");
    setError("");

    try {
      // Compress image before sending
      const compressedImage = await compressImage(imageData);

      // Send to backend OCR
      const response = await productsApi.ocr(compressedImage);
      const parsedData = response.parsedData;
      parsedData.ocr_confidence = response.confidence ?? null;

      // Check if manual review is required
      if (response.requiresManualReview) {
        setError(
          "Low confidence detected. Please review the extracted data carefully.",
        );
      }

      setExtractedData(parsedData);
      setStep("review");
    } catch (err) {
      console.error("OCR error:", err);
      setError(
        err.message ||
          "Failed to process image. Please try again or enter details manually.",
      );
      setStep("capture");
    }
  };

  const handleRetry = () => {
    stopCamera();
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
                style={{ display: isCameraOpen && !image ? "block" : "none" }}
                autoPlay
                playsInline
              />
              {image && (
                <img
                  src={image}
                  alt="Captured"
                  className="w-full h-64 bg-gray-200 rounded-lg object-cover"
                />
              )}
              {!isCameraOpen && !image && (
                <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
                  Click "Open Camera" to start
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              {!isCameraOpen && !image ? (
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
              ) : isCameraOpen && !image ? (
                <>
                  <button
                    onClick={captureImage}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded font-semibold hover:bg-green-700"
                  >
                    📸 Capture
                  </button>
                  <button
                    onClick={() => {
                      stopCamera();
                      setError("");
                    }}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded font-semibold hover:bg-gray-700"
                  >
                    ❌ Close Camera
                  </button>
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
                    ✅ Use Image
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
