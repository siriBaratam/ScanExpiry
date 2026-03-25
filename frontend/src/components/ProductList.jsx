import { useState, useEffect } from "react";
import { productsApi } from "../api/client";
import AddProductForm from "./AddProductForm";
import ScanProduct from "./ScanProduct";

function ProductCard({ product }) {
  const today = new Date();
  const expiry = new Date(product.expiry_date);
  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  let statusColor = "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300";
  let statusText = "Fresh";
  if (daysLeft <= 0) {
    statusColor = "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300";
    statusText = "Expired";
  } else if (daysLeft <= 3) {
    statusColor = "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300";
    statusText = "Expiring Soon";
  } else if (daysLeft <= 7) {
    statusColor = "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300";
    statusText = "Expires Soon";
  }

  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-semibold text-slate-900 dark:text-white">{product.name}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{product.category}</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
            Expires: {new Date(product.expiry_date).toLocaleDateString()}
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ml-3 ${statusColor}`}>
          {statusText}
        </div>
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
      <div className="flex flex-col items-center justify-center min-h-96">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Products</h1>
        <p className="text-slate-600 dark:text-slate-400">Manage and track all your product inventory</p>
      </div>

      {/* Controls */}
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-end justify-between">
          <div className="flex flex-col md:flex-row gap-3 flex-1 w-full">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div className="flex-shrink-0 md:pt-7">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Filter</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-field"
              >
                <option value="all">All Products</option>
                <option value="fresh">Fresh</option>
                <option value="expiring-soon">Expiring Soon</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowScanForm(true)}
              className="btn-primary flex-1 md:flex-none"
            >
              📷 Scan
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary flex-1 md:flex-none"
            >
              ➕ Add
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {filteredProducts.length === 0 ? "Products" : `${filteredProducts.length} Product${filteredProducts.length !== 1 ? 's' : ''}`}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((p) => <ProductCard key={p.id} product={p} />)
          ) : (
            <div className="card p-12 text-center">
              <p className="text-2xl mb-2">📦</p>
              <p className="text-slate-600 dark:text-slate-400">
                {products.length === 0
                  ? "No products yet. Add your first product to get started!"
                  : "No products match your search criteria."}
              </p>
            </div>
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
