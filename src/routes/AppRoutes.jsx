import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Animals from '../pages/Animals';
import Devices from './pages/Devices';
import Users from '../pages/Users';


function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/animals" element={<Animals />} />
        <Route path="/devices" element={<Devices />} />
        <Route path="/users" element={<Users />} />


      </Routes>
    </Router>
  );
}

export default AppRoutes;
