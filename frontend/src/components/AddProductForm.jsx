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
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

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

    if (!formData.category.trim()) {
      newErrors.category = "Category is required";
    }

    if (!formData.expiry_date) {
      if (!formData.manufacture_date) {
        newErrors.manufacture_date =
          "Manufacture Date is required when Expiry Date is not provided";
      }
      if (!formData.best_before_date) {
        newErrors.best_before_date =
          "Best Before Date is required when Expiry Date is not provided";
      }
      if (formData.manufacture_date && formData.best_before_date) {
        const manufacture = new Date(formData.manufacture_date);
        const bestBefore = new Date(formData.best_before_date);
        if (bestBefore <= manufacture) {
          newErrors.best_before_date =
            "Best Before Date must be after Manufacture Date";
        }
      }
    }

    ["expiry_date", "manufacture_date", "best_before_date"].forEach((field) => {
      if (formData[field] && isNaN(new Date(formData[field]).getTime())) {
        newErrors[field] = "Invalid date format";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const dataToSend = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        expiry_date: formData.expiry_date || formData.best_before_date,
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
            <p className="text-sm text-gray-600 mb-4">
              We've extracted details from your scan. Please review and edit as
              needed.
            </p>
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
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.category ? "border-red-500" : "border-gray-300"}`}
                placeholder="e.g., Dairy, Beverages"
              />
              {errors.category && (
                <p className="text-red-500 text-xs mt-1">{errors.category}</p>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Best Before Date{" "}
                {formData.expiry_date ? "(Optional)" : "(Required)"}
              </label>
              <input
                type="date"
                name="best_before_date"
                value={formData.best_before_date}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.best_before_date ? "border-red-500" : "border-gray-300"}`}
                disabled={!!formData.expiry_date}
              />
              {errors.best_before_date && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.best_before_date}
                </p>
              )}
            </div>
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
