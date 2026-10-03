// /**
//  * Deterministic Multi-Violation Rule Engine
//  * Evaluates extracted product data against legal metrology rules and baseline registries.
//  */

// function evaluateCompliance({
//   extractedMrp = 0.0,
//   trueMrp = 0.0,
//   fssaiDetected = false,
//   fssaiRequired = true,
//   gstinVerified = true,
//   fssaiVerified = true,
//   extractedFssaiLic = null,
//   registeredFssaiLic = null,
//   isExpired = false,
//   expiryDateFound = null
// }) {
//   const violations = [];

//   // 1. Check MRP Overcharging / Tampering (Dynamic Comparison)
//   if (extractedMrp > trueMrp) {
//     const discrepancy = (extractedMrp - trueMrp).toFixed(2);
//     violations.push({
//       violation_name: 'MRP Overcharging / Tampering',
//       law: 'Legal Metrology Act, 2009',
//       section: 'Section 36(1)',
//       reason: `Product MRP appears to have been altered. Printed price (Rs. ${extractedMrp}) exceeds registered price (Rs. ${trueMrp}). Discrepancy of Rs. ${discrepancy}.`,
//       evidence: 'Evidence - Product Front',
//       fine: 'Rs. 5,000'
//     });
//   }

//   // 2. Check Mandatory FSSAI Declarations / Logo
//   if (fssaiRequired && !fssaiDetected) {
//     violations.push({
//       violation_name: 'Missing Mandatory Declaration',
//       law: 'Legal Metrology (Packaged Commodities) Rules, 2011',
//       section: 'Rule 6(1)',
//       reason: 'Mandatory FSSAI safety logo is missing from packaging.',
//       evidence: 'Evidence - Product Back',
//       fine: 'Rs. 10,000'
//     });
//   }

//   // 3. Check Expiry Status
//   if (isExpired) {
//     violations.push({
//       violation_name: 'Sale of Expired Commodity',
//       law: 'Food Safety and Standards Act / Consumer Protection Act',
//       section: 'Section 26 (FSSAI)',
//       reason: `Product expiry date found as '${expiryDateFound}', which indicates stock has expired.`,
//       evidence: 'Evidence - Product Back',
//       fine: 'Rs. 15,000'
//     });
//   }

//   // 4. Check Registry Verification Anomalies
//   if (!gstinVerified) {
//     violations.push({
//       violation_name: 'Invalid GSTIN Registration',
//       law: 'Central Goods and Services Tax Act, 2017',
//       section: 'Section 25',
//       reason: 'Establishment GSTIN provided failed external registry structure validation.',
//       evidence: 'Establishment Profile',
//       fine: 'Rs. 5,000'
//     });
//   }

//   // Calculate total penalty sum dynamically
//   let totalFineValue = 0;
//   for (const v of violations) {
//     const digitsOnly = v.fine.replace(/\D/g, '');
//     if (digitsOnly) {
//       totalFineValue += parseInt(digitsOnly, 10);
//     }
//   }

//   return {
//     status: violations.length > 0 ? 'FAIL' : 'PASS',
//     violations_flagged: violations,
//     total_calculated_penalty: `Rs. ${totalFineValue.toLocaleString('en-IN')}`
//   };
// }

// module.exports = { evaluateCompliance };/**

function evaluateCompliance({
  extractedMrp = 0.0,
  trueMrp = 0.0,
  fssaiDetected = false,
  fssaiRequired = true,
  gstinVerified = true,
  fssaiVerified = true, // Received from workers.js
  extractedFssaiLic = null,
  registeredFssaiLic = null,
  isExpired = false,
  expiryDateFound = null
}) {
  const violations = [];

  // 1. Check MRP Overcharging / Tampering (Dynamic Comparison)
  if (extractedMrp > trueMrp) {
    const discrepancy = (extractedMrp - trueMrp).toFixed(2);
    violations.push({
      violation_name: 'MRP Overcharging / Tampering',
      law: 'Legal Metrology Act, 2009',
      section: 'Section 36(1)',
      reason: `Product MRP appears to have been altered. Printed price (Rs. ${extractedMrp}) exceeds registered price (Rs. ${trueMrp}). Discrepancy of Rs. ${discrepancy}.`,
      evidence: 'Evidence - Product Front',
      fine: 'Rs. 5,000'
    });
  }

  // 2. Check Mandatory FSSAI Declarations / Logo
  if (fssaiRequired && !fssaiDetected) {
    violations.push({
      violation_name: 'Missing Mandatory Declaration',
      law: 'Legal Metrology (Packaged Commodities) Rules, 2011',
      section: 'Rule 6(1)',
      reason: 'Mandatory FSSAI safety logo is missing from packaging.',
      evidence: 'Evidence - Product Back',
      fine: 'Rs. 10,000'
    });
  }

  // 3. Check Expiry Status
  if (isExpired) {
    violations.push({
      violation_name: 'Sale of Expired Commodity',
      law: 'Food Safety and Standards Act / Consumer Protection Act',
      section: 'Section 26 (FSSAI)',
      reason: `Product expiry date found as '${expiryDateFound}', which indicates stock has expired.`,
      evidence: 'Evidence - Product Back',
      fine: 'Rs. 15,000'
    });
  }

  // 4. Check Registry Verification Anomalies (GSTIN)
  if (!gstinVerified) {
    violations.push({
      violation_name: 'Invalid GSTIN Registration',
      law: 'Central Goods and Services Tax Act, 2017',
      section: 'Section 25',
      reason: 'Establishment GSTIN provided failed external registry structure validation.',
      evidence: 'Establishment Profile',
      fine: 'Rs. 5,000'
    });
  }

  // --- NEW ADDITION: Rule 5 ---
  // 5. Check FSSAI License Registry Verification
  if (!fssaiVerified) {
    violations.push({
      violation_name: 'Invalid FSSAI License Registration',
      law: 'Food Safety and Standards Act, 2006',
      section: 'Section 31',
      reason: 'The FSSAI license number provided by the establishment failed statutory format or registry validation.',
      evidence: 'Establishment Profile / Registry Check',
      fine: 'Rs. 10,000' // Standard administrative penalty
    });
  }
  // --- END OF NEW ADDITION ---

  // Calculate total penalty sum dynamically
  let totalFineValue = 0;
  for (const v of violations) {
    const digitsOnly = v.fine.replace(/\D/g, '');
    if (digitsOnly) {
      totalFineValue += parseInt(digitsOnly, 10);
    }
  }

  return {
    status: violations.length > 0 ? 'FAIL' : 'PASS',
    violations_flagged: violations,
    total_calculated_penalty: `Rs. ${totalFineValue.toLocaleString('en-IN')}`
  };
}

module.exports = { evaluateCompliance };
