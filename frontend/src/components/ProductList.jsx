import { useState, useEffect } from "react";
import { productsApi } from "../api/client";
import AddProductForm from "./AddProductForm";
import ScanProduct from "./ScanProduct";

function ProductCard({ product }) {
  const today = new Date();
  const expiry = new Date(product.expiry_date);
  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  let statusColor = "bg-green-100 text-green-800";
  let statusText = "Fresh";
  if (daysLeft <= 0) {
    statusColor = "bg-red-100 text-red-800";
    statusText = "Expired";
  } else if (daysLeft <= 3) {
    statusColor = "bg-red-100 text-red-800";
    statusText = "Expiring Soon";
  } else if (daysLeft <= 7) {
    statusColor = "bg-yellow-100 text-yellow-800";
    statusText = "Expires Soon";
  }

  return (
    <div className="bg-white rounded-lg shadow p-3 flex items-center justify-between">
      <div className="flex-1">
        <p className="font-semibold text-sm">{product.name}</p>
        <p className="text-xs text-slate-500">{product.category}</p>
        <p className="text-xs text-slate-600 mt-1">
          {new Date(product.expiry_date).toLocaleDateString()}
        </p>
      </div>
      <div
        className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}
      >
        {statusText}
      </div>
    </div>
  );
}

function ProductList() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showScanForm, setShowScanForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const loadProducts = async () => {
    try {
      const data = await productsApi.getAll();
      setProducts(data);
      setFilteredProducts(data);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    let filtered = products;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.category.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Filter by status
    if (filterStatus !== "all") {
      const today = new Date();
      filtered = filtered.filter((product) => {
        const expiry = new Date(product.expiry_date);
        const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        switch (filterStatus) {
          case "fresh":
            return daysLeft > 7;
          case "expiring-soon":
            return daysLeft > 0 && daysLeft <= 7;
          case "expired":
            return daysLeft <= 0;
          default:
            return true;
        }
      });
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, filterStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-600">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-lg p-4">
        <h1 className="text-2xl font-bold">Product List</h1>
        <p className="text-indigo-100 text-sm">
          Manage your products and track expiry dates
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-3 flex-1">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Products</option>
              <option value="fresh">Fresh</option>
              <option value="expiring-soon">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowScanForm(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 whitespace-nowrap"
            >
              📷 Scan Product
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
            >
              + Add Product
            </button>
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold text-sm mb-3">
          Products ({filteredProducts.length})
        </h2>
        <div className="space-y-2">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((p) => <ProductCard key={p.id} product={p} />)
          ) : (
            <p className="text-xs text-slate-500 text-center py-4">
              {products.length === 0
                ? "No products yet. Add your first product!"
                : "No products match your search criteria."}
            </p>
          )}
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddForm && (
        <AddProductForm
          onClose={() => setShowAddForm(false)}
          onProductAdded={loadProducts}
        />
      )}

      {/* Scan Product Modal */}
      {showScanForm && (
        <ScanProduct
          onClose={() => setShowScanForm(false)}
          onProductAdded={loadProducts}
        />
      )}
    </div>
  );
}

export default ProductList;
