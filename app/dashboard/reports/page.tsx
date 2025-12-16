'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Users, TrendingUp, IndianRupee, Calendar, BarChart3, PieChart, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function ReportsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showCompanyPayoutDialog, setShowCompanyPayoutDialog] = useState(false);
  const [companyPayoutMonth, setCompanyPayoutMonth] = useState<string>('');
  const [companyPayoutYear, setCompanyPayoutYear] = useState<string>('');

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || '';
  };

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const reports = [
    {
      id: 'users',
      title: 'Users Report',
      description: 'Complete list of all registered users with their details',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      features: [
        'User registration details',
        'Referral information',
        'Subscription status',
        'Contact information'
      ]
    },
    {
      id: 'subscriptions',
      title: 'Subscriptions Report',
      description: 'Detailed report of all chit fund subscriptions',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      features: [
        'Subscription details',
        'Chit scheme information',
        'Payment history',
        'Status tracking'
      ]
    },
    {
      id: 'payouts',
      title: 'Payouts Report',
      description: 'Comprehensive payout tracking and analysis',
      icon: IndianRupee,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      features: [
        'Payout history',
        'Payment status',
        'Amount tracking',
        'Monthly summaries'
      ]
    },
    {
      id: 'referrals',
      title: 'Referral Network Report',
      description: 'Complete referral tree and network analysis',
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      features: [
        'Referral hierarchy',
        'Network statistics',
        'Performance metrics',
        'Growth analysis'
      ]
    },
    {
      id: 'activity',
      title: 'Activity Report',
      description: 'System activity and audit trail',
      icon: Activity,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      features: [
        'User activities',
        'System events',
        'Login history',
        'Action tracking'
      ]
    },
    {
      id: 'financial',
      title: 'Financial Summary',
      description: 'Financial overview and revenue analysis',
      icon: PieChart,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      features: [
        'Revenue analysis',
        'Payment summaries',
        'Financial metrics',
        'Trend analysis'
      ]
    },
    {
      id: 'company-payout-pdf',
      title: 'Company Payout Report (PDF)',
      description: 'Consolidated monthly payout report with TDS',
      icon: FileText,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      features: [
        'All users payout data',
        'TDS calculations',
        'Net amount summaries',
        'Company-wide analysis'
      ]
    }
  ];

  const handleDownload = async (reportId: string) => {
    setDownloading(reportId);
    
    try {
      let endpoint = '';
      let filename = '';
      
      switch (reportId) {
        case 'users':
          endpoint = '/api/reports/export-users';
          filename = `users-report-${new Date().toISOString().split('T')[0]}.xlsx`;
          break;
        case 'subscriptions':
          endpoint = '/api/reports/export-subscriptions';
          filename = `subscriptions-report-${new Date().toISOString().split('T')[0]}.xlsx`;
          break;
        case 'payouts':
          endpoint = '/api/reports/export-payouts';
          filename = `payouts-report-${new Date().toISOString().split('T')[0]}.xlsx`;
          break;
        case 'referrals':
          endpoint = '/api/reports/export-referrals';
          filename = `referrals-report-${new Date().toISOString().split('T')[0]}.xlsx`;
          break;
        case 'activity':
          endpoint = '/api/reports/export-activity';
          filename = `activity-report-${new Date().toISOString().split('T')[0]}.xlsx`;
          break;
        case 'financial':
          endpoint = '/api/reports/export-financial';
          filename = `financial-report-${new Date().toISOString().split('T')[0]}.xlsx`;
          break;
        case 'user-payout-pdf':
          // This requires userId and month/year - redirect to payouts page
          toast({
            title: 'Info',
            description: 'Please use the Export User Report option from the Payouts page for a specific user.',
            variant: 'default',
          });
          return;
        case 'company-payout-pdf':
          // Show dialog for month/year selection
          setShowCompanyPayoutDialog(true);
          setCompanyPayoutMonth(currentMonth.toString());
          setCompanyPayoutYear(currentYear.toString());
          setDownloading(null);
          return;
        default:
          throw new Error('Unknown report type');
      }

      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Report Downloaded!',
        description: `${reports.find(r => r.id === reportId)?.title} has been downloaded successfully.`,
        variant: 'success',
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download report',
        variant: 'destructive',
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleCompanyPayoutDownload = async () => {
    if (!companyPayoutMonth || !companyPayoutYear) {
      toast({
        title: 'Error',
        description: 'Please select both month and year',
        variant: 'destructive',
      });
      return;
    }

    setDownloading('company-payout-pdf');
    try {
      const endpoint = `/api/reports/export-company-payout-pdf?month=${companyPayoutMonth}&year=${companyPayoutYear}`;
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `company-payout-${companyPayoutYear}-${companyPayoutMonth.padStart(2, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Report Downloaded!',
        description: 'Company Payout Report has been downloaded successfully.',
        variant: 'success',
      });

      setShowCompanyPayoutDialog(false);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download report',
        variant: 'destructive',
      });
    } finally {
      setDownloading(null);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/reports/template', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to download template');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulk-upload-template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Template Downloaded!',
        description: 'Bulk upload template has been downloaded successfully.',
        variant: 'success',
      });
    } catch (error) {
      console.error('Template download error:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download template',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate and download comprehensive reports for your chit fund business
          </p>
        </div>
        <Button onClick={downloadTemplate} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{reports.length}</p>
                <p className="text-sm text-muted-foreground">Available Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{new Date().toLocaleDateString()}</p>
                <p className="text-sm text-muted-foreground">Current Date</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Download className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">Excel</p>
                <p className="text-sm text-muted-foreground">Format</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">Real-time</p>
                <p className="text-sm text-muted-foreground">Data</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const IconComponent = report.icon;
          return (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${report.bgColor}`}>
                    <IconComponent className={`h-6 w-6 ${report.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {report.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Features:</h4>
                  <ul className="space-y-1">
                    {report.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Button
                  onClick={() => handleDownload(report.id)}
                  disabled={downloading === report.id}
                  className="w-full"
                  size="sm"
                >
                  {downloading === report.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download Report
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Report Information */}
      <Card>
        <CardHeader>
          <CardTitle>Report Information</CardTitle>
          <CardDescription>
            Learn more about the available reports and their features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-3">Report Types</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Users</Badge>
                  <span className="text-sm text-muted-foreground">Complete user database</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Subscriptions</Badge>
                  <span className="text-sm text-muted-foreground">Chit fund subscriptions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Payouts</Badge>
                  <span className="text-sm text-muted-foreground">Payment tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Referrals</Badge>
                  <span className="text-sm text-muted-foreground">Network analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Activity</Badge>
                  <span className="text-sm text-muted-foreground">System audit trail</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Financial</Badge>
                  <span className="text-sm text-muted-foreground">Revenue analysis</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Features</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>All reports are generated in Excel format (.xlsx)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Real-time data from the current database</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Comprehensive data with all relevant fields</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Formatted for easy analysis and sharing</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Secure access with admin authentication</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Automatic file naming with date stamps</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">For Analysis</h4>
              <p className="text-xs text-muted-foreground">
                Use these reports for business analysis, performance tracking, and decision making.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">For Compliance</h4>
              <p className="text-xs text-muted-foreground">
                Generate reports for regulatory compliance and audit purposes.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">For Sharing</h4>
              <p className="text-xs text-muted-foreground">
                Share reports with stakeholders, investors, or team members as needed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Payout PDF Dialog */}
      <Dialog open={showCompanyPayoutDialog} onOpenChange={setShowCompanyPayoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Company Payout Report</DialogTitle>
            <DialogDescription>
              Select the month and year for the company payout report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Select value={companyPayoutMonth} onValueChange={setCompanyPayoutMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {getMonthName(month)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={companyPayoutYear}
                onChange={(e) => setCompanyPayoutYear(e.target.value)}
                placeholder={currentYear.toString()}
                min="2020"
                max={currentYear + 5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompanyPayoutDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompanyPayoutDownload} disabled={downloading === 'company-payout-pdf'}>
              {downloading === 'company-payout-pdf' ? 'Generating...' : 'Generate Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
