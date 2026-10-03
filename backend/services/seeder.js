const User = require('../models/User');
const Inspection = require('../models/Inspection');
const { RegionalRisk, PriorityArea } = require('../models/RegionalRisk');
const { generateOfficialChallanPdf } = require('./pdfGenerator');
const path = require('path');
const fs = require('fs');

async function seedInitialData() {
  try {
    // 1. Seed Users if empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Seeder] Seeding default users (Inspector & Administrator)...');
      await User.create([
        {
          userId: 'INS-MH-024',
          name: 'Tushar Ganmukhe',
          password: 'password123',
          role: 'Inspector',
          department: 'Retail & Food Safety Inspection',
          district: 'Amravati',
          assignedRegion: 'Amravati Urban',
          designation: 'Field Inspector'
        },
        {
          userId: 'ADM-MH-001',
          name: 'Shashvat',
          password: 'password123',
          role: 'Administrator',
          department: 'Administrative Monitoring',
          level: 'Administrative Level'
        }
      ]);
      console.log('[Seeder] Users seeded successfully.');
    }

    // 2. Seed Regional Risk & Priority Areas if empty
    const riskCount = await RegionalRisk.countDocuments();
    if (riskCount === 0) {
      console.log('[Seeder] Seeding regional risk benchmarks...');
      await RegionalRisk.insertMany([
        { region: "Amravati", total_inspections: 420, passed: 310, failed: 110, risk_level: "HIGH" },
        { region: "Mumbai", total_inspections: 850, passed: 580, failed: 270, risk_level: "HIGH" },
        { region: "Pune", total_inspections: 620, passed: 450, failed: 170, risk_level: "HIGH" },
        { region: "Nashik", total_inspections: 310, passed: 240, failed: 70, risk_level: "MEDIUM" },
        { region: "Nagpur", total_inspections: 290, passed: 250, failed: 40, risk_level: "LOW" },
        { region: "Chhatrapati Sambhajinagar", total_inspections: 210, passed: 160, failed: 50, risk_level: "MEDIUM" },
        { region: "Kolhapur", total_inspections: 146, passed: 112, failed: 34, risk_level: "MEDIUM" },
        { region: "Delhi", total_inspections: 920, passed: 640, failed: 280, risk_level: "HIGH" },
        { region: "Gujarat", total_inspections: 540, passed: 420, failed: 120, risk_level: "MEDIUM" },
        { region: "Karnataka", total_inspections: 480, passed: 380, failed: 100, risk_level: "MEDIUM" },
        { region: "Uttar Pradesh", total_inspections: 780, passed: 520, failed: 260, risk_level: "HIGH" }
      ]);

      await PriorityArea.insertMany([
        { area: "Amravati", priority: "High Priority" },
        { area: "Mumbai", priority: "High Priority" },
        { area: "Pune", priority: "High Priority" },
        { area: "Delhi", priority: "High Priority" },
        { area: "Nashik", priority: "Medium Priority" },
        { area: "Nagpur", priority: "Low Priority" }
      ]);
      console.log('[Seeder] Regional risk & priority areas seeded.');
    }

    // 3. Seed demo inspections if empty
    const inspectionCount = await Inspection.countDocuments();
    if (inspectionCount === 0) {
      console.log('[Seeder] Seeding initial demonstration inspections...');

      const sampleChallan = {
        challan_id: 'CHL-2026-000001',
        inspection_id: 'INSP-2026-001',
        shop_name: 'Shri Ganesh General Stores',
        owner_name: 'Rajesh Sharma',
        address: 'Main Road, Camp Area, Amravati',
        gstin: '27AABCS1429B1Z8',
        gst_verification_status: 'Verified',
        fssai_number: '10020030000412',
        fssai_verification_status: 'Verified',
        inspector: 'Tushar Ganmukhe (INS-MH-024)',
        date: '2026-09-06 14:45',
        violations: [
          {
            violation_name: 'MRP Overcharging / Tampering',
            law: 'Legal Metrology Act, 2009',
            section: 'Section 36(1)',
            reason: 'Product MRP appears to have been altered. Printed price (Rs. 150) exceeds registered price (Rs. 120).',
            evidence: 'Evidence - Product Front',
            fine: 'Rs. 5,000'
          },
          {
            violation_name: 'Missing Mandatory Declaration',
            law: 'Legal Metrology (Packaged Commodities) Rules, 2011',
            section: 'Rule 6(1)',
            reason: 'Mandatory FSSAI safety logo is missing from packaging.',
            evidence: 'Evidence - Product Back',
            fine: 'Rs. 10,000'
          }
        ],
        total_penalty: 'Rs. 15,000',
        approval_status: 'Approved by Inspector',
        approval_timestamp: '2026-09-06 14:45',
        front_image: null,
        back_image: null,
        remarks: 'Compoundable offences under Legal Metrology and FSSAI provisions.',
        pdf_path: path.join(__dirname, '../uploads/challans/CHL-2026-000001.pdf')
      };

      // Generate the initial PDF if it doesn't exist
      try {
        await generateOfficialChallanPdf(sampleChallan, sampleChallan.pdf_path);
      } catch (err) {
        console.warn('Initial sample PDF generation warning:', err.message);
      }

      await Inspection.create([
        {
          inspection_id: 'INSP-2026-001',
          shop_name: 'Shri Ganesh General Stores',
          owner_name: 'Rajesh Sharma',
          mobile_number: '9876543210',
          address: 'Main Road, Camp Area',
          district: 'Amravati',
          state: 'Maharashtra',
          product_category: 'Packaged Food & Commodities',
          gst_number: '27AABCS1429B1Z8',
          gst_verification_status: 'Verified',
          fssai_license_number: '10020030000412',
          fssai_verification_status: 'Verified',
          barcode: '8901030541203',
          inspector_id: 'INS-MH-024',
          inspector_name: 'Tushar Ganmukhe',
          status: 'Failed',
          date: '2026-09-06 14:30',
          violations: sampleChallan.violations,
          total_penalty: 'Rs. 15,000',
          inspector_reviewed: true,
          inspector_approval_status: 'Approved',
          approval_timestamp: '2026-09-06 14:45',
          challan: sampleChallan
        },
        {
          inspection_id: 'INSP-2026-002',
          shop_name: 'Vidarbha Agro Retail',
          owner_name: 'Suresh Deshmukh',
          mobile_number: '9123456789',
          address: 'Station Road',
          district: 'Amravati',
          state: 'Maharashtra',
          product_category: 'Weights & Measures / Commodities',
          gst_number: '27XYZAB1234C1Z9',
          gst_verification_status: 'Verified',
          fssai_license_number: '10020030000999',
          fssai_verification_status: 'Verified',
          barcode: '8901030541203',
          inspector_id: 'INS-MH-024',
          inspector_name: 'Tushar Ganmukhe',
          status: 'Passed',
          date: '2026-09-07 10:15',
          violations: [],
          total_penalty: 'Rs. 0',
          inspector_reviewed: true,
          inspector_approval_status: 'Passed (No Violation)',
          approval_timestamp: '2026-09-07 10:20',
          challan: null
        }
      ]);
      console.log('[Seeder] Initial inspections seeded.');
    }
  } catch (error) {
    console.error('[Seeder] Seeding error:', error.message);
  }
}

module.exports = { seedInitialData };
