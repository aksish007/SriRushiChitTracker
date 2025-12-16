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
 * Matches the format from the second image
 */
export function generateCompanyPayoutReport(data: {
  month: number;
  year: number;
  users: Array<{
    index?: number;
    name: string;
    registrationId: string;
    chitValues: Array<{ value: number; subscriberId?: string }>;
    referrerIdentifier?: string;
    totalIncentive: number;
  }>;
  companyName?: string;
}): ArrayBuffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Company Header
  const companyName = data.companyName || 'Sri Rushi Chits India Private Ltd.';
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Report Title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const monthYear = `${getMonthName(data.month)} ${data.year} - Payout Report`;
  doc.text(monthYear, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Table data
  const tableData: any[][] = [];
  let stepNumber = 1;

  data.users.forEach((user) => {
    // If user has chit values, show them
    if (user.chitValues.length > 0) {
      // First row with step, name, first chit value, incentive, and remarks
      const firstChitValue = user.chitValues[0];
      tableData.push([
        stepNumber.toString(),
        user.name,
        firstChitValue ? formatChitValue(firstChitValue.value) : '',
        formatCurrency(user.totalIncentive),
        user.referrerIdentifier || ''
      ]);

      // Additional rows for multiple chit values (same step, name, but different chit value)
      if (user.chitValues.length > 1) {
        user.chitValues.slice(1).forEach((chitValue) => {
          tableData.push([
            '', // Empty step (same as above)
            '', // Empty name (same as above)
            formatChitValue(chitValue.value),
            '', // Empty incentive (already shown in first row)
            '' // Empty remarks (same as above)
          ]);
        });
      }
    } else {
      // User with no chit values - still show them
      tableData.push([
        stepNumber.toString(),
        user.name,
        '',
        formatCurrency(user.totalIncentive),
        user.referrerIdentifier || ''
      ]);
    }
    
    stepNumber++;
  });

  // Calculate totals
  const totalIncentive = data.users.reduce((sum, user) => sum + user.totalIncentive, 0);
  const tds = totalIncentive * 0.05;
  const netAmount = totalIncentive - tds;

  // Generate table
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
        
        doc.text('Total', 14, finalY);
        doc.text(formatCurrency(totalIncentive), 120, finalY);
        
        doc.text('5% TDS', 14, finalY + 8);
        doc.text(formatCurrency(tds), 120, finalY + 8);
        
        doc.text('Net Amt Paid', 14, finalY + 16);
        doc.text(formatCurrency(netAmount), 120, finalY + 16);
        
        // Company footer
        const footerY = pageWidth > 200 ? 280 : pageWidth * 1.4;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(companyName, pageWidth / 2, footerY, { align: 'center' });
        doc.text('Foreman', pageWidth / 2, footerY + 15, { align: 'center' });
        
        // Signature line
        doc.line(60, footerY + 20, 150, footerY + 20);
      }
    },
  });

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
        head: [['Name', 'Chit Scheme', 'Amount', 'Referred By', 'Incentive']],
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

  return doc.output('arraybuffer') as ArrayBuffer;
}

