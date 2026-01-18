
import { Routes, Route } from 'react-router-dom';
import Welcome from './pages/Welcome';
import Booking from './pages/patient/Booking';
import CareHome from './pages/patient/CareHome';
import AdminDashboard from './pages/admin/Dashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/patient/booking" element={<Booking />} />
      <Route path="/patient/care" element={<CareHome />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  );
}

export default App;
