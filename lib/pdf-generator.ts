import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PayoutCalculator } from './payout-calculator';

/**
 * Format currency amount with abbreviations (50K, 1L, 5Lakh, etc.)
 */
function formatChitValue(amount: number): string {
  if (amount >= 1000000) {
    const lakhs = amount / 100000;
    if (lakhs >= 10) {
      return `${lakhs}Lakh`;
    }
    return `${lakhs}Lakh`;
  } else if (amount >= 100000) {
    const lakhs = amount / 100000;
    return `${lakhs}L`;
  } else if (amount >= 1000) {
    const thousands = amount / 1000;
    return `${thousands}K`;
  }
  return amount.toString();
}

/**
 * Format currency for display (without currency symbol)
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get month name from number
 */
function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}

/**
 * Generate User-Level Payout Report (Monthly Account Tree Report)
 * Matches the format from the first image
 */
export function generateUserPayoutReport(data: {
  userName: string;
  registrationId: string;
  month?: number;
  year?: number;
  steps: Array<{
    step: number;
    referrals: Array<{
      name: string;
      registrationId: string;
      chitValue: number;
      incentiveAmount: number;
      referrerName: string;
      referrerRegistrationId: string;
    }>;
  }>;
  companyName?: string;
}): ArrayBuffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Company Header
  const companyName = data.companyName || 'SRCIPL';
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Report Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const title = `Monthly Account Tree Report`;
  doc.text(title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;

  // Month/Year (only show if month/year are provided)
  if (data.month && data.year) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const monthYear = `The Month of ${getMonthName(data.month)}.${data.year}`;
    doc.text(monthYear, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
  } else {
    // Show "All Time Data" when no specific month/year is provided
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Complete History (All Time Data)', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
  }

  // User Info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Root User: ${data.userName} (${data.registrationId})`, 14, yPos);
  yPos += 10;

  // Table data
  const tableData: any[][] = [];
  
  data.steps.forEach((stepData) => {
    stepData.referrals.forEach((referral) => {
      // For step 0, show as "ROOT" or just the step number
      const stepLabel = stepData.step === 0 ? 'ROOT' : `STEP ${stepData.step}`;
      const remarks = referral.referrerName && referral.referrerRegistrationId
        ? `${referral.referrerName} (${referral.referrerRegistrationId})`
        : (referral.referrerName || referral.referrerRegistrationId || '');
      tableData.push([
        stepLabel,
        referral.name,
        formatChitValue(referral.chitValue),
        formatCurrency(referral.incentiveAmount),
        remarks
      ]);
    });
  });

  // Calculate totals
  const totalIncentive = data.steps.reduce((sum, stepData) => {
    return sum + stepData.referrals.reduce((stepSum, referral) => {
      return stepSum + referral.incentiveAmount;
    }, 0);
  }, 0);
  const tds = totalIncentive * 0.05;
  const netAmount = totalIncentive - tds;

  // Generate table only if there's data
  if (tableData.length > 0) {
    autoTable(doc, {
      head: [['STEP', 'NAME', 'GROUP/CHIT VALUE', 'INCENTIVE AMOUNT', 'REMARKS']],
      body: tableData,
      startY: yPos,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 60 },
        2: { cellWidth: 40, halign: 'center' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 30 },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data: any) => {
        // Draw totals on last page
        if (data.pageNumber === (data as any).pageCount && data.cursor) {
          const finalY = data.cursor.y + 10;
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          
          // Total row
          doc.text('Total', 14, finalY);
          const totalsX = 14 + 25 + 60 + 40; // After STEP, NAME, GROUP/CHIT VALUE columns
          doc.text(formatCurrency(totalIncentive), totalsX + 35, finalY, { align: 'right' });
          
          // TDS row
          doc.text('5% TDS', 14, finalY + 8);
          doc.text(formatCurrency(tds), totalsX + 35, finalY + 8, { align: 'right' });
          
          // Net Amount row
          doc.text('After TDS (Net Amount)', 14, finalY + 16);
          doc.text(formatCurrency(netAmount), totalsX + 35, finalY + 16, { align: 'right' });
        }
      },
    });
  } else {
    // Show message if no data
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No referral data available.', 14, yPos);
  }

  return doc.output('arraybuffer') as ArrayBuffer;
}

