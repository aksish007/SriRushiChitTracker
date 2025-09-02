import * as xlsx from 'node-xlsx';

export interface ExcelUserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  referredBy?: string;
  chitId?: string;
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
      email: row[2] || '',
      phone: String(row[3] || ''), // Ensure phone is always a string
      address: row[4] || '',
      referredBy: row[5] || '',
      chitId: row[6] || '',
    };
    return user;
  }).filter(user => user.email && user.firstName);
}

export function generateExcelTemplate(): ArrayBuffer {
  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Address', 'Referred By (Registration ID)', 'Chit ID'];
  const sampleData = [
    ['John', 'Doe', 'john.doe@example.com', '9876543210', '123 Main St', 'REG-123456', 'CHIT001'],
    ['Jane', 'Smith', 'jane.smith@example.com', '9876543211', '456 Oak Ave', '', ''],
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