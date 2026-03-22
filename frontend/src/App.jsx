import React, { useState } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import ResetPasswordForm from "./components/ResetPasswordForm";
import Dashboard from "./components/Dashboard";
import ProductList from "./components/ProductList";

function AuthLayout({ children, title }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold text-center mb-4 dark:text-white">{title}</h1>
        {children}
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
      {/* Mobile Header */}
      <header className="bg-white dark:bg-slate-800 shadow sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-slate-600 dark:text-slate-300 text-xl"
            >
              ☰
            </button>
            <h1 className="font-bold text-lg dark:text-white">ExpiryTracker</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
              {user?.name}
            </span>
            <button
              onClick={logout}
              className="px-2 md:px-3 py-1 md:py-2 bg-red-600 dark:bg-red-700 text-white rounded text-xs md:text-sm hover:bg-red-700 dark:hover:bg-red-800"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {sidebarOpen && (
          <nav className="md:hidden bg-slate-50 dark:bg-slate-800 border-t dark:border-slate-700 p-2 space-y-1">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-300"}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              📊 Dashboard
            </NavLink>
            <NavLink
              to="/scan"
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-300"}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              📷 Scan & Capture
            </NavLink>
            <NavLink
              to="/products"
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-300"}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              📦 Product List
            </NavLink>
            <NavLink
              to="/analytics"
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-300"}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              📈 Analytics & Reports
            </NavLink>
          </nav>
        )}

        {/* Desktop Navigation */}
        <nav className="hidden md:flex border-t dark:border-slate-700 px-4 py-2 gap-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `px-3 py-2 rounded text-sm ${isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-300"}`
            }
          >
            📊 Dashboard
          </NavLink>
          <NavLink
            to="/scan"
            className={({ isActive }) =>
              `px-3 py-2 rounded text-sm ${isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-300"}`
            }
          >
            📷 Scan & Capture
          </NavLink>
          <NavLink
            to="/products"
            className={({ isActive }) =>
              `px-3 py-2 rounded text-sm ${isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-300"}`
            }
          >
            📦 Product List
          </NavLink>
          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `px-3 py-2 rounded text-sm ${isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-300"}`
            }
          >
            📈 Analytics & Reports
          </NavLink>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 md:px-4 py-4">
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
  );
}

export default App;
