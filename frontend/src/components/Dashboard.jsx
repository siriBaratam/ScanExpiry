import { useState, useEffect } from "react";
import { productsApi } from "../api/client";
import AddProductForm from "./AddProductForm";

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
      <div className={`text-3xl ${color}`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-500 uppercase">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function AlertItem({ severity, title, time }) {
  const severityColors = {
    critical: "bg-red-50 border-red-200 text-red-700",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
  };
  const severityIcons = {
    critical: "🔴",
    warning: "🟡",
    info: "🔵",
  };

  return (
    <div
      className={`border-l-4 p-3 rounded ${severityColors[severity] || severityColors.info}`}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg">{severityIcons[severity]}</span>
        <div className="flex-1">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs opacity-75">{time}</p>
        </div>
      </div>
    </div>
  );
}

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

function SimpleBarChart({ data, title }) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold text-sm mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, idx) => (
          <div key={idx}>
            <p className="text-xs text-slate-600 mb-1">{item.label}</p>
            <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-green-500 h-full transition-all"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
            <p className="text-xs text-slate-600 mt-1">{item.value} units</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimplePieChart({ data, title }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold text-sm mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors[idx % colors.length] }}
            />
            <p className="text-xs text-slate-600 flex-1">{item.label}</p>
            <p className="text-xs font-semibold">
              {Math.round((item.value / total) * 100)}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [stats, setStats] = useState({
    freshProducts: 0,
    expiringSoon: 0,
    expired: 0,
    wastageValue: "$0",
  });

  const loadProducts = async () => {
    try {
      const data = await productsApi.getAll();
      setProducts(data);

      const today = new Date();
      let fresh = 0,
        soon = 0,
        expired = 0;

      data.forEach((p) => {
        const expiry = new Date(p.expiry_date);
        const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        if (daysLeft <= 0) expired++;
        else if (daysLeft <= 7) soon++;
        else fresh++;
      });

      setStats({
        freshProducts: fresh,
        expiringSoon: soon,
        expired: expired,
        wastageValue: "$342",
      });
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const recentProducts = products.slice(0, 3);

  const wastageData = [
    { label: "Jan", value: 50 },
    { label: "Feb", value: 75 },
    { label: "Mar", value: 120 },
    { label: "Apr", value: 180 },
    { label: "May", value: 220 },
    { label: "Jun", value: 310 },
  ];

  const categoryData = [
    { label: "Dairy", value: 35 },
    { label: "Beverages", value: 20 },
    { label: "Meat & Poultry", value: 15 },
    { label: "Snacks", value: 18 },
    { label: "Vegetables", value: 12 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-600">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-lg p-4">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-indigo-100 text-sm">
          Monitor your product expiry dates and reduce food waste
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon="🟢"
          label="Fresh Products"
          value={stats.freshProducts}
          color="text-green-600"
        />
        <StatCard
          icon="🟡"
          label="Expiring Soon"
          value={stats.expiringSoon}
          color="text-yellow-600"
        />
        <StatCard
          icon="🔴"
          label="Expired"
          value={stats.expired}
          color="text-red-600"
        />
        <StatCard
          icon="📊"
          label="Waste Avoided"
          value={stats.wastageValue}
          color="text-blue-600"
        />
      </div>

      {/* Product Scan & Entry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-4xl mb-2">📷</div>
          <h3 className="font-semibold text-sm">Scan Product</h3>
          <p className="text-xs text-slate-500 my-2">
            Use camera to scan barcode or expiry date
          </p>
          <button className="w-full bg-blue-600 text-white py-2 rounded font-semibold text-sm hover:bg-blue-700">
            Start Scan
          </button>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-4xl mb-2">✏️</div>
          <h3 className="font-semibold text-sm">Manual Entry</h3>
          <p className="text-xs text-slate-500 my-2">
            Add product details manually
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-slate-600 text-white py-2 rounded font-semibold text-sm hover:bg-slate-700"
          >
            Add Product
          </button>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold text-sm mb-3">🔔 Expiry Alerts</h2>
        <div className="space-y-2">
          <AlertItem
            severity="critical"
            title="Milk expires today"
            time="8:30 AM today"
          />
          <AlertItem
            severity="warning"
            title="Bread expires tomorrow"
            time="3:45 PM today"
          />
          <AlertItem
            severity="warning"
            title="Yogurt expires in 2 days"
            time="12:00 PM today"
          />
        </div>
      </div>

      {/* Quick Settings */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold text-sm mb-3">⚙️ Quick Settings</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Alert Timing</span>
            <select className="text-xs border rounded px-2 py-1">
              <option>1 day before</option>
              <option>3 days before</option>
              <option>7 days before</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Theme</span>
            <select className="text-xs border rounded px-2 py-1">
              <option>Light</option>
              <option>Dark</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Push Notifications</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>
        </div>
      </div>

      {/* Recent Products */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-sm">📦 Recent Products</h2>
          <a href="/products" className="text-xs text-blue-600 hover:underline">
            View All
          </a>
        </div>
        <div className="space-y-2">
          {recentProducts.length > 0 ? (
            recentProducts.map((p) => <ProductCard key={p.id} product={p} />)
          ) : (
            <p className="text-xs text-slate-500 text-center py-4">
              No products yet. Start by scanning or adding one!
            </p>
          )}
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SimpleBarChart
          data={wastageData}
          title="📈 Wastage Avoided (Last 6 Months)"
        />
        <SimplePieChart data={categoryData} title="📊 Product Categories" />
      </div>

      {/* Export Report Button */}
      <div className="text-center">
        <button className="bg-blue-600 text-white px-6 py-2 rounded font-semibold text-sm hover:bg-blue-700">
          📥 Export Report
        </button>
      </div>

      {/* Add Product Modal */}
      {showAddForm && (
        <AddProductForm
          onClose={() => setShowAddForm(false)}
          onProductAdded={loadProducts}
        />
      )}
    </div>
  );
}

export default Dashboard;
