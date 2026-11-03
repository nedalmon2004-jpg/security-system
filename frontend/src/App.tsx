import { Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import ProtectedLayout from './layouts/ProtectedLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Overview from './pages/Overview';
import Transfer from './pages/Transfer';
import Transactions from './pages/Transactions';
import Cards from './pages/Cards';
import Admin from './pages/Admin';
import Ledger from './pages/Ledger';
import Profile from './pages/Profile';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route element={<ProtectedLayout />}>
        <Route path="/overview" element={<Overview />} />
        <Route path="/transfer" element={<Transfer />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/cards" element={<Cards />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/ledger" element={<Ledger />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
