import * as XLSX from 'xlsx';

export interface ExcelUserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  referredBy?: string;
}

export function parseExcelFile(file: ArrayBuffer): ExcelUserData[] {
  const workbook = XLSX.read(file, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  // Assuming first row is headers
  const headers = jsonData[0];
  const dataRows = jsonData.slice(1);
  
  return dataRows.map(row => {
    const user: ExcelUserData = {
      firstName: row[0] || '',
      lastName: row[1] || '',
      email: row[2] || '',
      phone: row[3] || '',
      address: row[4] || '',
      referredBy: row[5] || '',
    };
    return user;
  }).filter(user => user.email && user.firstName);
}

export function generateExcelTemplate(): ArrayBuffer {
  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Address', 'Referred By (Registration ID)'];
  const sampleData = [
    ['John', 'Doe', 'john.doe@example.com', '9876543210', '123 Main St', 'REG-123456'],
    ['Jane', 'Smith', 'jane.smith@example.com', '9876543211', '456 Oak Ave', ''],
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
  
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
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
  
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
  
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}