/**
 * Generate Company-Level Payout Report (Consolidated Monthly Report)
 * 
 * IMPORTANT: This function generates PDF format ONLY.
 * The sample document (SRCIPL NOVEMBER REPORT 2025_SAMPLE.docx) is for reference only.
 * All actual reports are generated as PDF files.
 * 
 * Matches the format from SRCIPL NOVEMBER REPORT 2025_SAMPLE.docx:
 * - Header: Company name (left) and address (right)
 * - Title: "Business Report for the Month [Month] – [Year]"
 * - Table: Ss.No., ID No., Subscriber Name, Group & A/C No., Amount, Remarks
 * - Amounts shown as full numbers (not abbreviated)
 * 
 * @param data - Company payout report data
 * @returns PDF document as ArrayBuffer
 */
export function generateCompanyPayoutReport(data: {
  month: number;
  year: number;
  payoutRows: Array<{
    serialNumber: number;
    registrationId: string;
    name: string;
    subscriberId: string;
    chitSchemeName: string;
    amount: number;
    referrerIdentifier?: string;
  }>;
  companyName?: string;
  companyAddress?: string;
}): ArrayBuffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 14;
  const rightMargin = 14;
  let yPos = 20;

  // Company Header - Left aligned company name, Right aligned address
  const companyName = data.companyName || 'Sri Rushi Chits Indian Pvt Ltd';
  const companyAddress = data.companyAddress || 'Peerzadiguda, Hyderabad';
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, leftMargin, yPos);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  // Right align address - x position is the right edge, text aligns to the left of this point
  const addressX = pageWidth - rightMargin;
  doc.text(companyAddress, addressX, yPos, { align: 'right' });
  yPos += 10;

  // Report Title - "Payout Report for the Month [Month] – [Year]"
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const monthYear = `Payout Report for the Month ${getMonthName(data.month)} – ${data.year}`;
  doc.text(monthYear, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Table data - Format: Ss.No., ID No., Subscriber Name, Group & A/C No., Amount, Referred By
  // Each payout is a separate row (matching sample format)
  const tableData: any[][] = data.payoutRows.map((row) => {
    // Group & A/C No. should be: Group Name / Subscriber ID
    const groupAccountNo = row.subscriberId 
      ? `${row.chitSchemeName} / ${row.subscriberId}`
      : `${row.chitSchemeName} / ${row.registrationId}`;
    
    return [
      row.serialNumber.toString(),
      row.registrationId,
      row.name,
      groupAccountNo,
      formatCurrency(row.amount), // Full amount, not abbreviated
      row.referrerIdentifier || ''
    ];
  });

  // Calculate totals
  const totalIncentive = data.payoutRows.reduce((sum, row) => sum + row.amount, 0);
  const tds = totalIncentive * 0.05;
  const netAmount = totalIncentive - tds;

  // Generate table - Columns: Ss.No., ID No., Subscriber Name, Group & A/C No., Amount, Referred By
  // Calculate available width for table (page width minus margins)
  const availableWidth = pageWidth - leftMargin - rightMargin;
  
  // Calculate column widths as percentages of available width
  // Total: 10% + 15% + 25% + 20% + 15% + 15% = 100%
  autoTable(doc, {
    head: [['Ss.No.', 'ID No.', 'Subscriber Name', 'Group & A/C No.', 'Amount', 'Referred By']],
    body: tableData,
    startY: yPos,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: availableWidth * 0.10, halign: 'center' }, // Ss.No. - 10%
      1: { cellWidth: availableWidth * 0.15, halign: 'left' }, // ID No. - 15%
      2: { cellWidth: availableWidth * 0.25, halign: 'left' }, // Subscriber Name - 25%
      3: { cellWidth: availableWidth * 0.20, halign: 'left' }, // Group & A/C No. - 20%
      4: { cellWidth: availableWidth * 0.15, halign: 'right' }, // Amount - 15%
      5: { cellWidth: availableWidth * 0.15, halign: 'left' }, // Remarks - 15%
    },
    margin: { left: leftMargin, right: rightMargin },
  });

  // Get the final Y position from the table and add totals
  const finalTableY = (doc as any).lastAutoTable?.finalY || yPos;
  const finalY = finalTableY + 15;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  doc.text('Total', leftMargin, finalY);
  // Align totals to the right, within the table width
  const totalsX = leftMargin + availableWidth - 28; // Right align to Amount column
  doc.text(formatCurrency(totalIncentive), totalsX, finalY, { align: 'right' });
  
  doc.text('5% TDS', leftMargin, finalY + 8);
  doc.text(formatCurrency(tds), totalsX, finalY + 8, { align: 'right' });
  
  doc.text('Net Amt Paid', leftMargin, finalY + 16);
  doc.text(formatCurrency(netAmount), totalsX, finalY + 16, { align: 'right' });
  
  // Company footer
  const footerY = pageWidth > 200 ? 280 : pageWidth * 1.4;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(companyName, pageWidth / 2, footerY, { align: 'center' });
  doc.text('Foreman', pageWidth / 2, footerY + 15, { align: 'center' });
  
  // Signature line
  doc.line(60, footerY + 20, 150, footerY + 20);

  return doc.output('arraybuffer') as ArrayBuffer;
}

