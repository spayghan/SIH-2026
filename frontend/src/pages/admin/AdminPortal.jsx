import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LayoutDashboard, Shield, AlertTriangle, CheckCircle2,
  Clock, MapPin, Search, RotateCcw, X, Eye, FileText
} from 'lucide-react';

export default function AdminPortal({ user }) {
  const [adminTab, setAdminTab] = useState('overview'); // overview, inspections, regions
  const [kpis, setKpis] = useState({
    total_inspections: 0,
    passed: 0,
    failed: 0,
    pending: 0,
    high_risk_areas: 0
  });
  const [inspections, setInspections] = useState([]);
  const [regionalRisk, setRegionalRisk] = useState([]);
  const [priorityAreas, setPriorityAreas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseModalOpen, setCaseModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchInspections();
    fetchRegionalRisk();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get('/admin/dashboard');
      if (res.data.success) {
        setKpis(res.data.kpis);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    }
  };

  const fetchInspections = async () => {
    try {
      const res = await axios.get('/admin/inspections');
      if (res.data.success) {
        setInspections(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load inspections:', err);
    }
  };

  const fetchRegionalRisk = async () => {
    try {
      const res = await axios.get('/admin/regional-analysis');
      if (res.data.success) {
        setRegionalRisk(res.data.regional_risk_data || []);
        setPriorityAreas(res.data.priority_areas || []);
      }
    } catch (err) {
      console.error('Failed to load regional analysis:', err);
    }
  };

  const handleViewCase = async (id) => {
    try {
      const res = await axios.get(`/inspections/${id}/result`);
      if (res.data.success) {
        setSelectedCase(res.data.data);
        setCaseModalOpen(true);
      }
    } catch (err) {
      alert('Could not load inspection details.');
    }
  };

  const filteredInspections = inspections.filter((i) => {
    const term = searchTerm.toLowerCase();
    return (
      (i.inspection_id || '').toLowerCase().includes(term) ||
      (i.shop_name || '').toLowerCase().includes(term) ||
      (i.district || '').toLowerCase().includes(term) ||
      (i.inspector_name || '').toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Passed':
        return (
          <span className="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1">
            <CheckCircle2 size={12} /> Passed
          </span>
        );
      case 'Failed':
        return (
          <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1">
            <AlertTriangle size={12} /> Failed
          </span>
        );
      default:
        return (
          <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1">
            <Clock size={12} /> Processing
          </span>
        );
    }
  };

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'HIGH':
        return <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold">HIGH</span>;
      case 'MEDIUM':
        return <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-xs font-bold">MEDIUM</span>;
      default:
        return <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold">LOW</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ADMIN NAV BAR */}
      <nav className="bg-white border-b border-slate-300 px-4 py-2.5 flex justify-between items-center rounded-lg shadow-sm">
        <div className="flex items-center space-x-6 text-sm">
          <span className="font-bold text-govblue flex items-center gap-1.5">
            <LayoutDashboard size={18} />
            <span>{user?.name || 'Administrator'}</span>
            <span className="text-xs text-slate-500 font-mono">({user?.admin_id || 'ADM-MH-001'})</span>
          </span>
          <div className="space-x-3 hidden md:flex">
            <button
              onClick={() => setAdminTab('overview')}
              className={`px-2 py-1 rounded transition ${adminTab === 'overview' ? 'font-bold text-govblue border-b-2 border-govblue' : 'text-slate-600 hover:text-govblue'}`}
            >
              Overview
            </button>
            <button
              onClick={() => { setAdminTab('inspections'); fetchInspections(); }}
              className={`px-2 py-1 rounded transition ${adminTab === 'inspections' ? 'font-bold text-govblue border-b-2 border-govblue' : 'text-slate-600 hover:text-govblue'}`}
            >
              All Inspections
            </button>
            <button
              onClick={() => { setAdminTab('regions'); fetchRegionalRisk(); }}
              className={`px-2 py-1 rounded transition ${adminTab === 'regions' ? 'font-bold text-govblue border-b-2 border-govblue' : 'text-slate-600 hover:text-govblue'}`}
            >
              Regional Risk
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-semibold bg-slate-100 px-2.5 py-1 rounded border">
          Role: Administrative Monitoring
        </div>
      </nav>

      {/* 1. OVERVIEW TAB */}
      {adminTab === 'overview' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-govblue">Administrative Control Room</h2>
            <p className="text-sm text-slate-600 mt-1">
              Live oversight of retail field inspections and compliance across all registered districts.
            </p>
          </div>

          {/* KPI CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-sm">
              <p className="text-xs uppercase font-bold text-slate-500">Total Inspections</p>
              <p className="text-2xl font-bold text-govblue mt-2">{(kpis.total_inspections || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-sm">
              <p className="text-xs uppercase font-bold text-green-700">Passed</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{(kpis.passed || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-sm">
              <p className="text-xs uppercase font-bold text-red-700">Failed</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{(kpis.failed || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-sm">
              <p className="text-xs uppercase font-bold text-amber-700">Pending</p>
              <p className="text-2xl font-bold text-amber-600 mt-2">{(kpis.pending || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-sm">
              <p className="text-xs uppercase font-bold text-rose-700">High Risk Areas</p>
              <p className="text-2xl font-bold text-rose-600 mt-2">{kpis.high_risk_areas || 0}</p>
            </div>
          </div>

          {/* LATEST FIELD ACTIVITY */}
          <div className="bg-white border border-slate-300 rounded-lg shadow-sm p-5">
            <div className="flex justify-between items-center border-b pb-3 mb-3">
              <h3 className="font-bold text-govblue">Latest Field Activity</h3>
              <button
                onClick={() => setAdminTab('inspections')}
                className="text-xs text-blue-700 font-semibold hover:underline"
              >
                View all inspections →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-700">
                  <tr>
                    <th className="p-3">Inspection ID</th>
                    <th className="p-3">Establishment</th>
                    <th className="p-3">Inspector</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {inspections.slice(0, 5).map((item) => (
                    <tr key={item.inspection_id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-govblue">{item.inspection_id}</td>
                      <td className="p-3">{item.shop_name}</td>
                      <td className="p-3 text-xs">{item.inspector_name}</td>
                      <td className="p-3">{getStatusBadge(item.status)}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleViewCase(item.inspection_id)}
                          className="text-xs bg-slate-200 px-3 py-1 rounded font-semibold hover:bg-slate-300 transition"
                        >
                          View Case
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. ALL INSPECTIONS TAB */}
      {adminTab === 'inspections' && (
        <div className="bg-white border border-slate-300 rounded-lg shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
            <h3 className="font-bold text-govblue">All Connected Inspector Submissions</h3>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search establishment, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border rounded text-xs bg-slate-50 focus:bg-white focus:outline-govblue"
                />
              </div>
              <button
                onClick={fetchInspections}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded border font-semibold flex items-center gap-1 shrink-0"
              >
                <RotateCcw size={13} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-700">
                <tr>
                  <th className="p-3">ID / Date</th>
                  <th className="p-3">Establishment</th>
                  <th className="p-3">District</th>
                  <th className="p-3">Inspector</th>
                  <th className="p-3">Violations</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredInspections.map((item) => (
                  <tr key={item.inspection_id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-mono font-bold text-govblue">{item.inspection_id}</div>
                      <div className="text-xs text-slate-500">{item.date}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{item.shop_name}</div>
                      <div className="text-xs text-slate-500">{item.owner_name}</div>
                    </td>
                    <td className="p-3 text-xs">{item.district}</td>
                    <td className="p-3 text-xs">{item.inspector_name}</td>
                    <td className="p-3 font-bold text-slate-700">{item.violations_count}</td>
                    <td className="p-3">{getStatusBadge(item.status)}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleViewCase(item.inspection_id)}
                        className="text-xs bg-slate-200 px-3 py-1.5 rounded font-semibold hover:bg-slate-300 transition"
                      >
                        View Case
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredInspections.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-6 text-center text-slate-500 text-sm">
                      No matching inspections found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. REGIONAL RISK TAB */}
      {adminTab === 'regions' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-300 rounded-lg shadow-sm p-5">
            <h3 className="font-bold text-govblue border-b pb-3 mb-4 flex items-center gap-2">
              <MapPin size={18} />
              <span>Regional Risk Analysis</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-700">
                  <tr>
                    <th className="p-3">Region / District</th>
                    <th className="p-3">Total Inspections</th>
                    <th className="p-3">Passed</th>
                    <th className="p-3">Failed</th>
                    <th className="p-3">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {regionalRisk.map((r) => (
                    <tr key={r.region} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold">{r.region}</td>
                      <td className="p-3 font-mono">{r.total_inspections}</td>
                      <td className="p-3 text-green-700 font-semibold font-mono">{r.passed}</td>
                      <td className="p-3 text-red-700 font-semibold font-mono">{r.failed}</td>
                      <td className="p-3">{getRiskBadge(r.risk_level)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PRIORITY AREAS */}
          {priorityAreas.length > 0 && (
            <div className="bg-white border border-slate-300 rounded-lg shadow-sm p-5">
              <h4 className="font-bold text-govblue text-sm mb-3">Enforcement Priority Areas</h4>
              <div className="flex flex-wrap gap-2">
                {priorityAreas.map((p, idx) => (
                  <span
                    key={idx}
                    className="bg-blue-50 text-blue-900 border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold"
                  >
                    {p.area} • <strong className="text-red-700">{p.priority}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. CASE REVIEW MODAL */}
      {caseModalOpen && selectedCase && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-govblue flex items-center gap-2">
                <FileText size={20} />
                <span>Inspection Case Review</span>
              </h3>
              <button
                onClick={() => setCaseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-lg border">
              <div>
                <span className="text-slate-500 font-bold uppercase block">Inspection ID</span>
                <p className="font-mono font-bold text-govblue text-sm">{selectedCase.inspection_id}</p>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase block">Status</span>
                <p className="mt-0.5">{getStatusBadge(selectedCase.status)}</p>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase block">Establishment</span>
                <p className="font-medium text-slate-800">{selectedCase.shop_name}</p>
                <p className="text-slate-500">Owner: {selectedCase.owner_name}</p>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase block">Inspecting Officer</span>
                <p className="text-slate-800">{selectedCase.inspector_name} ({selectedCase.inspector_id})</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 font-bold uppercase block">Location</span>
                <p className="text-slate-800">{selectedCase.address}, {selectedCase.district}, {selectedCase.state}</p>
              </div>
            </div>

            {/* Rule Engine Findings */}
            <div>
              <h4 className="font-bold text-govblue text-sm mb-2">Rule Engine Findings</h4>
              {selectedCase.violations && selectedCase.violations.length > 0 ? (
                <div className="space-y-2">
                  {selectedCase.violations.map((v, idx) => (
                    <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs space-y-1">
                      <p className="font-bold text-red-800 text-sm">{v.violation_name}</p>
                      <p className="text-slate-700">{v.reason}</p>
                      <p><span className="font-semibold text-slate-600">Law / Section:</span> {v.law} ({v.section})</p>
                      <p className="font-bold text-red-700">Penalty: {v.fine}</p>
                    </div>
                  ))}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded text-right text-xs font-bold">
                    <span>Total Penalty: </span>
                    <span className="text-red-700 text-sm font-bold">{selectedCase.total_penalty || 'Rs. 0'}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-green-700 font-semibold bg-green-50 p-3 rounded border border-green-200">
                  No violations recorded for this inspection.
                </p>
              )}
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button
                onClick={() => setCaseModalOpen(false)}
                className="bg-slate-200 text-slate-700 px-4 py-2 rounded text-xs font-semibold hover:bg-slate-300"
              >
                Close Case
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
