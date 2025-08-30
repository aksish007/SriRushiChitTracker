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
      phone: row[3] || '',
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
  const buffer = xlsx.build([{ name: 'Users', data: sheetData }]);
  
  return buffer;
}

export function exportUsersToExcel(users: any[]): ArrayBuffer {
  const headers = ['Registration ID', 'Name', 'Email', 'Phone', 'Address', 'Role', 'Status', 'Created At'];
  const data = users.map(user => [
    user.registrationId,
    `${user.firstName} ${user.lastName}`,
    user.email,
    user.phone,
    user.address || '',
    user.role,
    user.isActive ? 'Active' : 'Inactive',
    new Date(user.createdAt).toLocaleDateString(),
  ]);
  
  const sheetData = [headers, ...data];
  const buffer = xlsx.build([{ name: 'Users', data: sheetData }]);
  
  return buffer;
}