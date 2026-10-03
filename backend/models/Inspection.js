const mongoose = require('mongoose');

const ViolationSchema = new mongoose.Schema({
  violation_name: { type: String, required: true },
  law: { type: String, required: true },
  section: { type: String, required: true },
  reason: { type: String, required: true },
  evidence: { type: String, default: 'N/A' },
  fine: { type: String, required: true }
}, { _id: false });

const ChallanSchema = new mongoose.Schema({
  challan_id: { type: String, required: true },
  inspection_id: { type: String, required: true },
  shop_name: { type: String, required: true },
  owner_name: { type: String, required: true },
  address: { type: String, required: true },
  gstin: { type: String, required: true },
  gst_verification_status: { type: String, default: 'Verified' },
  fssai_number: { type: String, required: true },
  fssai_verification_status: { type: String, default: 'Verified' },
  inspector: { type: String, required: true },
  date: { type: String, required: true },
  violations: [ViolationSchema],
  total_penalty: { type: String, default: 'Rs. 0' },
  approval_status: { type: String, default: 'Approved by Inspector' },
  approval_timestamp: { type: String },
  front_image: { type: String },
  back_image: { type: String },
  remarks: { type: String, default: 'Compoundable offences under Legal Metrology provisions.' },
  pdf_path: { type: String }
}, { _id: false });

const InspectionSchema = new mongoose.Schema({
  inspection_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  shop_name: { type: String, required: true },
  owner_name: { type: String, required: true },
  mobile_number: { type: String, default: '' },
  address: { type: String, required: true },
  district: { type: String, default: 'Amravati' },
  state: { type: String, default: 'Maharashtra' },
  product_category: { type: String, default: 'Packaged Food & Commodities' },
  gst_number: { type: String, required: true },
  gst_verification_status: { type: String, default: 'Verified' },
  fssai_license_number: { type: String, required: true },
  fssai_verification_status: { type: String, default: 'Verified' },
  barcode: { type: String, required: true },
  inspector_id: { type: String, required: true },
  inspector_name: { type: String, required: true },
  status: {
    type: String,
    enum: ['Processing', 'Passed', 'Failed'],
    default: 'Processing'
  },
  date: { type: String, required: true },
  front_image: { type: String, default: null },
  back_image: { type: String, default: null },
  violations: [ViolationSchema],
  total_penalty: { type: String, default: 'Rs. 0' },
  inspector_reviewed: { type: Boolean, default: false },
  inspector_approval_status: {
    type: String,
    default: 'Pending Review'
  },
  approval_timestamp: { type: String, default: null },
  challan: ChallanSchema
}, {
  timestamps: true
});

module.exports = mongoose.model('Inspection', InspectionSchema);
