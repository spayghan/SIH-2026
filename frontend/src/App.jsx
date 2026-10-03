import React, { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import LoginPage from './pages/LoginPage';
import InspectorPortal from './pages/inspector/InspectorPortal';
import AdminPortal from './pages/admin/AdminPortal';

export default function App() {
  const [currentRole, setCurrentRole] = useState(null); // null, 'inspector', 'admin'
  const [currentUser, setCurrentUser] = useState(null);

  const handleLoginSuccess = (role, user) => {
    setCurrentRole(role);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentRole(null);
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-govbg text-slate-800">
      <div>
        <Header user={currentUser} role={currentRole} onLogout={handleLogout} />

        <main className="max-w-7xl mx-auto px-4 py-6 w-full">
          {!currentRole && (
            <LoginPage onLoginSuccess={handleLoginSuccess} />
          )}

          {currentRole === 'inspector' && (
            <InspectorPortal user={currentUser} />
          )}

          {currentRole === 'admin' && (
            <AdminPortal user={currentUser} />
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}
