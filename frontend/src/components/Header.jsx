import React from 'react';
import { Shield, LogOut, User as UserIcon } from 'lucide-react';

export default function Header({ user, role, onLogout }) {
  return (
    <header className="bg-govblue text-white shadow-md border-b-4 border-amber-500">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-2">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-govblue font-bold text-2xl border-2 border-amber-400 shadow-inner">
            🏛️
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">VYAPAR NIRIKSHAN PORTAL</h1>
            <p className="text-xs text-blue-200">Government Retail Inspection & Compliance Decision Support System</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-sm">
          <span className="bg-blue-900 px-3 py-1 rounded text-xs font-semibold border border-blue-700">
            Government of Maharashtra
          </span>
          <span className="bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded text-xs font-bold">
            MERN MVP
          </span>

          {user && (
            <div className="flex items-center space-x-2 pl-2 border-l border-blue-800">
              <span className="text-xs text-blue-100 hidden sm:inline">
                {role === 'admin' ? 'Admin:' : 'Inspector:'} <strong>{user.name}</strong>
              </span>
              <button
                onClick={onLogout}
                title="Logout"
                className="bg-red-500/20 hover:bg-red-500 text-white text-xs px-2.5 py-1 rounded border border-red-400/40 transition flex items-center space-x-1"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
