import * as xlsx from 'node-xlsx';

export interface ExcelUserData {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  referredBy?: string;
  chitId?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  nomineeAge?: string;
  nomineeDateOfBirth?: string;
}

export function parseExcelFile(file: ArrayBuffer): ExcelUserData[] {
  const buffer = Buffer.from(file);
  const sheets = xlsx.parse(buffer);
  const sheet = sheets[0]; // Get first sheet
  
  // Assuming first row is headers
  const dataRows = sheet.data.slice(1) as any[][];
  
  return dataRows.map(row => {
    const user: ExcelUserData = {
      firstName: row[0] || '',
      lastName: row[1] || '',
      email: row[2] || undefined,
      phone: String(row[3] || ''), // Ensure phone is always a string
      address: row[4] || undefined,
      referredBy: row[5] || undefined,
      chitId: row[6] || undefined,
      nomineeName: row[7] || undefined,
      nomineeRelation: row[8] || undefined,
      nomineeAge: row[9] ? String(row[9]) : undefined,
      nomineeDateOfBirth: row[10] || undefined,
    };
    return user;
  }).filter(user => user.firstName && user.lastName && user.phone);
}

export function generateExcelTemplate(): ArrayBuffer {
  const headers = [
    'First Name', 
    'Last Name', 
    'Email (Optional)', 
    'Phone', 
    'Address (Optional)', 
    'Referred By (Registration ID)', 
    'Chit ID (Optional)',
    'Nominee Name (Optional)',
    'Nominee Relation (Optional)',
    'Nominee Age (Optional)',
    'Nominee Date of Birth (Optional)'
  ];
  const sampleData = [
    ['John', 'Doe', 'john.doe@example.com', '9876543210', '123 Main St', 'REG-123456', 'SRC01NS', 'Jane Doe', 'spouse', '25', '1998-05-15'],
    ['Jane', 'Smith', '', '9876543211', '456 Oak Ave', '', '', 'Bob Smith', 'father', '55', '1968-12-10'],
  ];
  
  const sheetData = [headers, ...sampleData];
  const buffer = xlsx.build([{ name: 'Users', data: sheetData, options: {} }]);
  
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export function exportUsersToExcel(users: any[]): ArrayBuffer {
  const headers = ['Registration ID', 'Name', 'Email', 'Phone', 'Address', 'Referred By', 'Role', 'Status', 'Created At'];
  const data = users.map(user => [
    user.registrationId,
    `${user.firstName} ${user.lastName}`,
    user.email,
    user.phone,
    user.address || '',
    user.referrer ? `${user.referrer.firstName} ${user.referrer.lastName} (${user.referrer.registrationId})` : 'Sri Rushi Chits',
    user.role,
    user.isActive ? 'Active' : 'Inactive',
    new Date(user.createdAt).toLocaleDateString(),
  ]);
  
  const sheetData = [headers, ...data];
  const buffer = xlsx.build([{ name: 'Users', data: sheetData, options: {} }]);
  
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export function exportSubscriptionsToExcel(subscriptions: any[]): ArrayBuffer {
  const headers = ['Subscriber ID', 'User Name', 'User Email', 'User Phone', 'Chit Scheme', 'Amount', 'Duration', 'Status', 'Created At'];
  const data = subscriptions.map(sub => [
    sub.subscriberId,
    `${sub.user.firstName} ${sub.user.lastName}`,
    sub.user.email,
    sub.user.phone,
    sub.chitScheme.name,
    sub.chitScheme.amount,
    sub.chitScheme.duration,
    sub.status,
    new Date(sub.createdAt).toLocaleDateString(),
  ]);
  
  const sheetData = [headers, ...data];
  const buffer = xlsx.build([{ name: 'Subscriptions', data: sheetData, options: {} }]);
  
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export function exportPayoutsToExcel(payouts: any[]): ArrayBuffer {
  const headers = ['User Name', 'User Email', 'Subscriber ID', 'Chit Scheme', 'Amount', 'Month', 'Year', 'Status', 'Created At'];
  const data = payouts.map(payout => [
    `${payout.subscription.user.firstName} ${payout.subscription.user.lastName}`,
    payout.subscription.user.email,
    payout.subscription.subscriberId,
    payout.subscription.chitScheme.name,
    payout.amount,
    payout.month,
    payout.year,
    payout.status,
    new Date(payout.createdAt).toLocaleDateString(),
  ]);
  
  const sheetData = [headers, ...data];
  const buffer = xlsx.build([{ name: 'Payouts', data: sheetData, options: {} }]);
  
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export function exportReferralsToExcel(users: any[]): ArrayBuffer {
  const headers = ['Registration ID', 'Name', 'Email', 'Referrer Name', 'Referrer Email', 'Direct Referrals', 'Total Subscriptions', 'Total Payouts', 'Created At'];
  const data = users.map(user => [
    user.registrationId,
    `${user.firstName} ${user.lastName}`,
    user.email,
    user.referrer ? `${user.referrer.firstName} ${user.referrer.lastName}` : 'None',
    user.referrer?.email || 'None',
    user.referrals.length,
    user.subscriptions.length,
    user.payouts.reduce((sum: number, p: any) => sum + Number(p.amount), 0),
    new Date(user.createdAt).toLocaleDateString(),
  ]);
  
  const sheetData = [headers, ...data];
  const buffer = xlsx.build([{ name: 'Referrals', data: sheetData, options: {} }]);
  
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export function exportActivityToExcel(auditLogs: any[]): ArrayBuffer {
  const headers = ['User Name', 'User Email', 'Action', 'Details', 'IP Address', 'User Agent', 'Created At'];
  const data = auditLogs.map(log => [
    log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
    log.user?.email || 'System',
    log.action,
    log.details,
    log.ipAddress,
    log.userAgent,
    new Date(log.createdAt).toLocaleDateString(),
  ]);
  
  const sheetData = [headers, ...data];
  const buffer = xlsx.build([{ name: 'Activity', data: sheetData, options: {} }]);
  
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export function exportFinancialToExcel(data: { subscriptions: any[], payouts: any[], chitSchemes: any[] }): ArrayBuffer {
  const workbook = [
    {
      name: 'Active Subscriptions',
      data: [
        ['Subscriber ID', 'User Name', 'Chit Scheme', 'Amount', 'Duration', 'Created At'],
        ...data.subscriptions.map(sub => [
          sub.subscriberId,
          `${sub.user.firstName} ${sub.user.lastName}`,
          sub.chitScheme.name,
          sub.chitScheme.amount,
          sub.chitScheme.duration,
          new Date(sub.createdAt).toLocaleDateString(),
        ])
      ],
      options: {}
    },
    {
      name: 'Payouts',
      data: [
        ['User Name', 'Subscriber ID', 'Chit Scheme', 'Amount', 'Month', 'Year', 'Status'],
        ...data.payouts.map(payout => [
          `${payout.subscription.user.firstName} ${payout.subscription.user.lastName}`,
          payout.subscription.subscriberId,
          payout.subscription.chitScheme.name,
          payout.amount,
          payout.month,
          payout.year,
          payout.status,
        ])
      ],
      options: {}
    },
    {
      name: 'Chit Schemes',
      data: [
        ['Chit ID', 'Name', 'Amount', 'Duration', 'Total Slots', 'Active Subscriptions'],
        ...data.chitSchemes.map(scheme => [
          scheme.chitId,
          scheme.name,
          scheme.amount,
          scheme.duration,
          scheme.totalSlots,
          data.subscriptions.filter(sub => sub.chitScheme.chitId === scheme.chitId).length,
        ])
      ],
      options: {}
    }
  ];
  
  const buffer = xlsx.build(workbook);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export function exportTdsToExcel(payouts: any[]): ArrayBuffer {
  const TDS_RATE = 0.05; // 5% TDS
  
  const headers = [
    'Serial Number',
    'Registration ID',
    'User Name',
    'Subscriber ID',
    'Payout Amount',
    'TDS Amount (5%)',
    'Net Amount',
    'Month',
    'Year',
    'Status',
    'Created At'
  ];
  
  let serialNumber = 1;
  let totalPayoutAmount = 0;
  let totalTdsAmount = 0;
  let totalNetAmount = 0;
  
  const data = payouts.map(payout => {
    const payoutAmount = Number(payout.amount);
    const tdsAmount = payoutAmount * TDS_RATE;
    const netAmount = payoutAmount - tdsAmount;
    
    totalPayoutAmount += payoutAmount;
    totalTdsAmount += tdsAmount;
    totalNetAmount += netAmount;
    
    return [
      serialNumber++,
      payout.user.registrationId,
      `${payout.user.firstName} ${payout.user.lastName}`,
      payout.subscription.subscriberId,
      payoutAmount.toFixed(2),
      tdsAmount.toFixed(2),
      netAmount.toFixed(2),
      payout.month,
      payout.year,
      payout.status,
      new Date(payout.createdAt).toLocaleDateString(),
    ];
  });
  
  // Add summary row
  data.push([
    '',
    'TOTAL',
    '',
    '',
    totalPayoutAmount.toFixed(2),
    totalTdsAmount.toFixed(2),
    totalNetAmount.toFixed(2),
    '',
    '',
    '',
    '',
  ]);
  
  const sheetData = [headers, ...data];
  const buffer = xlsx.build([{ name: 'TDS Report', data: sheetData, options: {} }]);
  
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}