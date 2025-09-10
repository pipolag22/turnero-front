import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ProtectedRoute from "./context/ProtectedRoute";
import AdminPage from "./pages/AdminPage";
import PuestoPage from "./pages/PuestoPage";
import TVBoard from "./pages/TVBoard";
import Login from "./pages/Login";


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
  path: "/puesto",
  element: (
    <ProtectedRoute allow={["ADMIN", "PUESTO"]}>
      <PuestoPage />
    </ProtectedRoute>
  ),
},
{ path: "/tv", element: <TVBoard /> },   // pública o protegida si querés
{ path: "/login", element: <Login /> },
{ path: "/", element: <PuestoPage /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
