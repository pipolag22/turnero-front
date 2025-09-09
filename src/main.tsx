import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App'
import Login from './pages/Login'
import PublicQueue from './pages/PublicQueue'
import BoxPanel from './pages/BoxPanel'
import AdminUsers from './pages/AdminUsers'
import { AuthProvider } from './context/AuthContext'
import TVBoard from './pages/TVBoard';
import BoxWall from './pages/BoxWall';
import Intake from './pages/Intake';
import PsyPanel from './pages/PsyPanel';

const router = createBrowserRouter([
  { path: '/', element: <PublicQueue /> },
  { path: '/login', element: <Login /> },
  { path: '/box', element: <BoxPanel /> },     
  { path: '/wall', element: <BoxWall /> },     
  { path: '/tv', element: <TVBoard /> },       
  { path: '/admin/users', element: <AdminUsers /> },
  { path: '/app', element: <App /> },
  { path: '/intake', element: <Intake /> }, 
  { path: "/psy", element: <PsyPanel />},
  { path: '/admin/users', element: <AdminUsers /> },
  
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
)
