import { useState } from "react";
import { productsApi } from "../api/client";

function AddProductForm({
  onClose,
  onProductAdded,
  initialData = {},
  isFromScan = false,
}) {
  const [formData, setFormData] = useState({
    name: initialData.name || "",
    category: initialData.category || "",
    expiry_date: initialData.expiry_date || "",
    manufacture_date: initialData.manufacture_date || "",
    best_before_date: initialData.best_before_date || "",
  });
  const [bestBeforeFormat, setBestBeforeFormat] = useState("date"); // "date" or "duration"
  const [bestBeforeDuration, setBestBeforeDuration] = useState({
    value: "",
    unit: "months",
  }); // {value: number, unit: "days"|"weeks"|"months"|"years"}
  const [customCategory, setCustomCategory] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const confidenceScore = initialData.ocr_confidence;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Product Name is required";
    }

    // Category validation
    if (formData.category === "Other") {
      if (!customCategory.trim()) {
        newErrors.customCategory = "Please enter a custom category";
      }
    } else if (!formData.category.trim()) {
      newErrors.category = "Category is required";
    }

    if (!formData.expiry_date) {
      if (!formData.manufacture_date) {
        newErrors.manufacture_date =
          "Manufacture Date is required when Expiry Date is not provided";
      }
      if (!formData.best_before_date && bestBeforeFormat === "date") {
        newErrors.best_before_date =
          "Best Before Date is required when Expiry Date is not provided";
      }
      if (bestBeforeFormat === "duration" && !bestBeforeDuration.value) {
        newErrors.best_before_duration = "Please enter duration value";
      }
      if (
        formData.manufacture_date &&
        formData.best_before_date &&
        bestBeforeFormat === "date"
      ) {
        const manufacture = new Date(formData.manufacture_date);
        const bestBefore = new Date(formData.best_before_date);
        if (bestBefore <= manufacture) {
          newErrors.best_before_date =
            "Best Before Date must be after Manufacture Date";
        }
      }
    }

    ["expiry_date", "manufacture_date"].forEach((field) => {
      if (formData[field] && isNaN(new Date(formData[field]).getTime())) {
        newErrors[field] = "Invalid date format";
      }
    });

    // Only validate best_before_date if format is "date"
    if (
      formData.best_before_date &&
      bestBeforeFormat === "date" &&
      isNaN(new Date(formData.best_before_date).getTime())
    ) {
      newErrors.best_before_date = "Invalid date format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateBestBeforeDate = () => {
    if (bestBeforeFormat === "date") {
      return formData.best_before_date;
    }

    // Calculate date from duration
    if (!formData.manufacture_date || !bestBeforeDuration.value) {
      return null;
    }

    const mfgDate = new Date(formData.manufacture_date);
    const durationValue = parseInt(bestBeforeDuration.value, 10);

    if (isNaN(durationValue)) return null;

    const resultDate = new Date(mfgDate);
    switch (bestBeforeDuration.unit) {
      case "days":
        resultDate.setDate(resultDate.getDate() + durationValue);
        break;
      case "weeks":
        resultDate.setDate(resultDate.getDate() + durationValue * 7);
        break;
      case "months":
        resultDate.setMonth(resultDate.getMonth() + durationValue);
        break;
      case "years":
        resultDate.setFullYear(resultDate.getFullYear() + durationValue);
        break;
    }

    return resultDate.toISOString().split("T")[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const calculatedBestBefore = calculateBestBeforeDate();
      const dataToSend = {
        name: formData.name.trim(),
        category:
          formData.category === "Other"
            ? customCategory.trim()
            : formData.category.trim(),
        expiry_date: formData.expiry_date || calculatedBestBefore,
        purchase_date: formData.manufacture_date || null,
      };

      await productsApi.create(dataToSend);
      onProductAdded();
      onClose();
    } catch (error) {
      console.error("Failed to add product:", error);
      setErrors({ submit: error.message || "Failed to add product" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      category: "",
      expiry_date: "",
      manufacture_date: "",
      best_before_date: "",
    });
    setCustomCategory("");
    setBestBeforeFormat("date");
    setBestBeforeDuration({ value: "", unit: "months" });
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {isFromScan ? "Review Scanned Product" : "Add New Product"}
          </h2>
          {isFromScan && (
            <>
              <p className="text-sm text-gray-600 mb-4">
                We've extracted details from your scan. Please review and edit
                as needed.
              </p>
              {confidenceScore && (
                <div
                  className={`mb-4 p-3 rounded-lg ${confidenceScore < 0.6 ? "bg-yellow-50 border border-yellow-200" : "bg-green-50 border border-green-200"}`}
                >
                  <p className="text-sm font-medium">
                    {confidenceScore < 0.6
                      ? "⚠️ Low Confidence"
                      : "✓ Good Confidence"}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    OCR Confidence: {(confidenceScore * 100).toFixed(1)}%
                  </p>
                  {confidenceScore < 0.6 && (
                    <p className="text-xs text-yellow-700 mt-2">
                      Please review the extracted data carefully before saving.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? "border-red-500" : "border-gray-300"}`}
                placeholder="Enter product name"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.category ? "border-red-500" : "border-gray-300"}`}
              >
                <option value="">-- Select Category --</option>
                <option value="Dairy">🥛 Dairy</option>
                <option value="Bakery">🍞 Bakery</option>
                <option value="Beverages">🥤 Beverages</option>
                <option value="Meat">🍖 Meat</option>
                <option value="Produce">🥕 Produce</option>
                <option value="Snacks">🍪 Snacks</option>
                <option value="Other">📦 Other</option>
              </select>
              {errors.category && (
                <p className="text-red-500 text-xs mt-1">{errors.category}</p>
              )}
              {formData.category === "Other" && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enter Custom Category *
                  </label>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => {
                      setCustomCategory(e.target.value);
                      if (errors.customCategory) {
                        setErrors((prev) => ({ ...prev, customCategory: "" }));
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.customCategory ? "border-red-500" : "border-gray-300"}`}
                    placeholder="e.g., Frozen Foods, Dairy Products, etc."
                  />
                  {errors.customCategory && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.customCategory}
                    </p>
                  )}
                </div>
              )}
              {formData.category && formData.category !== "Other" && (
                <p className="text-xs text-gray-500 mt-1">
                  ✓ Category: <strong>{formData.category}</strong>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                name="expiry_date"
                value={formData.expiry_date}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.expiry_date ? "border-red-500" : "border-gray-300"}`}
              />
              {errors.expiry_date && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.expiry_date}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Leave empty if using Manufacture + Best Before dates
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manufacture Date{" "}
                {formData.expiry_date ? "(Optional)" : "(Required)"}
              </label>
              <input
                type="date"
                name="manufacture_date"
                value={formData.manufacture_date}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.manufacture_date ? "border-red-500" : "border-gray-300"}`}
                disabled={!!formData.expiry_date}
              />
              {errors.manufacture_date && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.manufacture_date}
                </p>
              )}
            </div>
            {!formData.expiry_date && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Best Before Date (Required)
                </label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setBestBeforeFormat("date")}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${
                      bestBeforeFormat === "date"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    📅 Specific Date
                  </button>
                  <button
                    type="button"
                    onClick={() => setBestBeforeFormat("duration")}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${
                      bestBeforeFormat === "duration"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    ⏱️ Duration
                  </button>
                </div>

                {bestBeforeFormat === "date" ? (
                  <div>
                    <input
                      type="date"
                      name="best_before_date"
                      value={formData.best_before_date}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.best_before_date
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {errors.best_before_date && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.best_before_date}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the specific date from packaging
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-xs text-gray-600 mb-2">
                      Calculated from: Manufacture Date + Duration
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={bestBeforeDuration.value}
                        onChange={(e) =>
                          setBestBeforeDuration((prev) => ({
                            ...prev,
                            value: e.target.value,
                          }))
                        }
                        placeholder="Enter number"
                        className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.best_before_duration
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      <select
                        value={bestBeforeDuration.unit}
                        onChange={(e) =>
                          setBestBeforeDuration((prev) => ({
                            ...prev,
                            unit: e.target.value,
                          }))
                        }
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                        <option value="months">Months</option>
                        <option value="years">Years</option>
                      </select>
                    </div>
                    {errors.best_before_duration && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.best_before_duration}
                      </p>
                    )}
                    {formData.manufacture_date && bestBeforeDuration.value && (
                      <div className="p-2 bg-white rounded border border-green-200 text-xs">
                        <p className="text-green-700">
                          ✓ Calculated Date:{" "}
                          <strong>
                            {new Date(
                              calculateBestBeforeDate(),
                            ).toLocaleDateString()}
                          </strong>
                        </p>
                      </div>
                    )}
                    {!formData.manufacture_date && (
                      <p className="text-xs text-yellow-600">
                        ⚠️ Please enter Manufacture Date first
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            {errors.submit && (
              <p className="text-red-500 text-sm">{errors.submit}</p>
            )}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddProductForm;
