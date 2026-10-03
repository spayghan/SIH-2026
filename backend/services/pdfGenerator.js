const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generateOfficialChallanPdf(challanData, outputPath) {
  return new Promise((resolve, reject) => {
    // Ensure parent directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const doc = new PDFDocument({ margin: 36, size: 'A4' });
    const writeStream = fs.createWriteStream(outputPath);

    doc.pipe(writeStream);

    // 1. Header Banner (Gov Blue)
    doc.rect(0, 0, 595.28, 80).fill('#1E3A8A');

    doc.fillColor('#FFFFFF')
       .font('Helvetica-Bold')
       .fontSize(15)
       .text('GOVERNMENT OF INDIA', 0, 22, { align: 'center' });

    doc.font('Helvetica')
       .fontSize(9.5)
       .text('MINISTRY OF CONSUMER AFFAIRS - DEPARTMENT OF LEGAL METROLOGY', 0, 44, { align: 'center' });

    // 2. Document Title
    doc.fillColor('#0F172A')
       .font('Helvetica-Bold')
       .fontSize(13)
       .text('OFFICIAL NOTICE OF OFFENCE / E-CHALLAN', 36, 100, { align: 'center' });

    doc.moveDown(0.8);

    // 3. Metadata Box
    const metaY = doc.y;
    doc.rect(36, metaY, 523, 44).fillAndStroke('#F1F5F9', '#CBD5E1');

    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(8.5);
    doc.text(`Challan ID: ${challanData.challan_id || 'N/A'}`, 46, metaY + 8);
    doc.text(`Date & Time: ${challanData.date || 'N/A'}`, 300, metaY + 8);
    doc.text(`Inspection ID: ${challanData.inspection_id || 'N/A'}`, 46, metaY + 24);
    doc.text(`Inspecting Officer: ${challanData.inspector || 'N/A'}`, 300, metaY + 24);

    doc.y = metaY + 52;

    // 4. Establishment Block
    doc.fillColor('#1E3A8A').font('Helvetica-Bold').fontSize(10)
       .text('1. ESTABLISHMENT & REGISTRATION VERIFICATION', 36, doc.y);
    doc.moveDown(0.3);

    const estY = doc.y;
    doc.rect(36, estY, 523, 46).stroke('#CBD5E1');
    doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5);
    doc.text(`Establishment: ${challanData.shop_name || 'N/A'}`, 46, estY + 8);
    doc.text(`GSTIN Status: ${challanData.gst_verification_status || 'Verified'} (${challanData.gstin || 'N/A'})`, 300, estY + 8);
    doc.text(`Address: ${challanData.address || 'N/A'}`, 46, estY + 26);
    doc.text(`FSSAI Status: ${challanData.fssai_verification_status || 'Verified'} (${challanData.fssai_number || 'N/A'})`, 300, estY + 26);

    doc.y = estY + 54;

    // 5. Violations Block
    const violations = challanData.violations || [];
    doc.fillColor('#1E3A8A').font('Helvetica-Bold').fontSize(10)
       .text(`2. RECORDED VIOLATIONS (${violations.length} Detected)`, 36, doc.y);
    doc.moveDown(0.4);

    violations.forEach((v, index) => {
      const vY = doc.y;
      doc.rect(36, vY, 523, 18).fillAndStroke('#FEE2E2', '#FECACA');
      doc.fillColor('#991B1B').font('Helvetica-Bold').fontSize(8.5)
         .text(`VIOLATION ${index + 1}: ${v.violation_name}`, 44, vY + 4);

      const bodyY = vY + 18;
      const descText = `Law / Act: ${v.law}\nSection / Rule: ${v.section}\nDescription: ${v.reason}\nFine / Penalty: ${v.fine}`;
      doc.rect(36, bodyY, 523, 44).stroke('#CBD5E1');
      doc.fillColor('#1E293B').font('Helvetica').fontSize(8)
         .text(descText, 44, bodyY + 6, { width: 505, lineGap: 2 });

      doc.y = bodyY + 48;
    });

    // Total Penalty Box
    const penY = doc.y;
    doc.rect(36, penY, 523, 24).fillAndStroke('#FEF3C7', '#FDE68A');
    doc.fillColor('#92400E').font('Helvetica-Bold').fontSize(10)
       .text(`TOTAL PENALTY AMOUNT: ${challanData.total_penalty || 'Rs. 0'}`, 36, penY + 6, { align: 'center', width: 523 });

    doc.y = penY + 32;

    // 6. Inspector Review Record
    doc.fillColor('#1E3A8A').font('Helvetica-Bold').fontSize(10)
       .text('3. INSPECTOR REVIEW & APPROVAL RECORD', 36, doc.y);
    doc.moveDown(0.3);

    const appY = doc.y;
    doc.rect(36, appY, 523, 24).stroke('#CBD5E1');
    doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5);
    doc.text(`Approval Status: ${challanData.approval_status || 'Approved by Inspector'}`, 46, appY + 7);
    doc.text(`Approval Timestamp: ${challanData.approval_timestamp || challanData.date || 'N/A'}`, 300, appY + 7);

    doc.y = appY + 32;

    // 7. Evidence Section
    doc.fillColor('#1E3A8A').font('Helvetica-Bold').fontSize(10)
       .text('4. PRODUCT EVIDENCE CAPTURES', 36, doc.y);
    doc.moveDown(0.4);

    const imgY = doc.y;
    const frontImg = challanData.front_image;
    const backImg = challanData.back_image;

    let hasImage = false;
    if (frontImg && fs.existsSync(frontImg)) {
      try {
        doc.image(frontImg, 50, imgY, { fit: [200, 110] });
        doc.fillColor('#64748B').font('Helvetica-Oblique').fontSize(8)
           .text('Evidence - Product Front', 50, imgY + 115, { width: 200, align: 'center' });
        hasImage = true;
      } catch (e) {
        console.error('Error attaching front image to PDF:', e);
      }
    }

    if (backImg && fs.existsSync(backImg)) {
      try {
        doc.image(backImg, 340, imgY, { fit: [200, 110] });
        doc.fillColor('#64748B').font('Helvetica-Oblique').fontSize(8)
           .text('Evidence - Product Back', 340, imgY + 115, { width: 200, align: 'center' });
        hasImage = true;
      } catch (e) {
        console.error('Error attaching back image to PDF:', e);
      }
    }

    if (!hasImage) {
      doc.fillColor('#64748B').font('Helvetica-Oblique').fontSize(8.5)
         .text('No visual product evidence images attached.', 46, imgY + 8);
    }

    doc.end();

    writeStream.on('finish', () => resolve(outputPath));
    writeStream.on('error', reject);
  });
}

module.exports = { generateOfficialChallanPdf };