/**
 * Generate Referral Tree PDF Report
 * Hierarchical structure with step-based organization
 */
export function generateReferralTreeReport(data: {
  rootUser: {
    name: string;
    registrationId: string;
  };
  steps: Array<{
    step: number;
    referrals: Array<{
      name: string;
      registrationId: string;
      chitSchemes: Array<{
        name: string;
        chitId: string;
        amount: number;
      }>;
      referredBy: string;
      incentiveAmount: number;
    }>;
  }>;
}): ArrayBuffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Referral Tree Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Root User
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Root User: ${data.rootUser.name} (${data.rootUser.registrationId})`, 14, yPos);
  yPos += 15;

  // Calculate totals from all steps
  const totalIncentive = data.steps.reduce((sum, stepData) => {
    return sum + stepData.referrals.reduce((stepSum, referral) => {
      return stepSum + referral.incentiveAmount;
    }, 0);
  }, 0);
  const tds = totalIncentive * 0.05;
  const netAmount = totalIncentive - tds;

  // Generate content for each step
  data.steps.forEach((stepData) => {
    // Step header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Step ${stepData.step}`, 14, yPos);
    yPos += 8;

    if (stepData.referrals.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('No referrals at this level', 20, yPos);
      yPos += 10;
    } else {
      // Table for step referrals
      const stepTableData = stepData.referrals.map(ref => [
        ref.name,
        ref.chitSchemes.map(cs => cs.name).join(', ') || 'N/A',
        ref.chitSchemes.map(cs => formatChitValue(cs.amount)).join(', ') || 'N/A',
        ref.referredBy,
        formatCurrency(ref.incentiveAmount)
      ]);

      autoTable(doc, {
        head: [['Name', 'Chit Group', 'Amount', 'Referred By', 'Incentive']],
        body: stepTableData,
        startY: yPos,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        margin: { left: 14, right: 14 },
        didParseCell: (data: any) => {
          if (data.row.index === stepTableData.length - 1 && data.cursor) {
            yPos = data.cursor.y + 5;
          }
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Page break if needed
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
  });

  // Add totals at the end (after all steps)
  if (totalIncentive > 0) {
    // Ensure we're on a new page if too close to bottom
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    } else {
      yPos += 10;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    // Total row
    doc.text('Total', 14, yPos);
    const totalsX = 14 + 60 + 40 + 30; // After Name, Chit Group, Amount, Referred By columns
    doc.text(formatCurrency(totalIncentive), totalsX + 35, yPos, { align: 'right' });
    
    // TDS row
    doc.text('5% TDS', 14, yPos + 8);
    doc.text(formatCurrency(tds), totalsX + 35, yPos + 8, { align: 'right' });
    
    // Net Amount row
    doc.text('After TDS (Net Amount)', 14, yPos + 16);
    doc.text(formatCurrency(netAmount), totalsX + 35, yPos + 16, { align: 'right' });
  }

  return doc.output('arraybuffer') as ArrayBuffer;
}

