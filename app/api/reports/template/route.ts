import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { generateExcelTemplate } from '@/lib/excel-utils';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, 'ADMIN');

    const templateBuffer = generateExcelTemplate();

    return new NextResponse(templateBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="bulk-upload-template.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Download template error:', error);
    
    if (error.message === 'Authentication required' || error.message === 'Insufficient permissions') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}