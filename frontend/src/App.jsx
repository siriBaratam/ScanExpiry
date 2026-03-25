import React, { useState } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ToastContainer } from "./components/ToastContainer";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import ResetPasswordForm from "./components/ResetPasswordForm";
import Dashboard from "./components/Dashboard";
import ProductList from "./components/ProductList";

function AuthLayout({ children, title }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-600 text-white mb-4">
            <span className="text-xl">📦</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            ExpiryTracker
          </h1>
          <p className="text-slate-600 dark:text-slate-400">{title}</p>
        </div>
        <div className="card p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

function Login() {
  return (
    <AuthLayout title="Login">
      <LoginForm />
    </AuthLayout>
  );
}

function Register() {
  return (
    <AuthLayout title="Register">
      <RegisterForm />
    </AuthLayout>
  );
}

function PasswordReset() {
  return (
    <AuthLayout title="Password Reset">
      <ResetPasswordForm />
    </AuthLayout>
  );
}

function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top bar */}
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden text-slate-600 dark:text-slate-400 text-2xl hover:bg-slate-100 dark:hover:bg-slate-700 p-1 rounded"
              >
                ☰
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-lg">
                  📦
                </div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white hidden sm:block">ExpiryTracker</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {user?.name}
              </span>
              <button
                onClick={logout}
                className="btn-secondary text-sm"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {sidebarOpen && (
            <nav className="md:hidden pb-3 space-y-1 border-t border-slate-200 dark:border-slate-700 pt-3">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                    ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`
                }
                onClick={() => setSidebarOpen(false)}
              >
                📊 Dashboard
              </NavLink>
              <NavLink
                to="/scan"
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                    ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`
                }
                onClick={() => setSidebarOpen(false)}
              >
                📷 Scan & Capture
              </NavLink>
              <NavLink
                to="/products"
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                    ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`
                }
                onClick={() => setSidebarOpen(false)}
              >
                📦 Products
              </NavLink>
              <NavLink
                to="/analytics"
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                    ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`
                }
                onClick={() => setSidebarOpen(false)}
              >
                📈 Analytics
              </NavLink>
            </nav>
          )}
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex border-t border-slate-200 dark:border-slate-700 px-4 sm:px-6 lg:px-8">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `px-4 py-3 text-sm font-medium border-b-2 transition-colors ${isActive
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/scan"
            className={({ isActive }) =>
              `px-4 py-3 text-sm font-medium border-b-2 transition-colors ${isActive
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`
            }
          >
            Scan
          </NavLink>
          <NavLink
            to="/products"
            className={({ isActive }) =>
              `px-4 py-3 text-sm font-medium border-b-2 transition-colors ${isActive
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`
            }
          >
            Products
          </NavLink>
          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `px-4 py-3 text-sm font-medium border-b-2 transition-colors ${isActive
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`
            }
          >
            Analytics
          </NavLink>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

function DashboardPage() {
  return (
    <MainLayout>
      <Dashboard />
    </MainLayout>
  );
}

function Scan() {
  return (
    <MainLayout>
      <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow dark:text-white">
        Scan page placeholder (OCR + manual entry)
      </div>
    </MainLayout>
  );
}

function ProductListPage() {
  return (
    <MainLayout>
      <ProductList />
    </MainLayout>
  );
}

function Analytics() {
  return (
    <MainLayout>
      <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow dark:text-white">
        Charts: expiry distribution, wastage metrics
      </div>
    </MainLayout>
  );
}

function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset" element={<PasswordReset />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <ProtectedRoute>
              <Scan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <ProductListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<div className="p-4">Not Found</div>} />
      </Routes>
    </>
  );
}

export default App;
