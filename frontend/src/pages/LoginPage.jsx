import React, { useState } from 'react';
import axios from 'axios';
import { ShieldCheck, LayoutDashboard, KeyRound, UserCheck, AlertCircle } from 'lucide-react';

export default function LoginPage({ onLoginSuccess }) {
  const [inspectorId, setInspectorId] = useState('INS-MH-024');
  const [inspectorPass, setInspectorPass] = useState('password123');

  const [adminId, setAdminId] = useState('ADM-MH-001');
  const [adminPass, setAdminPass] = useState('password123');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInspectorLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/auth/inspector-login', {
        inspector_id: inspectorId,
        password: inspectorPass
      });
      if (res.data.success) {
        onLoginSuccess('inspector', res.data.user);
      } else {
        setError(res.data.detail || 'Inspector login failed.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Connection to backend failed. Please ensure Express server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/auth/admin-login', {
        admin_id: adminId,
        password: adminPass
      });
      if (res.data.success) {
        onLoginSuccess('admin', res.data.user);
      } else {
        setError(res.data.detail || 'Administrator login failed.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Connection to backend failed. Please ensure Express server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-govblue">Portal Authentication</h2>
        <p className="text-sm text-slate-600 mt-1">
          Select your authorized role to access the inspection & compliance management portal
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-red-800 text-sm">
          <AlertCircle size={18} className="shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* OPTION 1: INSPECTOR LOGIN */}
        <div className="bg-white p-6 rounded-lg border border-slate-300 shadow-sm flex flex-col justify-between hover:border-govblue/50 transition">
          <div>
            <div className="flex items-center space-x-2 border-b pb-3 mb-4">
              <ShieldCheck className="text-govblue" size={24} />
              <div>
                <h3 className="font-bold text-lg text-govblue">Inspector Login</h3>
                <p className="text-xs text-slate-500">Field compliance officer access</p>
              </div>
            </div>

            <form onSubmit={handleInspectorLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Inspector ID</label>
                <input
                  type="text"
                  value={inspectorId}
                  onChange={(e) => setInspectorId(e.target.value)}
                  className="w-full border border-slate-300 p-2.5 rounded text-sm bg-slate-50 focus:bg-white focus:outline-blue-600 focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Password</label>
                <input
                  type="password"
                  value={inspectorPass}
                  onChange={(e) => setInspectorPass(e.target.value)}
                  className="w-full border border-slate-300 p-2.5 rounded text-sm bg-slate-50 focus:bg-white focus:outline-blue-600 focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>

              <div className="bg-blue-50/80 p-3 rounded text-xs text-blue-900 border border-blue-200">
                <span className="font-bold">Demo Credentials:</span><br />
                ID: <span className="font-mono font-bold">INS-MH-024</span> (Tushar Ganmukhe)<br />
                Pass: <span className="font-mono font-bold">password123</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-govblue text-white py-2.5 rounded text-sm font-semibold hover:bg-blue-900 transition shadow disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Login as Inspector'}
              </button>
            </form>
          </div>
        </div>

        {/* OPTION 2: ADMINISTRATIVE LOGIN */}
        <div className="bg-white p-6 rounded-lg border border-slate-300 shadow-sm flex flex-col justify-between hover:border-govblue/50 transition">
          <div>
            <div className="flex items-center space-x-2 border-b pb-3 mb-4">
              <LayoutDashboard className="text-govblue" size={24} />
              <div>
                <h3 className="font-bold text-lg text-govblue">Administrative Login</h3>
                <p className="text-xs text-slate-500">Central monitoring & analytics access</p>
              </div>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Administrator ID</label>
                <input
                  type="text"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  className="w-full border border-slate-300 p-2.5 rounded text-sm bg-slate-50 focus:bg-white focus:outline-blue-600 focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Password</label>
                <input
                  type="password"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  className="w-full border border-slate-300 p-2.5 rounded text-sm bg-slate-50 focus:bg-white focus:outline-blue-600 focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>

              <div className="bg-blue-50/80 p-3 rounded text-xs text-blue-900 border border-blue-200">
                <span className="font-bold">Demo Credentials:</span><br />
                ID: <span className="font-mono font-bold">ADM-MH-001</span> (Shashvat)<br />
                Pass: <span className="font-mono font-bold">password123</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-govblue text-white py-2.5 rounded text-sm font-semibold hover:bg-blue-900 transition shadow disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Login as Administrator'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
