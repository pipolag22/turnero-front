import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./context/ProtectedRoute";

import AdminPage from "./pages/AdminPage";
import PuestoPage from "./pages/PuestoPage";
import TVBoard from "./pages/TVBoard";
import Login from "./pages/Login";
import "./index.css";
import AdminUsers from "./pages/AdminUsers";

// OJO con los roles: en el back son 'ADMIN' | 'BOX_AGENT' | 'PSYCHO_AGENT'
// No existe "PUESTO". Si querés que entren BOX y PSICO:
const router = createBrowserRouter([
  {
    path: "/admin",
    element: (
      <ProtectedRoute allow={["ADMIN"]}>
        <AdminPage />
      </ProtectedRoute>
    ),
  },
   {
    path: "/admin/users",
    element: (
      <ProtectedRoute allow={["ADMIN"]}>
        <AdminUsers />
      </ProtectedRoute>
    ),
  },
  {
    path: "/puesto",
    element: (
      <ProtectedRoute allow={["ADMIN", "BOX_AGENT", "PSYCHO_AGENT"]}>
        <PuestoPage />
      </ProtectedRoute>
    ),
  },
  { path: "/tv", element: <TVBoard /> },   // pública
  { path: "/login", element: <Login /> },
  // protegé root también (opcional):
  {
    path: "/",
    element: (
      <ProtectedRoute allow={[]}>
        <PuestoPage />
      </ProtectedRoute>
    ),
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
