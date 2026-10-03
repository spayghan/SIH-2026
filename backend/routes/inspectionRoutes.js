const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Inspection = require('../models/Inspection');
const User = require('../models/User');
const { ocrVisionExtractionWorker, barcodeRegistryWorker, governmentRegistryWorker } = require('../services/workers');
const { evaluateCompliance } = require('../services/ruleEngine');
const { generateOfficialChallanPdf } = require('../services/pdfGenerator');

// Multer Storage configuration for evidence photos
const uploadDir = path.join(__dirname, '../uploads/images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const challanDir = path.join(__dirname, '../uploads/challans');
if (!fs.existsSync(challanDir)) {
  fs.mkdirSync(challanDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const inspectionId = req.params.inspection_id || req.params.id || 'INSP';
    const field = file.fieldname;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${inspectionId}_${field}_${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

// Validation Utilities
function validateGstinFormat(gstin = '') {
  const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return pattern.test(String(gstin).trim().toUpperCase());
}

function validateFssaiFormat(fssai = '') {
  const pattern = /^[0-9]{14}$/;
  return pattern.test(String(fssai).trim());
}

// ==========================================
// INSPECTOR PROFILE & HISTORY
// ==========================================
router.get('/inspector/profile', async (req, res) => {
  try {
    const user = await User.findOne({ role: 'Inspector' });
    if (!user) {
      return res.json({
        success: true,
        data: {
          inspector_id: "INS-MH-024",
          name: "Tushar Ganmukhe",
          department: "Retail & Food Safety Inspection",
          district: "Amravati",
          assigned_region: "Amravati Urban",
          designation: "Field Inspector"
        }
      });
    }
    return res.json({
      success: true,
      data: {
        inspector_id: user.userId,
        name: user.name,
        department: user.department,
        district: user.district,
        assigned_region: user.assignedRegion,
        designation: user.designation
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, detail: err.message });
  }
});

router.get('/inspector/history', async (req, res) => {
  try {
    const inspections = await Inspection.find().sort({ createdAt: -1 });
    const records = inspections.map(d => ({
      inspection_id: d.inspection_id,
      shop_name: d.shop_name,
      location: `${d.address}, ${d.district}`,
      date: d.date,
      status: d.status
    }));
    return res.json({ success: true, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, detail: err.message });
  }
});

// ==========================================
// INSPECTION WORKFLOW
// ==========================================

// 1. Initialize establishment
router.post('/inspections', async (req, res) => {
  try {
    const {
      shop_name,
      owner_name,
      mobile_number = '',
      address,
      district = 'Amravati',
      state = 'Maharashtra',
      product_category = 'Packaged Food & Commodities',
      gst_number,
      fssai_license_number,
      barcode
    } = req.body;

    const gstValid = validateGstinFormat(gst_number);
    const fssaiValid = validateFssaiFormat(fssai_license_number);

    const gstStatus = gstValid ? "Verified" : "Invalid";
    const fssaiStatus = fssaiValid ? "Verified" : "Invalid";

    const randNum = Math.floor(100 + Math.random() * 900);
    const inspectionId = `INSP-2026-${randNum}`;

    const now = new Date();
    const formattedDate = `${now.toISOString().split('T')[0]} ${now.toTimeString().substring(0, 5)}`;

    const newInspection = await Inspection.create({
      inspection_id: inspectionId,
      shop_name,
      owner_name,
      mobile_number,
      address,
      district,
      state,
      product_category,
      gst_number,
      gst_verification_status: gstStatus,
      fssai_license_number,
      fssai_verification_status: fssaiStatus,
      barcode,
      inspector_id: "INS-MH-024",
      inspector_name: "Tushar Ganmukhe",
      status: "Processing",
      date: formattedDate,
      violations: [],
      inspector_reviewed: false,
      inspector_approval_status: "Pending Review"
    });

    return res.json({
      success: true,
      message: "Establishment initialized.",
      inspection_id: inspectionId,
      gst_status: gstStatus,
      fssai_status: fssaiStatus,
      data: newInspection
    });
  } catch (err) {
    return res.status(500).json({ success: false, detail: err.message });
  }
});

// 2. Upload Front & Back product images
router.post('/inspections/:inspection_id/products', upload.fields([
  { name: 'front_image', maxCount: 1 },
  { name: 'back_image', maxCount: 1 }
]), async (req, res) => {
  try {
    const inspectionId = req.params.inspection_id;
    const inspection = await Inspection.findOne({ inspection_id: inspectionId });

    if (!inspection) {
      return res.status(404).json({ success: false, detail: "Inspection record not found" });
    }

    if (req.files && req.files['front_image']) {
      inspection.front_image = req.files['front_image'][0].path;
    }
    if (req.files && req.files['back_image']) {
      inspection.back_image = req.files['back_image'][0].path;
    }

    await inspection.save();
    return res.json({ success: true, message: "Images attached." });
  } catch (err) {
    return res.status(500).json({ success: false, detail: err.message });
  }
});

// Internal Background AI processing helper
async function processInspectionWithAI(inspectionId) {
  try {
    const inspection = await Inspection.findOne({ inspection_id: inspectionId });
    if (!inspection) return;

    const frontPath = inspection.front_image;
    const backPath = inspection.back_image;
    const barcode = inspection.barcode || '';

    // 1. Dynamic AI Vision / OCR Extraction
    const extractedData = await ocrVisionExtractionWorker({
      frontPath,
      backPath,
      barcode
    });

    const extractedMrp = parseFloat(extractedData.extracted_mrp) || 0.0;
    const fssaiDetected = Boolean(extractedData.fssai_logo_detected);
    const productName = extractedData.product_name || "Packaged Commodity";
    const isExpired = Boolean(extractedData.is_expired);
    const expiryDateFound = extractedData.expiry_date_found || "Unknown";
    const extractedFssaiLic = extractedData.extracted_fssai_lic;

    // 2. Reference Database Lookup
    const refData = barcodeRegistryWorker(barcode);
    const trueMrp = refData.true_mrp;
    const fssaiRequired = refData.fssai_required;
    const registeredFssaiLic = refData.registered_fssai_lic;

    const gstinVerified = (inspection.gst_verification_status === "Verified");
    const fssaiVerified = (inspection.fssai_verification_status === "Verified");

    // 3. Deterministic Multi-Violation Rule Engine Evaluation
    const verdict = evaluateCompliance({
      extractedMrp,
      trueMrp,
      fssaiDetected,
      fssaiRequired,
      gstinVerified,
      fssaiVerified,
      extractedFssaiLic,
      registeredFssaiLic,
      isExpired,
      expiryDateFound
    });

    inspection.product_category = `${productName} (AI Verified)`;
    inspection.status = (verdict.status === "FAIL") ? "Failed" : "Passed";
    inspection.violations = verdict.violations_flagged;
    inspection.total_penalty = verdict.total_calculated_penalty || "Rs. 0";

    await inspection.save();
    console.log(`[AI Worker] Inspection ${inspectionId} processed. Verdict: ${verdict.status}`);
  } catch (error) {
    console.error(`[AI Worker Error] ${error.message}`);
    try {
      const inspection = await Inspection.findOne({ inspection_id: inspectionId });
      if (inspection) {
        inspection.status = "Failed";
        inspection.violations = [{
          violation_name: "System Processing Error",
          law: "Administrative",
          section: "N/A",
          reason: "Could not process image evidence automatically. Manual review required.",
          evidence: "N/A",
          fine: "Rs. 1,000"
        }];
        inspection.total_penalty = "Rs. 1,000";
        await inspection.save();
      }
    } catch (e) {}
  }
}

// 3. Trigger Verification
router.post('/inspections/:inspection_id/verify', async (req, res) => {
  try {
    const inspectionId = req.params.inspection_id;
    const inspection = await Inspection.findOne({ inspection_id: inspectionId });

    if (!inspection) {
      return res.status(404).json({ success: false, detail: "Inspection record not found" });
    }

    // Trigger AI processing
    processInspectionWithAI(inspectionId);

    return res.json({
      success: true,
      message: "Rule Engine Worker triggered.",
      status: "Processing"
    });
  } catch (err) {
    return res.status(500).json({ success: false, detail: err.message });
  }
});

// 4. Get Inspection Result
router.get('/inspections/:inspection_id/result', async (req, res) => {
  try {
    const inspectionId = req.params.inspection_id;
    const inspection = await Inspection.findOne({ inspection_id: inspectionId });

    if (!inspection) {
      return res.status(404).json({ success: false, detail: "Inspection record not found" });
    }

    return res.json({ success: true, data: inspection });
  } catch (err) {
    return res.status(500).json({ success: false, detail: err.message });
  }
});

// 5. Inspector Review & Approval / Rejection
router.post('/inspections/:inspection_id/review', async (req, res) => {
  try {
    const inspectionId = req.params.inspection_id;
    const action = (req.body.action || '').toLowerCase();

    const inspection = await Inspection.findOne({ inspection_id: inspectionId });
    if (!inspection) {
      return res.status(404).json({ success: false, detail: "Inspection record not found" });
    }

    const now = new Date();
    const timestamp = `${now.toISOString().split('T')[0]} ${now.toTimeString().substring(0, 5)}`;
    inspection.inspector_reviewed = true;

    if (action === 'approve') {
      inspection.inspector_approval_status = "Approved";
      inspection.approval_timestamp = timestamp;

      if (inspection.status === 'Failed' && inspection.violations && inspection.violations.length > 0) {
        const randNum = Math.floor(1 + Math.random() * 999999);
        const challanId = `CHL-2026-${String(randNum).padStart(6, '0')}`;
        const pdfFilename = `${challanId}.pdf`;
        const pdfPath = path.join(challanDir, pdfFilename);

        const challanData = {
          challan_id: challanId,
          inspection_id: inspectionId,
          shop_name: inspection.shop_name,
          owner_name: inspection.owner_name,
          address: `${inspection.address}, ${inspection.district}`,
          gstin: inspection.gst_number,
          gst_verification_status: inspection.gst_verification_status,
          fssai_number: inspection.fssai_license_number,
          fssai_verification_status: inspection.fssai_verification_status,
          inspector: `${inspection.inspector_name} (${inspection.inspector_id})`,
          date: timestamp,
          violations: inspection.violations,
          total_penalty: inspection.total_penalty || "Rs. 0",
          approval_status: "Approved by Inspector",
          approval_timestamp: timestamp,
          front_image: inspection.front_image,
          back_image: inspection.back_image,
          remarks: "Compoundable offences under Legal Metrology provisions.",
          pdf_path: pdfPath
        };

        inspection.challan = challanData;

        // Generate the PDF
        try {
          await generateOfficialChallanPdf(challanData, pdfPath);
        } catch (pdfErr) {
          console.error("PDF generation error:", pdfErr);
        }
      }

      await inspection.save();
      return res.json({
        success: true,
        message: "Violations approved successfully. Official E-Challan generated.",
        data: inspection
      });
    } else {
      inspection.inspector_approval_status = "Rejected / Sent Back";
      inspection.approval_timestamp = timestamp;
      inspection.status = "Passed";
      inspection.challan = null;

      await inspection.save();
      return res.json({
        success: true,
        message: "Case rejected and sent back by inspector.",
        data: inspection
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, detail: err.message });
  }
});

// 6. Get Challan Details
router.get('/inspections/:inspection_id/challan', async (req, res) => {
  try {
    const inspectionId = req.params.inspection_id;
    const inspection = await Inspection.findOne({ inspection_id: inspectionId });

    if (!inspection) {
      return res.status(404).json({ success: false, detail: "Inspection record not found" });
    }

    if (!inspection.inspector_reviewed || inspection.inspector_approval_status !== "Approved") {
      return res.status(400).json({ success: false, detail: "Challan not available: Pending Inspector Review and Approval." });
    }

    return res.json({ success: true, data: inspection.challan });
  } catch (err) {
    return res.status(500).json({ success: false, detail: err.message });
  }
});

// 7. Download PDF Challan
router.get('/inspections/:inspection_id/download-pdf', async (req, res) => {
  try {
    const inspectionId = req.params.inspection_id;
    const inspection = await Inspection.findOne({ inspection_id: inspectionId });

    if (!inspection || !inspection.challan) {
      return res.status(404).json({ success: false, detail: "Challan PDF not found." });
    }

    const challan = inspection.challan;
    let pdfPath = challan.pdf_path;

    // If file doesn't exist on disk, regenerate it
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      pdfPath = path.join(challanDir, `${challan.challan_id}.pdf`);
      await generateOfficialChallanPdf(challan, pdfPath);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Official_Challan_${challan.challan_id}.pdf"`);
    return res.sendFile(path.resolve(pdfPath));
  } catch (err) {
    return res.status(500).json({ success: false, detail: err.message });
  }
});

module.exports = router;
