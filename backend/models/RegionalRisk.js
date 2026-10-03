const mongoose = require('mongoose');

const RegionalRiskSchema = new mongoose.Schema({
  region: { type: String, required: true, unique: true },
  total_inspections: { type: Number, default: 0 },
  passed: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  risk_level: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' }
});

const PriorityAreaSchema = new mongoose.Schema({
  area: { type: String, required: true },
  priority: { type: String, required: true }
});

const RegionalRisk = mongoose.model('RegionalRisk', RegionalRiskSchema);
const PriorityArea = mongoose.model('PriorityArea', PriorityAreaSchema);

module.exports = { RegionalRisk, PriorityArea };
