import { useState, useEffect } from "react";
import { productsApi } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { useNotification } from "../context/NotificationContext";
import { exportReport } from "../utils/reportGenerator";
import {
  generateAlertsFromProducts,
  getAlertSeverity,
  sendBrowserNotification,
  requestNotificationPermission,
  calculateDaysUntilExpiry,
} from "../utils/alertGenerator";
import AddProductForm from "./AddProductForm";
import ScanProduct from "./ScanProduct";

function StatCard({ icon, label, value, color }) {
  return (
    <div className="card p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`text-4xl ${color}`}>{icon}</div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
}

function AlertItem({ severity, title, time }) {
  const severityColors = {
    critical: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200",
    warning: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-200",
    info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200",
  };
  const severityIcons = {
    critical: "🔴",
    warning: "🟡",
    info: "🔵",
  };

  return (
    <div
      className={`border-l-4 p-4 rounded-lg ${severityColors[severity] || severityColors.info}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg mt-0.5">{severityIcons[severity]}</span>
        <div className="flex-1">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs opacity-75 mt-0.5">{time}</p>
        </div>
      </div>
    </div>
  );
}

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
          <p className="font-semibold text-sm text-slate-900 dark:text-white">{product.name}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{product.category}</p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
            Expires: {new Date(product.expiry_date).toLocaleDateString()}
          </p>
        </div>
        <div
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ml-3 ${statusColor}`}
        >
          {statusText}
        </div>
      </div>
    </div>
  );
}

function SimpleBarChart({ data, title }) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-6">{title}</h3>
      <div className="space-y-4">
        {data.map((item, idx) => (
          <div key={idx}>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-slate-700 dark:text-slate-300">{item.label}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.value} units</p>
            </div>
            <div className="bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-indigo-600 dark:bg-indigo-500 h-full transition-all"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimplePieChart({ data, title }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const colors = ["#4f46e5", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-6">{title}</h3>
      <div className="space-y-3">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: colors[idx % colors.length] }}
            />
            <p className="text-sm text-slate-700 dark:text-slate-300 flex-1">{item.label}</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
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
  const [showScanForm, setShowScanForm] = useState(false);
  const [exportFormat, setExportFormat] = useState("csv");
  const [alertTiming, setAlertTiming] = useState(7);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  const [generatedAlerts, setGeneratedAlerts] = useState([]);
  const { theme, setThemeMode } = useTheme();
  const { addNotification } = useNotification();
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

      // Generate alerts from products
      const alerts = generateAlertsFromProducts(data, alertTiming);
      setGeneratedAlerts(alerts);

      // Notify about critical alerts
      if (alerts.length > 0) {
        const criticalAlerts = alerts.filter((a) => a.severity === "critical");
        if (criticalAlerts.length > 0) {
          const alertMessage = `⚠️ You have ${criticalAlerts.length} product(s) expiring soon!`;
          addNotification(alertMessage, "critical", 6000);

          // Send browser notifications if enabled
          if (pushNotificationsEnabled) {
            criticalAlerts.slice(0, 3).forEach((alert) => {
              sendBrowserNotification(alert.title);
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to load products:", err);
      addNotification("Error loading products", "critical");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [alertTiming]);

  // Request notification permission
  useEffect(() => {
    if (pushNotificationsEnabled) {
      requestNotificationPermission().then((granted) => {
        if (granted) {
          addNotification("✅ Push notifications enabled", "success", 3000);
        } else {
          setPushNotificationsEnabled(false);
          addNotification("❌ Failed to enable notifications", "warning", 3000);
        }
      });
    }
  }, [pushNotificationsEnabled]);

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
      <div className="flex flex-col items-center justify-center min-h-96">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header Section */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400">Monitor and manage your product inventory</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 text-center">
          <div className="text-4xl mb-2">📷</div>
          <h3 className="font-semibold text-sm dark:text-white">Scan Product</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 my-2">
            Use camera to scan barcode or expiry date
          </p>
          <button
            onClick={() => setShowScanForm(true)}
            className="w-full bg-blue-600 dark:bg-blue-700 text-white py-2 rounded font-semibold text-sm hover:bg-blue-700 dark:hover:bg-blue-800"
          >
            Start Scan
          </button>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 text-center">
          <div className="text-4xl mb-2">✏️</div>
          <h3 className="font-semibold text-sm dark:text-white">Manual Entry</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 my-2">
            Add product details manually
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-slate-600 dark:bg-slate-700 text-white py-2 rounded font-semibold text-sm hover:bg-slate-700 dark:hover:bg-slate-600"
          >
            Add Product
          </button>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
        <h2 className="font-semibold text-sm mb-3 dark:text-white">🔔 Expiry Alerts ({generatedAlerts.length})</h2>
        <div className="space-y-2">
          {generatedAlerts.length > 0 ? (
            generatedAlerts.slice(0, 5).map((alert) => (
              <AlertItem
                key={alert.id}
                severity={alert.severity}
                title={alert.title}
                time={`${alert.daysLeft} days left`}
              />
            ))
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-3">
              ✅ All products are fresh! No alerts at this time.
            </p>
          )}
        </div>
      </div>

      {/* Quick Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
        <h2 className="font-semibold text-sm mb-3 dark:text-white">⚙️ Quick Settings</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm dark:text-white">Alert Timing</span>
            <select
              value={alertTiming}
              onChange={(e) => setAlertTiming(parseInt(e.target.value))}
              className="text-xs border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-2 py-1"
            >
              <option value={1}>1 day before</option>
              <option value={3}>3 days before</option>
              <option value={7}>7 days before</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm dark:text-white">Theme</span>
            <select
              value={theme}
              onChange={(e) => setThemeMode(e.target.value)}
              className="text-xs border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-2 py-1"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm dark:text-white">Push Notifications</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={pushNotificationsEnabled}
                onChange={(e) => setPushNotificationsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>
        </div>
      </div>

      {/* Recent Products */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-sm dark:text-white">📦 Recent Products</h2>
          <a href="/products" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            View All
          </a>
        </div>
        <div className="space-y-2">
          {recentProducts.length > 0 ? (
            recentProducts.map((p) => <ProductCard key={p.id} product={p} />)
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
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
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="text-xs border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 bg-white"
          >
            <option value="csv">Export as CSV</option>
            <option value="pdf">Export as PDF</option>
          </select>
          <button
            onClick={async () => {
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
              await exportReport(stats, products, wastageData, categoryData, exportFormat);
            }}
            className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-2 rounded font-semibold text-sm hover:bg-blue-700 dark:hover:bg-blue-800"
          >
            📥 Export Report
          </button>
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

export default Dashboard;
