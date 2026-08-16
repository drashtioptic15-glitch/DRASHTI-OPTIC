import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to convert number to Indian Currency Words
function numberToWords(amount) {
  const num = Math.round(Number(amount) || 0);
  if (num === 0) return 'Zero Rupees Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertGroup(n) {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  }

  let words = '';
  let crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder %= 100000;
  let thousand = Math.floor(remainder / 1000);
  remainder %= 1000;
  let hundred = remainder;

  if (crore > 0) words += convertGroup(crore) + ' Crore ';
  if (lakh > 0) words += convertGroup(lakh) + ' Lakh ';
  if (thousand > 0) words += convertGroup(thousand) + ' Thousand ';
  if (hundred > 0) words += convertGroup(hundred);

  return words.trim() + ' Rupees Only';
}

// Helper to format date to DD-MM-YYYY
function formatDateDMY(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// Draw Drashti Optic stylized vector logo
function drawDrashtiLogo(doc, x, y, width = 130, height = 52) {
  doc.save();
  
  // Try loading local image if present
  const possibleLogoPaths = [
    path.join(__dirname, '../assets/logo.png'),
    path.join(__dirname, '../../../frontend/public/drashti-optic-logo.png'),
    path.join(__dirname, '../../../frontend/public/logo.png'),
  ];
  for (const lPath of possibleLogoPaths) {
    if (fs.existsSync(lPath)) {
      try {
        doc.image(lPath, x, y, { width: width, height: height, fit: [width, height], align: 'center' });
        doc.restore();
        return;
      } catch (e) {
        // Fallback to vector drawing
      }
    }
  }

  // Vector drawing matching Drashti Optic logo
  const centerX = x + width / 2;
  const redColor = '#E11D2A';
  const darkColor = '#111827';

  // 1. Spectacle Frame Outline / Browline
  doc.save();
  doc.translate(centerX - 35, y);
  doc.scale(0.72);

  // Red Frame Top curve
  doc.path('M 15 20 C 28 8, 48 9, 58 15 C 68 9, 88 8, 98 15 C 102 20, 100 32, 88 35 C 75 36, 65 28, 60 22 C 55 28, 45 36, 32 35 C 20 35, 12 28, 15 20 Z')
     .fill(redColor);

  // Left Eye Lower Eyelid Outline
  doc.path('M 17 21 C 20 28, 30 33, 44 26')
     .lineWidth(2.5)
     .strokeColor(redColor)
     .stroke();

  // Right lens rim
  doc.circle(82, 22, 11).lineWidth(2.5).strokeColor(redColor).stroke();
  // Right frame temple rivet
  doc.circle(88, 16, 1.2).fillColor('#FFFFFF').fill();

  // Left Eye Red Iris + Pupil
  doc.circle(38, 22, 9).fillColor(redColor).fill();
  doc.circle(38, 22, 4.8).fillColor(darkColor).fill();
  doc.circle(40, 20, 1.5).fillColor('#FFFFFF').fill();
  doc.restore();

  // 2. Brand Name "Drashti"
  doc.fillColor(darkColor).font('Helvetica-Bold').fontSize(14).text('Drasht', centerX - 30, y + 28, { continued: true });
  doc.text('i');
  // Red square dot on 'i'
  doc.rect(centerX + 20, y + 27.5, 3, 3).fill(redColor);

  // 3. Divider lines and "OPTIC"
  doc.rect(centerX - 38, y + 43, 16, 1).fill(redColor);
  doc.fillColor(redColor).font('Helvetica-Bold').fontSize(5.5).text('O P T I C', centerX - 20, y + 40.5, { width: 40, align: 'center' });
  doc.rect(centerX + 22, y + 43, 16, 1).fill(redColor);

  // 4. Computerized Eye Testing
  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(3.8).text('COMPUTERIZED EYE TESTING', centerX - 55, y + 48, { width: 110, align: 'center' });

  // 5. Subtitle Services
  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(3.2).text('EYEGLASSES | CONTACT LENSES | SUNGLASSES', centerX - 65, y + 53.5, { width: 130, align: 'center' });

  doc.restore();
}

export const generateInvoicePDF = async (invoice, settings) => {
  return new Promise((resolve, reject) => {
    try {
      const outputDir = path.join(__dirname, '../../generated-invoices');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const fileName = `Invoice-${invoice.invoiceNumber}.pdf`;
      const filePath = path.join(outputDir, fileName);

      // Standard A4 Dimensions: 595.28 x 841.89 pt
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 26;
      const contentWidth = pageWidth - margin * 2; // 543.28pt

      const doc = new PDFDocument({
        size: [pageWidth, pageHeight],
        margin: margin,
        info: {
          Title: `Invoice - ${invoice.invoiceNumber}`,
          Author: settings?.storeName || 'Drashti Optic Rajkot',
        },
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Theme Colors matching reference image
      const pinkAccent = '#D81B60'; // Vibrant pink/magenta underline & divider
      const darkBlack = '#000000';
      const textMuted = '#475569';
      const borderBlack = '#000000';

      let currentY = margin;

      // ================= 1. HEADER SECTION =================
      const headerStartY = currentY;

      // Left Column: Shop Contact Details
      const shopName = settings?.storeName || 'Drashti Optic Rajkot';
      doc.fillColor(darkBlack).font('Helvetica-Bold').fontSize(16).text(shopName, margin, headerStartY);
      
      let shopInfoY = headerStartY + 20;
      doc.fillColor(darkBlack).font('Helvetica-Bold').fontSize(9);
      doc.text(settings?.phone || '7984419462', margin, shopInfoY);
      
      shopInfoY += 12;
      doc.font('Helvetica-Bold').fontSize(8.5).text(settings?.email || 'drashtioptic15@gmail.com', margin, shopInfoY);
      
      shopInfoY += 12;
      const shopAddress = settings?.address && !settings.address.includes('Shop No. 4')
        ? `${settings.address}${settings.city ? ', ' + settings.city : ''}`
        : 'Swaminarayn Chowk, Rajkot';
      doc.font('Helvetica-Bold').fontSize(8.5).text(shopAddress, margin, shopInfoY);

      // Pink underline beneath Left Shop Info
      const pinkLineY = shopInfoY + 16;
      doc.rect(margin, pinkLineY, 200, 2.5).fill(pinkAccent);

      // Right Column: Drashti Optic Logo & "INVOICE" Title (Non-overlapping)
      const logoWidth = 130;
      const logoX = margin + contentWidth - logoWidth;
      drawDrashtiLogo(doc, logoX, headerStartY - 4, logoWidth, 54);

      const invoiceTitleY = headerStartY + 56;
      doc.fillColor(darkBlack).font('Helvetica-Bold').fontSize(18).text('INVOICE', logoX - 25, invoiceTitleY, {
        width: logoWidth + 50,
        align: 'center',
      });

      // Metadata section starts cleanly below header & INVOICE title
      currentY = headerStartY + 84;

      // ================= 2. METADATA & POWER DETAIL MATRIX =================
      let cust = invoice.customerSnapshot;
      if (typeof cust === 'string') {
        try { cust = JSON.parse(cust); } catch { cust = {}; }
      }
      if (!cust || !cust.name) {
        cust = (typeof invoice.customer === 'object' && invoice.customer) ? invoice.customer : { name: cust?.name || 'Walk-in Customer', mobile: cust?.mobile || '-' };
      }
      let p = invoice.prescriptionSnapshot;
      if (typeof p === 'string') {
        try { p = JSON.parse(p); } catch { p = {}; }
      }
      if (!p || (!p.rightEye && !p.leftEye && !p.doctor)) {
        p = (typeof invoice.prescription === 'object' && invoice.prescription) ? invoice.prescription : {};
      }
      const shouldIncludePrescription = invoice.includePrescription !== false &&
        (p.rightEye?.sph || p.rightEye?.cyl || p.leftEye?.sph || p.leftEye?.cyl || p.rightEye?.vn || p.leftEye?.vn || p.doctor);

      const metaStartY = currentY;

      // Left: Invoice & Customer Info
      let metaY = metaStartY;
      const labelW = 74;
      
      // Clean Invoice Number (e.g. sequence number if standard prefix)
      let displayInvNo = invoice.invoiceNumber;
      if (displayInvNo.includes('-')) {
        const parts = displayInvNo.split('-');
        const lastPart = parts[parts.length - 1];
        if (!isNaN(Number(lastPart))) {
          displayInvNo = String(parseInt(lastPart, 10)); // e.g. 16
        }
      }

      const drawMetaRow = (label, val, isBold = false) => {
        doc.fillColor(darkBlack).font('Helvetica-Bold').fontSize(9).text(`${label} :`, margin, metaY, { width: labelW });
        doc.fillColor(darkBlack).font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).text(val || '', margin + labelW + 4, metaY);
        metaY += 13.5;
      };

      drawMetaRow('Invoice No.', displayInvNo, true);
      drawMetaRow('Date', formatDateDMY(invoice.invoiceDate || invoice.createdAt));
      drawMetaRow('Invoice To', (cust.name || '').toUpperCase(), true);
      drawMetaRow('Contact No.', cust.mobile || '');
      drawMetaRow('Address', cust.address || cust.city || 'Rajkot');
      drawMetaRow('GST No.', cust.gstNumber || '');

      // Right: Power Detail Table (if enabled)
      if (shouldIncludePrescription) {
        const powerTableW = 216;
        const powerTableX = margin + contentWidth - powerTableW;
        const powerTableStartY = metaStartY;

        // Power Detail Banner Header
        doc.rect(powerTableX, powerTableStartY, powerTableW, 14).strokeColor(borderBlack).lineWidth(0.5).stroke();
        doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(8.5).text('Power Detail', powerTableX, powerTableStartY + 3, {
          width: powerTableW,
          align: 'center',
        });

        // Table Header: EYE | SPH | CYL | AXIS | V/N | ADD
        const pThY = powerTableStartY + 14;
        const pColEyeW = 36;
        const pColOtherW = (powerTableW - pColEyeW) / 5; // 36pt each

        doc.rect(powerTableX, pThY, powerTableW, 14).strokeColor(borderBlack).lineWidth(0.5).stroke();
        doc.fillColor(darkBlack).font('Helvetica-Bold').fontSize(8);
        doc.text('EYE', powerTableX, pThY + 3.5, { width: pColEyeW, align: 'center' });
        doc.text('SPH', powerTableX + pColEyeW, pThY + 3.5, { width: pColOtherW, align: 'center' });
        doc.text('CYL', powerTableX + pColEyeW + pColOtherW, pThY + 3.5, { width: pColOtherW, align: 'center' });
        doc.text('AXIS', powerTableX + pColEyeW + pColOtherW * 2, pThY + 3.5, { width: pColOtherW, align: 'center' });
        doc.text('V/N', powerTableX + pColEyeW + pColOtherW * 3, pThY + 3.5, { width: pColOtherW, align: 'center' });
        doc.text('ADD', powerTableX + pColEyeW + pColOtherW * 4, pThY + 3.5, { width: pColOtherW, align: 'center' });

        // Vertical column lines in header
        let vx = powerTableX + pColEyeW;
        for (let i = 0; i < 5; i++) {
          doc.moveTo(vx, pThY).lineTo(vx, pThY + 14).strokeColor(borderBlack).lineWidth(0.5).stroke();
          vx += pColOtherW;
        }

        // Row R
        const rY = pThY + 14;
        doc.rect(powerTableX, rY, powerTableW, 14).strokeColor(borderBlack).lineWidth(0.5).stroke();
        doc.fillColor(darkBlack).font('Helvetica-Bold').fontSize(8.5).text('R', powerTableX, rY + 3, { width: pColEyeW, align: 'center' });
        doc.font('Helvetica').fontSize(8);
        doc.text(p.rightEye?.sph || '', powerTableX + pColEyeW, rY + 3, { width: pColOtherW, align: 'center' });
        doc.text(p.rightEye?.cyl || '', powerTableX + pColEyeW + pColOtherW, rY + 3, { width: pColOtherW, align: 'center' });
        doc.text(p.rightEye?.axis || '', powerTableX + pColEyeW + pColOtherW * 2, rY + 3, { width: pColOtherW, align: 'center' });
        doc.text(p.rightEye?.vn || '6/', powerTableX + pColEyeW + pColOtherW * 3, rY + 3, { width: pColOtherW, align: 'center' });
        doc.text(p.rightEye?.add || '', powerTableX + pColEyeW + pColOtherW * 4, rY + 3, { width: pColOtherW, align: 'center' });

        // Vertical column lines in Row R
        vx = powerTableX + pColEyeW;
        for (let i = 0; i < 5; i++) {
          doc.moveTo(vx, rY).lineTo(vx, rY + 14).strokeColor(borderBlack).lineWidth(0.5).stroke();
          vx += pColOtherW;
        }

        // Row L
        const lY = rY + 14;
        doc.rect(powerTableX, lY, powerTableW, 14).strokeColor(borderBlack).lineWidth(0.5).stroke();
        doc.fillColor(darkBlack).font('Helvetica-Bold').fontSize(8.5).text('L', powerTableX, lY + 3, { width: pColEyeW, align: 'center' });
        doc.font('Helvetica').fontSize(8);
        doc.text(p.leftEye?.sph || '', powerTableX + pColEyeW, lY + 3, { width: pColOtherW, align: 'center' });
        doc.text(p.leftEye?.cyl || '', powerTableX + pColEyeW + pColOtherW, lY + 3, { width: pColOtherW, align: 'center' });
        doc.text(p.leftEye?.axis || '', powerTableX + pColEyeW + pColOtherW * 2, lY + 3, { width: pColOtherW, align: 'center' });
        doc.text(p.leftEye?.vn || '6/', powerTableX + pColEyeW + pColOtherW * 3, lY + 3, { width: pColOtherW, align: 'center' });
        doc.text(p.leftEye?.add || '', powerTableX + pColEyeW + pColOtherW * 4, lY + 3, { width: pColOtherW, align: 'center' });

        // Vertical column lines in Row L
        vx = powerTableX + pColEyeW;
        for (let i = 0; i < 5; i++) {
          doc.moveTo(vx, lY).lineTo(vx, lY + 14).strokeColor(borderBlack).lineWidth(0.5).stroke();
          vx += pColOtherW;
        }
      }

      currentY = Math.max(metaY, metaStartY + 60) + 10;

      // Pink accent divider line above items table
      doc.rect(margin, currentY, contentWidth, 2.5).fill(pinkAccent);
      currentY += 6;

      // ================= 3. ITEMS TABLE =================
      // Columns: Sn. | Particulars | HSN | Qty | Price | Dis. | Taxable | CGST% | CGST | SGST% | SGST | Amount
      const colWidths = {
        sn: 24,
        particulars: 110,
        hsn: 32,
        qty: 26,
        price: 42,
        dis: 36,
        taxable: 46,
        cgstP: 36,
        cgst: 42,
        sgstP: 36,
        sgst: 42,
        amount: 65,
      };

      const tableX = margin;
      const tableW = Object.values(colWidths).reduce((a, b) => a + b, 0); // ~537pt
      const thHeight = 18;

      // Table Header
      const thY = currentY;
      doc.rect(tableX, thY, tableW, thHeight).strokeColor(borderBlack).lineWidth(1).stroke();

      let cx = tableX;
      doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(7.5);

      const drawHeaderCell = (text, w, align = 'left') => {
        doc.text(text, cx + 2, thY + 5, { width: w - 4, align });
        cx += w;
      };

      drawHeaderCell('Sn.', colWidths.sn, 'center');
      drawHeaderCell('Particulars', colWidths.particulars, 'left');
      drawHeaderCell('HSN', colWidths.hsn, 'center');
      drawHeaderCell('Qty', colWidths.qty, 'center');
      drawHeaderCell('Price', colWidths.price, 'right');
      drawHeaderCell('Dis.', colWidths.dis, 'right');
      drawHeaderCell('Taxable', colWidths.taxable, 'right');
      drawHeaderCell('CGST%', colWidths.cgstP, 'center');
      drawHeaderCell('CGST', colWidths.cgst, 'right');
      drawHeaderCell('SGST%', colWidths.sgstP, 'center');
      drawHeaderCell('SGST', colWidths.sgst, 'right');
      drawHeaderCell('Amount', colWidths.amount, 'right');

      let rowY = thY + thHeight;
      const startItemRowsY = rowY;

      let totalQty = 0;
      let totalTaxable = 0;
      let totalCGST = 0;
      let totalSGST = 0;

      const taxRate = Number(invoice.taxRate) || 0;
      const halfTaxRate = taxRate / 2;

      // Item Rows with Dynamic Row Height (No text overlapping)
      invoice.items.forEach((item, index) => {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.unitPrice) || 0;
        const disc = Number(item.discountAmount) || 0;
        const taxable = Math.max(0, (price * qty) - disc);
        const itemCGST = (taxable * halfTaxRate) / 100;
        const itemSGST = (taxable * halfTaxRate) / 100;
        const amount = Number(item.total) || (taxable + itemCGST + itemSGST);

        totalQty += qty;
        totalTaxable += taxable;
        totalCGST += itemCGST;
        totalSGST += itemSGST;

        const itemName = (item.brand ? `${item.brand} ${item.name}` : item.name).toUpperCase();
        doc.font('Helvetica').fontSize(7.5);
        const nameH = doc.heightOfString(itemName, { width: colWidths.particulars - 6 });
        const itemRowHeight = Math.max(22, nameH + 8);

        // Content
        cx = tableX;
        doc.fillColor(darkBlack).font('Helvetica').fontSize(7.5);
        doc.text(String(index + 1), cx, rowY + 5, { width: colWidths.sn, align: 'center' });
        cx += colWidths.sn;

        doc.text(itemName, cx + 3, rowY + 5, { width: colWidths.particulars - 6 });
        cx += colWidths.particulars;

        doc.text(item.sku || '9003', cx, rowY + 5, { width: colWidths.hsn, align: 'center' });
        cx += colWidths.hsn;

        doc.text(String(qty), cx, rowY + 5, { width: colWidths.qty, align: 'center' });
        cx += colWidths.qty;

        doc.text(price.toFixed(2), cx, rowY + 5, { width: colWidths.price - 2, align: 'right' });
        cx += colWidths.price;

        doc.text(disc.toFixed(2), cx, rowY + 5, { width: colWidths.dis - 2, align: 'right' });
        cx += colWidths.dis;

        doc.text(taxable.toFixed(2), cx, rowY + 5, { width: colWidths.taxable - 2, align: 'right' });
        cx += colWidths.taxable;

        doc.text(halfTaxRate > 0 ? String(halfTaxRate) : '0', cx, rowY + 5, { width: colWidths.cgstP, align: 'center' });
        cx += colWidths.cgstP;

        doc.text(itemCGST.toFixed(2), cx, rowY + 5, { width: colWidths.cgst - 2, align: 'right' });
        cx += colWidths.cgst;

        doc.text(halfTaxRate > 0 ? String(halfTaxRate) : '0', cx, rowY + 5, { width: colWidths.sgstP, align: 'center' });
        cx += colWidths.sgstP;

        doc.text(itemSGST.toFixed(2), cx, rowY + 5, { width: colWidths.sgst - 2, align: 'right' });
        cx += colWidths.sgst;

        doc.text(amount.toFixed(2), cx, rowY + 5, { width: colWidths.amount - 2, align: 'right' });

        rowY += itemRowHeight;
      });

      // Total Value & Discount sub-rows inside table (separated and properly positioned)
      const subRowHeight = 18;
      
      // Total Value row
      const subtotalVal = Number(invoice.subtotal) || totalTaxable;
      doc.fillColor(darkBlack).font('Helvetica').fontSize(8);
      doc.text('Total Value', tableX + colWidths.sn + 2, rowY + 4, { width: colWidths.particulars - 4, align: 'right' });
      doc.text(subtotalVal.toFixed(2), tableX + tableW - colWidths.amount, rowY + 4, { width: colWidths.amount - 2, align: 'right' });
      rowY += subRowHeight;

      // Discount row (if discount exists)
      if (invoice.totalDiscount > 0) {
        doc.text('Discount', tableX + colWidths.sn + 2, rowY + 4, { width: colWidths.particulars - 4, align: 'right' });
        doc.text(Number(invoice.totalDiscount).toFixed(2), tableX + tableW - colWidths.amount, rowY + 4, { width: colWidths.amount - 2, align: 'right' });
        rowY += subRowHeight;
      }

      // Minimum body height for aesthetic layout
      const minBodyHeight = 110;
      const actualBodyHeight = Math.max(minBodyHeight, rowY - startItemRowsY);
      const bottomTableY = startItemRowsY + actualBodyHeight;

      // Outer border around items table body
      doc.rect(tableX, startItemRowsY, tableW, actualBodyHeight).strokeColor(borderBlack).lineWidth(1).stroke();

      // Vertical grid lines across header + body
      let gridX = tableX;
      Object.values(colWidths).forEach((w) => {
        gridX += w;
        if (gridX < tableX + tableW) {
          doc.moveTo(gridX, thY).lineTo(gridX, bottomTableY).strokeColor(borderBlack).lineWidth(1).stroke();
        }
      });

      // Table Footer / Total Row
      const totRowH = 20;
      doc.rect(tableX, bottomTableY, tableW, totRowH).strokeColor(borderBlack).lineWidth(1).stroke();

      // Total row cells
      doc.fillColor(darkBlack).font('Helvetica-Bold').fontSize(8.5);
      doc.text('Total', tableX + colWidths.sn + 2, bottomTableY + 5, { width: colWidths.particulars - 4, align: 'center' });
      
      const qtyColX = tableX + colWidths.sn + colWidths.particulars + colWidths.hsn;
      doc.text(String(totalQty), qtyColX, bottomTableY + 5, { width: colWidths.qty, align: 'center' });

      const taxableColX = qtyColX + colWidths.qty + colWidths.price + colWidths.dis;
      doc.text(totalTaxable.toFixed(2), taxableColX, bottomTableY + 5, { width: colWidths.taxable - 2, align: 'right' });

      const cgstColX = taxableColX + colWidths.taxable + colWidths.cgstP;
      doc.text(totalCGST.toFixed(2), cgstColX, bottomTableY + 5, { width: colWidths.cgst - 2, align: 'right' });

      const sgstColX = cgstColX + colWidths.cgst + colWidths.sgstP;
      doc.text(totalSGST.toFixed(2), sgstColX, bottomTableY + 5, { width: colWidths.sgst - 2, align: 'right' });

      const grandAmount = Number(invoice.grandTotal) || 0;
      doc.text(grandAmount.toFixed(2), tableX + tableW - colWidths.amount, bottomTableY + 5, { width: colWidths.amount - 2, align: 'right' });

      currentY = bottomTableY + totRowH + 6;

      // Pink accent divider line below items table
      doc.rect(margin, currentY, contentWidth, 2.5).fill(pinkAccent);
      currentY += 14;

      // ================= 4. SUMMARY, PAYMENT INFO & SIGNATURE =================
      const bottomStartY = currentY;

      // Left Column: Total In Words, Payment Info, Terms
      const leftColW = 280;
      doc.fillColor(darkBlack).font('Helvetica-Bold').fontSize(8.5).text('Total Invoice value ( In Words ) :', margin, bottomStartY);
      
      const wordsText = numberToWords(grandAmount);
      doc.fillColor(darkBlack).font('Helvetica-Bold').fontSize(8.5).text(wordsText, margin, bottomStartY + 13, { width: leftColW });

      const payInfoY = bottomStartY + 36;
      doc.fillColor(darkBlack).font('Helvetica-Bold').fontSize(8.5).text('Payment Info.:', margin, payInfoY);
      
      const paidMode = invoice.paymentMethod || 'CASH';
      const paidVal = (Number(invoice.cashAmount || 0) + Number(invoice.onlineAmount || 0)) || grandAmount;
      doc.fillColor(darkBlack).font('Helvetica').fontSize(8.5).text(`${paidMode.toUpperCase()}- ${paidVal.toFixed(2)}`, margin, payInfoY + 12);

      const termsY = payInfoY + 34;
      doc.fillColor(darkBlack).font('Helvetica-Bold').fontSize(8.5).text('Terms & Condition', margin, termsY);
      if (settings?.invoiceFooter) {
        doc.fillColor(textMuted).font('Helvetica').fontSize(7).text(settings.invoiceFooter, margin, termsY + 12, { width: leftColW, lineGap: 1.5 });
      }

      // Right Column: Paid Amount, Due Amount, Total Amt, Date, Name, Signature
      const rightColX = margin + contentWidth - 200;
      let rightY = bottomStartY;

      const drawAmtRow = (label, val, isTotal = false) => {
        if (isTotal) {
          doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(11).text(`${label} :`, rightColX, rightY);
          doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(13).text(val, rightColX + 80, rightY - 1, { width: 120, align: 'right' });
          rightY += 20;
        } else {
          doc.fillColor(darkBlack).font('Helvetica-Bold').fontSize(9).text(`${label} :`, rightColX, rightY);
          doc.fillColor(darkBlack).font('Helvetica-Bold').fontSize(9).text(val, rightColX + 80, rightY, { width: 120, align: 'right' });
          rightY += 15;
        }
      };

      const paidAmt = Number(invoice.cashAmount || 0) + Number(invoice.onlineAmount || 0);
      const dueAmt = Number(invoice.dueAmount || 0);

      drawAmtRow('Paid Amount', paidAmt.toFixed(2));
      drawAmtRow('Due Amount', dueAmt.toFixed(2));
      drawAmtRow('Total Amt', grandAmount.toFixed(2), true);

      rightY += 2;
      doc.fillColor(darkBlack).font('Helvetica-Bold').fontSize(8.5).text('Date:', rightColX, rightY);
      doc.fillColor(darkBlack).font('Helvetica-Bold').fontSize(8.5).text(formatDateDMY(invoice.invoiceDate || invoice.createdAt), rightColX + 44, rightY);
      rightY += 13;

      doc.fillColor(darkBlack).font('Helvetica-Bold').fontSize(8.5).text('Name:', rightColX, rightY);
      doc.fillColor(darkBlack).font('Helvetica-Bold').fontSize(8.5).text(shopName, rightColX + 44, rightY);
      rightY += 36;

      doc.fillColor(darkBlack).font('Helvetica-Bold').fontSize(8.5).text('Signature :', rightColX, rightY);
      doc.fillColor(darkBlack).font('Helvetica').fontSize(8.5).text('.....................................', rightColX, rightY + 16);

      doc.end();

      writeStream.on('finish', () => {
        resolve({
          filePath,
          fileName,
          relativeUrl: `/api/invoices/${invoice._id}/pdf`,
        });
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};
