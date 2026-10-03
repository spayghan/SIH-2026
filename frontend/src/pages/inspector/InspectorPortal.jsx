import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Shield, User, Clock, PlusCircle, RotateCcw, AlertTriangle,
  CheckCircle2, Loader2, Camera, ArrowRight, ArrowLeft, Printer,
  Download, FileText, Check, X
} from 'lucide-react';

export default function InspectorPortal({ user }) {
  const [activeTab, setActiveTab] = useState('home'); // home, profile, history, new_step1, new_step2, result, challan
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState(user || {});
  const [activeInspection, setActiveInspection] = useState(null);
  const [activeChallan, setActiveChallan] = useState(null);

  // New Inspection Form State
  const [formData, setFormData] = useState({
    shop_name: 'City Life Super Bazaar',
    owner_name: 'Amit Shah',
    mobile_number: '9876543210',
    address: 'Main Road',
    district: 'Amravati',
    state: 'Maharashtra',
    product_category: 'Packaged Food & Commodities',
    barcode: '8901030541203',
    gst_number: '27AABCS1429B1Z8',
    fssai_license_number: '10020030000412'
  });

  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);

  const [currentInspectionId, setCurrentInspectionId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    fetchHistory();
    fetchProfile();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get('/inspector/history');
      if (res.data.success) {
        setHistory(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get('/inspector/profile');
      if (res.data.success) {
        setProfile(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  const fetchInspectionResult = async (id) => {
    try {
      const res = await axios.get(`/inspections/${id}/result`);
      if (res.data.success) {
        setActiveInspection(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load inspection result:', err);
    }
  };

  const handleStartNewInspection = () => {
    setFrontFile(null);
    setBackFile(null);
    setFrontPreview(null);
    setBackPreview(null);
    setCurrentInspectionId(null);
    setActiveTab('new_step1');
  };

  const handleEstablishmentSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/inspections', formData);
      if (res.data.success) {
        setCurrentInspectionId(res.data.inspection_id);
        if (res.data.gst_status === 'Invalid' || res.data.fssai_status === 'Invalid') {
          alert('Warning: GST or FSSAI license format failed validation.');
        }
        setActiveTab('new_step2');
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Error saving establishment details.');
    }
  };

  const handleFrontImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFrontFile(file);
      setFrontPreview(URL.createObjectURL(file));
    }
  };

  const handleBackImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBackFile(file);
      setBackPreview(URL.createObjectURL(file));
    }
  };

  const handleVerificationSubmit = async () => {
    if (!frontFile || !backFile) {
      alert('Both Product Front and Back photos are mandatory for evidence.');
      return;
    }

    setIsUploading(true);
    setLoadingMessage('Uploading Front & Back Evidence Photos...');

    try {
      const uploadData = new FormData();
      uploadData.append('front_image', frontFile);
      uploadData.append('back_image', backFile);

      await axios.post(`/inspections/${currentInspectionId}/products`, uploadData);

      setLoadingMessage('Dispatching to AI Vision & Rule Engine Worker...');
      await axios.post(`/inspections/${currentInspectionId}/verify`);

      setIsUploading(false);
      await fetchInspectionResult(currentInspectionId);
      setActiveTab('result');

      // Auto-refresh after 2.5s for AI processing
      setTimeout(async () => {
        await fetchInspectionResult(currentInspectionId);
        fetchHistory();
      }, 2500);

    } catch (err) {
      setIsUploading(false);
      alert(err.response?.data?.detail || 'Error during verification upload.');
    }
  };

  const handleViewCase = async (id) => {
    await fetchInspectionResult(id);
    setActiveTab('result');
  };

  const handleReviewAction = async (id, action) => {
    try {
      const res = await axios.post(`/inspections/${id}/review`, { action });
      if (res.data.success) {
        alert(res.data.message);
        await fetchInspectionResult(id);
        fetchHistory();
        if (action === 'approve' && res.data.data.status === 'Failed') {
          handleViewChallan(id);
        }
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit review.');
    }
  };

  const handleViewChallan = async (id) => {
    try {
      const res = await axios.get(`/inspections/${id}/challan`);
      if (res.data.success) {
        setActiveChallan(res.data.data);
        setActiveTab('challan');
      }
    } catch (err) {
      alert('Challan not available. Ensure the case is approved by the inspector.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Passed':
        return (
          <span className="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1">
            <CheckCircle2 size={13} /> Passed
          </span>
        );
      case 'Failed':
        return (
          <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1">
            <AlertTriangle size={13} /> Failed
          </span>
        );
      default:
        return (
          <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1">
            <Loader2 size={13} className="animate-spin" /> Processing
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* INSPECTOR NAV BAR */}
      <nav className="bg-white border-b border-slate-300 px-4 py-2.5 flex justify-between items-center rounded-lg shadow-sm">
        <div className="flex items-center space-x-6 text-sm">
          <span className="font-bold text-govblue flex items-center gap-1.5">
            <Shield size={18} />
            <span>{profile.name || 'Tushar Ganmukhe'}</span>
            <span className="text-xs text-slate-500 font-mono">({profile.inspector_id || 'INS-MH-024'})</span>
          </span>
          <div className="space-x-3 hidden md:flex">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-2 py-1 rounded transition ${activeTab === 'home' ? 'font-bold text-govblue border-b-2 border-govblue' : 'text-slate-600 hover:text-govblue'}`}
            >
              Home
            </button>
            <button
              onClick={() => { setActiveTab('profile'); fetchProfile(); }}
              className={`px-2 py-1 rounded transition ${activeTab === 'profile' ? 'font-bold text-govblue border-b-2 border-govblue' : 'text-slate-600 hover:text-govblue'}`}
            >
              Profile
            </button>
            <button
              onClick={() => { setActiveTab('history'); fetchHistory(); }}
              className={`px-2 py-1 rounded transition ${activeTab === 'history' ? 'font-bold text-govblue border-b-2 border-govblue' : 'text-slate-600 hover:text-govblue'}`}
            >
              History
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          District: <span className="font-bold text-slate-700">{profile.district || 'Amravati'}</span>
        </div>
      </nav>

      {/* 1. TAB: HOME DASHBOARD */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-govblue">Welcome, {profile.name || 'Tushar Ganmukhe'}</h2>
              <p className="text-xs text-slate-600 mt-1">
                District: <strong>{profile.district || 'Amravati'}</strong> | Assigned Region: <strong>{profile.assigned_region || 'Amravati Urban'}</strong>
              </p>
            </div>
            <div>
              <button
                onClick={handleStartNewInspection}
                className="bg-govblue text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow hover:bg-blue-900 transition flex items-center space-x-2"
              >
                <PlusCircle size={18} />
                <span>New Inspection</span>
              </button>
            </div>
          </div>

          {/* INSPECTION STATUS TABLE */}
          <div className="bg-white p-6 rounded-lg border border-slate-300 shadow-sm">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="font-bold text-base text-govblue">Inspection Verification Status</h3>
              <button
                onClick={fetchHistory}
                className="text-xs text-blue-700 hover:underline font-semibold flex items-center gap-1"
              >
                <RotateCcw size={13} />
                <span>Refresh List</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b text-xs uppercase">
                    <th className="p-3">Inspection ID</th>
                    <th className="p-3">Shop Name</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {history.map((item) => (
                    <tr key={item.inspection_id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-govblue">{item.inspection_id}</td>
                      <td className="p-3 font-medium">{item.shop_name}</td>
                      <td className="p-3 text-xs text-slate-600">{item.date}</td>
                      <td className="p-3">{getStatusBadge(item.status)}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleViewCase(item.inspection_id)}
                          className="text-xs bg-slate-200 text-slate-800 px-3 py-1.5 rounded hover:bg-slate-300 font-medium transition"
                        >
                          View Case
                        </button>
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-slate-500 text-sm">
                        No inspections recorded yet. Click "New Inspection" to start.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. TAB: PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-white p-6 rounded-lg border border-slate-300 shadow-sm max-w-xl mx-auto">
          <h3 className="font-bold text-lg text-govblue border-b pb-2 mb-4 flex items-center gap-2">
            <User size={20} />
            <span>Inspector Profile</span>
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-bold">Inspector ID:</span>
              <span className="font-mono font-bold text-govblue">{profile.inspector_id || 'INS-MH-024'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-bold">Full Name:</span>
              <span>{profile.name || 'Tushar Ganmukhe'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-bold">Department:</span>
              <span>{profile.department || 'Retail & Food Safety Inspection'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-bold">District / Region:</span>
              <span>{profile.district || 'Amravati'} ({profile.assigned_region || 'Amravati Urban'})</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-bold">Designation:</span>
              <span>{profile.designation || 'Field Inspector'}</span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('home')}
            className="mt-6 bg-slate-200 px-4 py-2 rounded text-xs font-semibold hover:bg-slate-300"
          >
            Back to Dashboard
          </button>
        </div>
      )}

      {/* 3. TAB: HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-lg border border-slate-300 shadow-sm">
          <h3 className="font-bold text-base text-govblue mb-4 border-b pb-2 flex items-center gap-2">
            <Clock size={18} />
            <span>Complete Inspection History Log</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b text-xs uppercase">
                  <th className="p-3">Inspection ID</th>
                  <th className="p-3">Shop Name</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {history.map((item) => (
                  <tr key={item.inspection_id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-govblue">{item.inspection_id}</td>
                    <td className="p-3 font-medium">{item.shop_name}</td>
                    <td className="p-3 text-xs text-slate-600">{item.location}</td>
                    <td className="p-3 text-xs text-slate-600">{item.date}</td>
                    <td className="p-3">{getStatusBadge(item.status)}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleViewCase(item.inspection_id)}
                        className="text-xs bg-slate-200 text-slate-800 px-3 py-1.5 rounded hover:bg-slate-300 font-medium"
                      >
                        View Case
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => setActiveTab('home')}
            className="mt-6 bg-slate-200 px-4 py-2 rounded text-xs font-semibold hover:bg-slate-300"
          >
            Back to Dashboard
          </button>
        </div>
      )}

      {/* 4. NEW INSPECTION: STEP 1 - ESTABLISHMENT DETAILS */}
      {activeTab === 'new_step1' && (
        <div className="bg-white p-6 rounded-lg border border-slate-300 shadow-sm max-w-2xl mx-auto">
          <div className="border-b pb-3 mb-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg text-govblue">New Inspection</h3>
              <p className="text-xs text-slate-600">Enter Basic Establishment Details (Step 1 of 2)</p>
            </div>
            <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-bold">
              Step 1 / 2
            </span>
          </div>

          <form onSubmit={handleEstablishmentSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Shop / Establishment Name *
                </label>
                <input
                  type="text"
                  value={formData.shop_name}
                  onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                  className="w-full border p-2 rounded text-sm bg-slate-50 focus:bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Owner Name *
                </label>
                <input
                  type="text"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  className="w-full border p-2 rounded text-sm bg-slate-50 focus:bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Product Barcode / SKU *
                </label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="w-full border p-2 rounded text-sm bg-slate-50 focus:bg-white font-mono"
                  placeholder="e.g. 8901030541203"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Product Category *
                </label>
                <select
                  value={formData.product_category}
                  onChange={(e) => setFormData({ ...formData, product_category: e.target.value })}
                  className="w-full border p-2 rounded text-sm bg-slate-50 focus:bg-white"
                  required
                >
                  <option value="Packaged Food & Commodities">Packaged Food & Commodities</option>
                  <option value="Retail Packaged Goods">Retail Packaged Goods</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border p-2 rounded text-sm bg-slate-50 focus:bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  GST Number (15-digit) *
                </label>
                <input
                  type="text"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                  className="w-full border p-2 rounded text-sm bg-slate-50 focus:bg-white font-mono uppercase"
                  placeholder="27AABCS1429B1Z8"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  FSSAI License Number (14-digit) *
                </label>
                <input
                  type="text"
                  value={formData.fssai_license_number}
                  onChange={(e) => setFormData({ ...formData, fssai_license_number: e.target.value })}
                  className="w-full border p-2 rounded text-sm bg-slate-50 focus:bg-white font-mono"
                  placeholder="10020030000412"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="bg-slate-200 text-slate-700 px-4 py-2 rounded text-sm font-semibold hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-govblue text-white px-5 py-2 rounded text-sm font-semibold hover:bg-blue-900 transition flex items-center space-x-1"
              >
                <span>Verify & Next</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. NEW INSPECTION: STEP 2 - PRODUCT EVIDENCE UPLOAD */}
      {activeTab === 'new_step2' && (
        <div className="bg-white p-6 rounded-lg border border-slate-300 shadow-sm max-w-2xl mx-auto">
          <div className="border-b pb-3 mb-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg text-govblue">Product Verification</h3>
              <p className="text-xs text-slate-600">Upload Product Evidence Images (Step 2 of 2)</p>
            </div>
            <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-bold">
              Step 2 / 2
            </span>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded text-xs text-blue-900">
              <p>Capture clear photographs of the product's front and back packaging. This is required for evidence and AI verification.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Front Image */}
              <div className="border-2 border-dashed border-slate-300 p-4 rounded-lg text-center bg-slate-50 flex flex-col items-center justify-between">
                <Camera size={32} className="text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700 mb-2">Product Front Image *</p>

                {frontPreview && (
                  <div className="mb-3 max-h-36 overflow-hidden rounded border border-slate-300">
                    <img src={frontPreview} alt="Front preview" className="h-32 w-auto object-cover mx-auto" />
                  </div>
                )}

                <label className="bg-govblue text-white text-xs px-3.5 py-2 rounded font-semibold cursor-pointer hover:bg-blue-900 transition block">
                  <span>{frontFile ? 'Change Image' : 'Choose Front Image'}</span>
                  <input type="file" accept="image/*" onChange={handleFrontImageChange} className="hidden" />
                </label>
                {frontFile && (
                  <p className="text-[11px] text-green-700 font-bold mt-2 truncate max-w-[180px]">
                    ✓ {frontFile.name}
                  </p>
                )}
              </div>

              {/* Back Image */}
              <div className="border-2 border-dashed border-slate-300 p-4 rounded-lg text-center bg-slate-50 flex flex-col items-center justify-between">
                <Camera size={32} className="text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700 mb-2">Product Back Image *</p>

                {backPreview && (
                  <div className="mb-3 max-h-36 overflow-hidden rounded border border-slate-300">
                    <img src={backPreview} alt="Back preview" className="h-32 w-auto object-cover mx-auto" />
                  </div>
                )}

                <label className="bg-govblue text-white text-xs px-3.5 py-2 rounded font-semibold cursor-pointer hover:bg-blue-900 transition block">
                  <span>{backFile ? 'Change Image' : 'Choose Back Image'}</span>
                  <input type="file" accept="image/*" onChange={handleBackImageChange} className="hidden" />
                </label>
                {backFile && (
                  <p className="text-[11px] text-green-700 font-bold mt-2 truncate max-w-[180px]">
                    ✓ {backFile.name}
                  </p>
                )}
              </div>
            </div>

            {isUploading && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-center text-xs text-amber-800 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-amber-600" />
                <span>{loadingMessage}</span>
              </div>
            )}

            <div className="flex justify-between space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setActiveTab('new_step1')}
                className="bg-slate-200 text-slate-700 px-4 py-2 rounded text-sm font-semibold hover:bg-slate-300 flex items-center gap-1"
              >
                <ArrowLeft size={16} />
                <span>Previous</span>
              </button>
              <button
                type="button"
                onClick={handleVerificationSubmit}
                disabled={isUploading}
                className="bg-govblue text-white px-5 py-2 rounded text-sm font-semibold hover:bg-blue-900 transition shadow disabled:opacity-50 flex items-center gap-1"
              >
                <span>Continue & Verify</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. INSPECTION RESULT / REVIEW VIEW */}
      {activeTab === 'result' && activeInspection && (
        <div className="bg-white p-6 rounded-lg border border-slate-300 shadow-sm max-w-2xl mx-auto space-y-5">
          <div className="border-b pb-3 flex justify-between items-center">
            <h3 className="font-bold text-lg text-govblue">Inspection Verification Result</h3>
            <button
              onClick={() => setActiveTab('home')}
              className="text-xs bg-slate-200 px-3 py-1.5 rounded font-medium hover:bg-slate-300"
            >
              Dashboard
            </button>
          </div>

          {/* STATUS BANNER */}
          <div className={`p-4 rounded-lg border text-center ${
            activeInspection.status === 'Passed'
              ? 'bg-green-50 border-green-300 text-green-900'
              : activeInspection.status === 'Failed'
              ? 'bg-red-50 border-red-300 text-red-900'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}>
            {activeInspection.status === 'Processing' && (
              <div>
                <Loader2 size={28} className="animate-spin mx-auto mb-1 text-amber-600" />
                <p className="font-bold text-base">Inspection is being processed by AI Worker...</p>
                <p className="text-xs text-slate-600 mt-1">Please wait a moment while the images and rules are processed.</p>
              </div>
            )}
            {activeInspection.status === 'Passed' && (
              <div>
                <CheckCircle2 size={28} className="mx-auto mb-1 text-green-600" />
                <p className="font-bold text-base">Inspection Passed</p>
                <p className="text-xs mt-1">No regulatory violations detected by the Rule Engine.</p>
              </div>
            )}
            {activeInspection.status === 'Failed' && (
              <div>
                <AlertTriangle size={28} className="mx-auto mb-1 text-red-600" />
                <p className="font-bold text-base">Inspection Failed - Review Required</p>
                <p className="text-xs mt-1">System detected compliance violations. Inspector review necessary.</p>
              </div>
            )}
          </div>

          {/* COMPLIANCE SUMMARY BLOCK */}
          <div className="bg-slate-50 p-4 rounded-lg border space-y-2 text-sm">
            <h4 className="font-bold text-govblue text-sm border-b pb-1 mb-2">Compliance Summary</h4>
            <div className="flex justify-between border-b pb-1">
              <span className="text-slate-500 text-xs font-bold uppercase">Inspection ID:</span>
              <span className="font-mono font-bold text-govblue">{activeInspection.inspection_id}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-slate-500 text-xs font-bold uppercase">Establishment:</span>
              <span className="font-medium">{activeInspection.shop_name}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-slate-500 text-xs font-bold uppercase">GST Verification:</span>
              <span className={activeInspection.gst_verification_status === 'Verified' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                {activeInspection.gst_verification_status} ({activeInspection.gst_number})
              </span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-slate-500 text-xs font-bold uppercase">FSSAI Verification:</span>
              <span className={activeInspection.fssai_verification_status === 'Verified' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                {activeInspection.fssai_verification_status} ({activeInspection.fssai_license_number})
              </span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-slate-500 text-xs font-bold uppercase">Violations Detected:</span>
              <span className="font-bold text-red-700">{(activeInspection.violations || []).length}</span>
            </div>
            {activeInspection.total_penalty && activeInspection.total_penalty !== 'Rs. 0' && (
              <div className="flex justify-between pt-1">
                <span className="text-slate-500 text-xs font-bold uppercase">Total Calculated Penalty:</span>
                <span className="font-bold text-red-700 text-base">{activeInspection.total_penalty}</span>
              </div>
            )}
          </div>

          {/* DETECTED VIOLATIONS LIST */}
          {activeInspection.status === 'Failed' && activeInspection.violations && activeInspection.violations.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold text-red-800 text-sm mt-4 border-b border-red-200 pb-1">
                Detected Violations Detail ({activeInspection.violations.length}):
              </h4>
              {activeInspection.violations.map((v, index) => (
                <div key={index} className="bg-red-50 border border-red-200 p-3.5 rounded-lg text-sm space-y-1">
                  <p className="font-bold text-red-800">{index + 1}. {v.violation_name}</p>
                  <p className="text-xs"><span className="font-bold text-slate-700">Law / Act:</span> <span className="text-slate-800">{v.law}</span></p>
                  <p className="text-xs"><span className="font-bold text-slate-700">Section / Rule:</span> <span className="font-mono text-slate-800">{v.section}</span></p>
                  <p className="text-xs"><span className="font-bold text-slate-700">Reason:</span> <span className="text-slate-800">{v.reason}</span></p>
                  <p className="text-xs"><span className="font-bold text-slate-700">Evidence:</span> <span className="text-slate-800">{v.evidence}</span></p>
                  <p className="text-xs"><span className="font-bold text-slate-700">Fine:</span> <span className="text-red-700 font-bold">{v.fine}</span></p>
                </div>
              ))}
            </div>
          )}

          {/* INSPECTOR APPROVAL WORKFLOW */}
          {activeInspection.status === 'Failed' && !activeInspection.inspector_reviewed && (
            <div className="bg-slate-100 border border-slate-300 p-4 rounded-lg mt-4 text-center">
              <p className="text-sm font-bold text-slate-800 mb-3">Inspector Authorization Required</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button
                  onClick={() => handleReviewAction(activeInspection.inspection_id, 'reject')}
                  className="bg-slate-500 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-slate-600 transition"
                >
                  Reject / Send Back
                </button>
                <button
                  onClick={() => handleReviewAction(activeInspection.inspection_id, 'approve')}
                  className="bg-red-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-red-700 shadow transition"
                >
                  Approve Violation & Generate Challan
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                No official legal notice will be generated without explicit inspector sign-off.
              </p>
            </div>
          )}

          {/* VIEW CHALLAN BUTTON AFTER APPROVAL */}
          {activeInspection.inspector_reviewed && activeInspection.inspector_approval_status === 'Approved' && (
            <div className="text-center pt-4 border-t mt-4">
              <p className="text-xs text-green-700 font-bold mb-2">
                ✅ Case Approved. Official E-Challan has been generated.
              </p>
              <button
                onClick={() => handleViewChallan(activeInspection.inspection_id)}
                className="bg-govblue text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-blue-900 transition shadow flex items-center justify-center space-x-2 mx-auto"
              >
                <FileText size={18} />
                <span>View Official E-Challan</span>
              </button>
            </div>
          )}

          {activeInspection.inspector_reviewed && activeInspection.inspector_approval_status !== 'Approved' && (
            <div className="text-center pt-3 border-t text-xs font-bold text-amber-700">
              Status: Case was {activeInspection.inspector_approval_status} by inspecting officer.
            </div>
          )}

          <div className="text-center pt-2">
            <button
              onClick={() => fetchInspectionResult(activeInspection.inspection_id)}
              className="text-xs text-blue-700 underline font-semibold flex items-center justify-center gap-1 mx-auto"
            >
              <RotateCcw size={12} />
              <span>Refresh Processing Status</span>
            </button>
          </div>
        </div>
      )}

      {/* 7. OFFICIAL CHALLAN VIEW */}
      {activeTab === 'challan' && activeChallan && (
        <div className="bg-white p-8 rounded-lg border border-slate-300 shadow-sm max-w-2xl mx-auto space-y-6">
          {/* Header Banner */}
          <div className="text-center border-b-2 border-slate-800 pb-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Government of India</h4>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-600 mt-0.5">
              Ministry of Consumer Affairs - Department of Legal Metrology
            </h4>
            <h3 className="text-xl font-bold text-govblue mt-2">OFFICIAL NOTICE OF OFFENCE / E-CHALLAN</h3>
            <p className="text-xs text-slate-800 mt-1 font-mono font-bold bg-slate-100 py-1 rounded inline-block px-3">
              {activeChallan.challan_id}
            </p>
          </div>

          {/* Challan Metadata */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border">
            <div>
              <span className="text-slate-500 font-bold block uppercase">Date & Time:</span>
              <span className="text-slate-700 font-medium">{activeChallan.date}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-bold block uppercase">Inspection ID:</span>
              <span className="font-mono font-semibold">{activeChallan.inspection_id}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 font-bold block uppercase">Inspecting Officer:</span>
              <span className="font-semibold text-slate-700">{activeChallan.inspector}</span>
            </div>
          </div>

          {/* Establishment Block */}
          <div className="text-xs bg-slate-50 p-4 rounded-lg border space-y-1">
            <h5 className="font-bold text-govblue uppercase text-xs mb-2">1. Establishment Details</h5>
            <p><span className="font-bold text-slate-600">Establishment:</span> {activeChallan.shop_name}</p>
            <p><span className="font-bold text-slate-600">Owner Name:</span> {activeChallan.owner_name}</p>
            <p><span className="font-bold text-slate-600">Address:</span> {activeChallan.address}</p>
            <p><span className="font-bold text-slate-600">GSTIN:</span> {activeChallan.gstin} ({activeChallan.gst_verification_status})</p>
            <p><span className="font-bold text-slate-600">FSSAI License:</span> {activeChallan.fssai_number} ({activeChallan.fssai_verification_status})</p>
          </div>

          {/* Approved Violations */}
          <div className="space-y-3 text-sm border-t border-b py-4">
            <h4 className="font-bold text-govblue uppercase text-xs">2. Approved Violations ({(activeChallan.violations || []).length})</h4>
            {(activeChallan.violations || []).map((v, index) => (
              <div key={index} className="bg-slate-50 border border-slate-200 p-3 rounded text-xs space-y-1">
                <p className="font-bold text-red-800 text-sm">VIOLATION {index + 1}: {v.violation_name}</p>
                <p><span className="font-bold text-slate-600">Law / Act:</span> {v.law}</p>
                <p><span className="font-bold text-slate-600">Section / Rule:</span> <span className="font-mono">{v.section}</span></p>
                <p><span className="font-bold text-slate-600">Description:</span> {v.reason}</p>
                <p><span className="font-bold text-slate-600">Fine:</span> <span className="text-red-700 font-bold">{v.fine}</span></p>
              </div>
            ))}

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-right">
              <span className="text-xs font-bold text-slate-700 uppercase mr-2">Total Calculated Penalty:</span>
              <span className="text-base font-bold text-red-700">{activeChallan.total_penalty}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-3">
            <button
              onClick={() => setActiveTab('home')}
              className="w-full sm:w-auto text-xs bg-slate-200 text-slate-700 px-4 py-2.5 rounded font-semibold hover:bg-slate-300 flex items-center justify-center gap-1"
            >
              <ArrowLeft size={15} />
              <span>Back to Dashboard</span>
            </button>
            <div className="flex space-x-2 w-full sm:w-auto">
              <button
                onClick={() => window.print()}
                className="flex-1 sm:flex-none bg-slate-700 text-white px-4 py-2.5 rounded text-sm font-semibold hover:bg-slate-800 transition shadow flex items-center justify-center gap-1.5"
              >
                <Printer size={16} />
                <span>Print</span>
              </button>
              <a
                href={`/inspections/${activeChallan.inspection_id}/download-pdf`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-none bg-govblue text-white px-5 py-2.5 rounded text-sm font-semibold hover:bg-blue-900 transition shadow flex items-center justify-center gap-1.5"
              >
                <Download size={16} />
                <span>Download PDF</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
