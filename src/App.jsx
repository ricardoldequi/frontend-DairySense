import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Animals from './pages/Animals';
import Devices from './pages/Devices';
import DeviceAnimals from './pages/DeviceAnimals';
import Users from './pages/Users';
import Readings from './pages/Readings';
import Baselines from './pages/Baselines';

function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('ProtectedRoute - Token:', token ? 'existe' : 'não existe');
    setIsAuthenticated(!!token);
  }, []);

  console.log('ProtectedRoute - isAuthenticated:', isAuthenticated);

  if (isAuthenticated === null) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando...</div>;
  }

  if (!isAuthenticated) {
    console.log('ProtectedRoute - Redirecionando para login');
    return <Navigate to="/" replace />;
  }

  console.log('ProtectedRoute - Renderizando página protegida');
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/animals" 
          element={
            <ProtectedRoute>
              <Animals />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/devices" 
          element={
            <ProtectedRoute>
              <Devices />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/device-animals" 
          element={
            <ProtectedRoute>
              <DeviceAnimals />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/users" 
          element={
            <ProtectedRoute>
              <Users />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/readings" 
          element={
            <ProtectedRoute>
              <Readings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/baselines" 
          element={
            <ProtectedRoute>
              <Baselines />
            </ProtectedRoute>
          } 
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
