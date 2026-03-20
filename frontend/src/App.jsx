import React, { useState } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import ResetPasswordForm from "./components/ResetPasswordForm";
import Dashboard from "./components/Dashboard";

function AuthLayout({ children, title }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-sky-100 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold text-center mb-4">{title}</h1>
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Mobile Header */}
      <header className="bg-white shadow sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-slate-600 text-xl"
            >
              ☰
            </button>
            <h1 className="font-bold text-lg">ExpiryTracker</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs md:text-sm text-slate-600">
              {user?.name}
            </span>
            <button
              onClick={logout}
              className="px-2 md:px-3 py-1 md:py-2 bg-red-600 text-white rounded text-xs md:text-sm hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {sidebarOpen && (
          <nav className="md:hidden bg-slate-50 border-t p-2 space-y-1">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-100"}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              📊 Dashboard
            </NavLink>
            <NavLink
              to="/scan"
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-100"}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              📷 Scan & Capture
            </NavLink>
            <NavLink
              to="/products"
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-100"}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              📦 Product List
            </NavLink>
            <NavLink
              to="/analytics"
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-100"}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              📈 Analytics & Reports
            </NavLink>
          </nav>
        )}

        {/* Desktop Navigation */}
        <nav className="hidden md:flex border-t px-4 py-2 gap-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `px-3 py-2 rounded text-sm ${isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-100"}`
            }
          >
            📊 Dashboard
          </NavLink>
          <NavLink
            to="/scan"
            className={({ isActive }) =>
              `px-3 py-2 rounded text-sm ${isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-100"}`
            }
          >
            📷 Scan & Capture
          </NavLink>
          <NavLink
            to="/products"
            className={({ isActive }) =>
              `px-3 py-2 rounded text-sm ${isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-100"}`
            }
          >
            📦 Product List
          </NavLink>
          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `px-3 py-2 rounded text-sm ${isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-100"}`
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
      <div className="p-4 bg-white rounded-lg shadow">
        Scan page placeholder (OCR + manual entry)
      </div>
    </MainLayout>
  );
}

function ProductList() {
  return (
    <MainLayout>
      <div className="p-4 bg-white rounded-lg shadow">
        Product list with search/filter and color-coded expiry statuses
      </div>
    </MainLayout>
  );
}

function Analytics() {
  return (
    <MainLayout>
      <div className="p-4 bg-white rounded-lg shadow">
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
            <ProductList />
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
