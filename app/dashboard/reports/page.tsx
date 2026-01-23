'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Users, TrendingUp, IndianRupee, Calendar, BarChart3, PieChart, Activity, Receipt } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { SearchableUser } from '@/components/ui/searchable-user';

export default function ReportsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showCompanyPayoutDialog, setShowCompanyPayoutDialog] = useState(false);
  const [companyPayoutMonth, setCompanyPayoutMonth] = useState<string>('');
  const [companyPayoutYear, setCompanyPayoutYear] = useState<string>('');
  const [showUserPayoutDialog, setShowUserPayoutDialog] = useState(false);
  const [userPayoutUserId, setUserPayoutUserId] = useState<string>('');
  const [userPayoutMonth, setUserPayoutMonth] = useState<string>('');
  const [userPayoutYear, setUserPayoutYear] = useState<string>('');
  const [showTdsDialog, setShowTdsDialog] = useState(false);
  const [tdsStartDate, setTdsStartDate] = useState<string>('');
  const [tdsEndDate, setTdsEndDate] = useState<string>('');
  const [tdsAllTillDate, setTdsAllTillDate] = useState<boolean>(false);
  const [showSubscriptionsDialog, setShowSubscriptionsDialog] = useState(false);
  const [subscriptionsFilterType, setSubscriptionsFilterType] = useState<'month' | 'range' | 'all'>('month');
  const [subscriptionsMonth, setSubscriptionsMonth] = useState<string>('');
  const [subscriptionsYear, setSubscriptionsYear] = useState<string>('');
  const [subscriptionsStartDate, setSubscriptionsStartDate] = useState<string>('');
  const [subscriptionsEndDate, setSubscriptionsEndDate] = useState<string>('');
  const [subscriptionsAllTillDate, setSubscriptionsAllTillDate] = useState<boolean>(false);
  const [showFinancialDialog, setShowFinancialDialog] = useState(false);
  const [financialFilterType, setFinancialFilterType] = useState<'month' | 'range' | 'all'>('month');
  const [financialMonth, setFinancialMonth] = useState<string>('');
  const [financialYear, setFinancialYear] = useState<string>('');
  const [financialStartDate, setFinancialStartDate] = useState<string>('');
  const [financialEndDate, setFinancialEndDate] = useState<string>('');
  const [financialAllTillDate, setFinancialAllTillDate] = useState<boolean>(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [activityStartDate, setActivityStartDate] = useState<string>('');
  const [activityEndDate, setActivityEndDate] = useState<string>('');
  const [activityAllTillDate, setActivityAllTillDate] = useState<boolean>(false);
  const [showReferralsDialog, setShowReferralsDialog] = useState(false);
  const [referralsStartDate, setReferralsStartDate] = useState<string>('');
  const [referralsEndDate, setReferralsEndDate] = useState<string>('');
  const [referralsAllTillDate, setReferralsAllTillDate] = useState<boolean>(false);
  const [showUsersDialog, setShowUsersDialog] = useState(false);
  const [usersFilterType, setUsersFilterType] = useState<'month' | 'range' | 'all'>('month');
  const [usersMonth, setUsersMonth] = useState<string>('');
  const [usersYear, setUsersYear] = useState<string>('');
  const [usersStartDate, setUsersStartDate] = useState<string>('');
  const [usersEndDate, setUsersEndDate] = useState<string>('');
  const [usersAllTillDate, setUsersAllTillDate] = useState<boolean>(false);

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
        'Chit group information',
        'Payment history',
        'Status tracking'
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
      title: 'Payout Report (PDF)',
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
    },
    {
      id: 'user-payout-pdf-monthly',
      title: 'Individual Customer Payout Report (PDF)',
      description: 'Month-wise payout report for a specific customer',
      icon: FileText,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      features: [
        'Customer-specific payout data',
        'Month-wise filtering',
        'Referral tree information',
        'Detailed breakdown'
      ]
    },
    {
      id: 'tds',
      title: 'TDS Amount Report',
      description: 'TDS calculation report with date range selection',
      icon: Receipt,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      features: [
        'TDS amount calculations',
        'Date range filtering',
        'Payout details with TDS',
        'Net amount summaries'
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
          // Show dialog for date filtering
          setShowUsersDialog(true);
          setUsersFilterType('month');
          setUsersMonth(currentMonth.toString());
          setUsersYear(currentYear.toString());
          setUsersAllTillDate(false);
          setDownloading(null);
          return;
        case 'subscriptions':
          // Show dialog for date filtering
          setShowSubscriptionsDialog(true);
          setSubscriptionsFilterType('month');
          setSubscriptionsMonth(currentMonth.toString());
          setSubscriptionsYear(currentYear.toString());
          setSubscriptionsAllTillDate(false);
          setDownloading(null);
          return;
        case 'referrals':
          // Show dialog for date range selection
          setShowReferralsDialog(true);
          const todayReferrals = new Date();
          const firstDayReferrals = new Date(todayReferrals.getFullYear(), todayReferrals.getMonth(), 1);
          setReferralsStartDate(firstDayReferrals.toISOString().split('T')[0]);
          setReferralsEndDate(todayReferrals.toISOString().split('T')[0]);
          setReferralsAllTillDate(false);
          setDownloading(null);
          return;
        case 'activity':
          // Show dialog for date range selection
          setShowActivityDialog(true);
          const todayActivity = new Date();
          const firstDayActivity = new Date(todayActivity.getFullYear(), todayActivity.getMonth(), 1);
          setActivityStartDate(firstDayActivity.toISOString().split('T')[0]);
          setActivityEndDate(todayActivity.toISOString().split('T')[0]);
          setActivityAllTillDate(false);
          setDownloading(null);
          return;
        case 'financial':
          // Show dialog for date filtering
          setShowFinancialDialog(true);
          setFinancialFilterType('month');
          setFinancialMonth(currentMonth.toString());
          setFinancialYear(currentYear.toString());
          setFinancialAllTillDate(false);
          setDownloading(null);
          return;
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
        case 'user-payout-pdf-monthly':
          // Show dialog for user and month/year selection
          setShowUserPayoutDialog(true);
          setUserPayoutUserId('');
          setUserPayoutMonth(currentMonth.toString());
          setUserPayoutYear(currentYear.toString());
          setDownloading(null);
          return;
        case 'tds':
          // Show dialog for date range selection
          setShowTdsDialog(true);
          // Set default dates (first day of current month to today)
          const today = new Date();
          const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          setTdsStartDate(firstDayOfMonth.toISOString().split('T')[0]);
          setTdsEndDate(today.toISOString().split('T')[0]);
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
        description: 'Payout Report has been downloaded successfully.',
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

  const handleUserPayoutDownload = async () => {
    if (!userPayoutUserId) {
      toast({
        title: 'Error',
        description: 'Please select a customer',
        variant: 'destructive',
      });
      return;
    }

    if (!userPayoutMonth || !userPayoutYear) {
      toast({
        title: 'Error',
        description: 'Please select both month and year',
        variant: 'destructive',
      });
      return;
    }

    setDownloading('user-payout-pdf-monthly');
    try {
      const endpoint = `/api/reports/export-user-payout-pdf?userId=${userPayoutUserId}&month=${userPayoutMonth}&year=${userPayoutYear}`;
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
      a.download = `user-payout-${userPayoutYear}-${userPayoutMonth.padStart(2, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Report Downloaded!',
        description: 'Individual Customer Payout Report has been downloaded successfully.',
        variant: 'success',
      });

      setShowUserPayoutDialog(false);
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

  const handleTdsDownload = async () => {
    if (!tdsAllTillDate && (!tdsStartDate || !tdsEndDate)) {
      toast({
        title: 'Error',
        description: 'Please select both start and end dates or choose "All till date"',
        variant: 'destructive',
      });
      return;
    }

    setDownloading('tds');
    try {
      const endpoint = tdsAllTillDate 
        ? `/api/reports/export-tds?allTillDate=true`
        : `/api/reports/export-tds?startDate=${tdsStartDate}&endDate=${tdsEndDate}`;
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
      a.download = tdsAllTillDate 
        ? `tds-report-all-till-date.xlsx`
        : `tds-report-${tdsStartDate}-to-${tdsEndDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Report Downloaded!',
        description: 'TDS Report has been downloaded successfully.',
        variant: 'success',
      });

      setShowTdsDialog(false);
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


  const handleSubscriptionsDownload = async () => {
    if (subscriptionsAllTillDate) {
      setDownloading('subscriptions');
      try {
        const endpoint = '/api/reports/export-subscriptions?allTillDate=true';
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
        a.download = `subscriptions-report-all-till-date.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Report Downloaded!',
          description: 'Subscriptions Report has been downloaded successfully.',
          variant: 'success',
        });

        setShowSubscriptionsDialog(false);
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
      return;
    }

    if (subscriptionsFilterType === 'month') {
      if (!subscriptionsMonth || !subscriptionsYear) {
        toast({
          title: 'Error',
          description: 'Please select both month and year',
          variant: 'destructive',
        });
        return;
      }

      setDownloading('subscriptions');
      try {
        const endpoint = `/api/reports/export-subscriptions?month=${subscriptionsMonth}&year=${subscriptionsYear}`;
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
        a.download = `subscriptions-report-${subscriptionsYear}-${subscriptionsMonth.padStart(2, '0')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Report Downloaded!',
          description: 'Subscriptions Report has been downloaded successfully.',
          variant: 'success',
        });

        setShowSubscriptionsDialog(false);
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
    } else if (subscriptionsFilterType === 'range') {
      if (!subscriptionsStartDate || !subscriptionsEndDate) {
        toast({
          title: 'Error',
          description: 'Please select both start and end dates',
          variant: 'destructive',
        });
        return;
      }

      setDownloading('subscriptions');
      try {
        const endpoint = `/api/reports/export-subscriptions?startDate=${subscriptionsStartDate}&endDate=${subscriptionsEndDate}`;
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
        a.download = `subscriptions-report-${subscriptionsStartDate}-to-${subscriptionsEndDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Report Downloaded!',
          description: 'Subscriptions Report has been downloaded successfully.',
          variant: 'success',
        });

        setShowSubscriptionsDialog(false);
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
    }
  };

  const handleFinancialDownload = async () => {
    if (financialAllTillDate) {
      setDownloading('financial');
      try {
        const endpoint = '/api/reports/export-financial?allTillDate=true';
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
        a.download = `financial-report-all-till-date.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Report Downloaded!',
          description: 'Financial Report has been downloaded successfully.',
          variant: 'success',
        });

        setShowFinancialDialog(false);
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
      return;
    }

    if (financialFilterType === 'month') {
      if (!financialMonth || !financialYear) {
        toast({
          title: 'Error',
          description: 'Please select both month and year',
          variant: 'destructive',
        });
        return;
      }

      setDownloading('financial');
      try {
        const endpoint = `/api/reports/export-financial?month=${financialMonth}&year=${financialYear}`;
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
        a.download = `financial-report-${financialYear}-${financialMonth.padStart(2, '0')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Report Downloaded!',
          description: 'Financial Report has been downloaded successfully.',
          variant: 'success',
        });

        setShowFinancialDialog(false);
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
    } else if (financialFilterType === 'range') {
      if (!financialStartDate || !financialEndDate) {
        toast({
          title: 'Error',
          description: 'Please select both start and end dates',
          variant: 'destructive',
        });
        return;
      }

      setDownloading('financial');
      try {
        const endpoint = `/api/reports/export-financial?startDate=${financialStartDate}&endDate=${financialEndDate}`;
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
        a.download = `financial-report-${financialStartDate}-to-${financialEndDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Report Downloaded!',
          description: 'Financial Report has been downloaded successfully.',
          variant: 'success',
        });

        setShowFinancialDialog(false);
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
    }
  };

  const handleActivityDownload = async () => {
    if (!activityAllTillDate && (!activityStartDate || !activityEndDate)) {
      toast({
        title: 'Error',
        description: 'Please select both start and end dates or choose "All till date"',
        variant: 'destructive',
      });
      return;
    }

    setDownloading('activity');
    try {
      const endpoint = activityAllTillDate
        ? '/api/reports/export-activity?allTillDate=true'
        : `/api/reports/export-activity?startDate=${activityStartDate}&endDate=${activityEndDate}`;
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
      a.download = activityAllTillDate
        ? `activity-report-all-till-date.xlsx`
        : `activity-report-${activityStartDate}-to-${activityEndDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Report Downloaded!',
        description: 'Activity Report has been downloaded successfully.',
        variant: 'success',
      });

      setShowActivityDialog(false);
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

  const handleReferralsDownload = async () => {
    if (!referralsAllTillDate && (!referralsStartDate || !referralsEndDate)) {
      toast({
        title: 'Error',
        description: 'Please select both start and end dates or choose "All till date"',
        variant: 'destructive',
      });
      return;
    }

    setDownloading('referrals');
    try {
      const endpoint = referralsAllTillDate
        ? '/api/reports/export-referrals?allTillDate=true'
        : `/api/reports/export-referrals?startDate=${referralsStartDate}&endDate=${referralsEndDate}`;
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
      a.download = referralsAllTillDate
        ? `referrals-report-all-till-date.xlsx`
        : `referrals-report-${referralsStartDate}-to-${referralsEndDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Report Downloaded!',
        description: 'Referrals Report has been downloaded successfully.',
        variant: 'success',
      });

      setShowReferralsDialog(false);
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

  const handleUsersDownload = async () => {
    if (usersAllTillDate) {
      setDownloading('users');
      try {
        const endpoint = '/api/reports/export-users?allTillDate=true';
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
        a.download = `users-report-all-till-date.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Report Downloaded!',
          description: 'Users Report has been downloaded successfully.',
          variant: 'success',
        });

        setShowUsersDialog(false);
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
      return;
    }

    if (usersFilterType === 'month') {
      if (!usersMonth || !usersYear) {
        toast({
          title: 'Error',
          description: 'Please select both month and year',
          variant: 'destructive',
        });
        return;
      }

      setDownloading('users');
      try {
        const endpoint = `/api/reports/export-users?month=${usersMonth}&year=${usersYear}`;
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
        a.download = `users-report-${usersYear}-${usersMonth.padStart(2, '0')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Report Downloaded!',
          description: 'Users Report has been downloaded successfully.',
          variant: 'success',
        });

        setShowUsersDialog(false);
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
    } else if (usersFilterType === 'range') {
      if (!usersStartDate || !usersEndDate) {
        toast({
          title: 'Error',
          description: 'Please select both start and end dates',
          variant: 'destructive',
        });
        return;
      }

      setDownloading('users');
      try {
        const endpoint = `/api/reports/export-users?startDate=${usersStartDate}&endDate=${usersEndDate}`;
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
        a.download = `users-report-${usersStartDate}-to-${usersEndDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Report Downloaded!',
          description: 'Users Report has been downloaded successfully.',
          variant: 'success',
        });

        setShowUsersDialog(false);
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
            <DialogTitle>Payout Report</DialogTitle>
            <DialogDescription>
              Select the month and year for the payout report
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

      {/* Individual User Payout PDF Dialog */}
      <Dialog open={showUserPayoutDialog} onOpenChange={setShowUserPayoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Individual Customer Payout Report</DialogTitle>
            <DialogDescription>
              Select a customer and month/year to generate their payout report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user">Customer *</Label>
              <SearchableUser
                value={userPayoutUserId}
                onValueChange={setUserPayoutUserId}
                placeholder="Search and select a customer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="month">Month *</Label>
              <Select value={userPayoutMonth} onValueChange={setUserPayoutMonth}>
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
              <Label htmlFor="year">Year *</Label>
              <Input
                id="year"
                type="number"
                value={userPayoutYear}
                onChange={(e) => setUserPayoutYear(e.target.value)}
                placeholder={currentYear.toString()}
                min="2020"
                max={currentYear + 5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserPayoutDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUserPayoutDownload} disabled={downloading === 'user-payout-pdf-monthly'}>
              {downloading === 'user-payout-pdf-monthly' ? 'Generating...' : 'Generate Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TDS Report Dialog */}
      <Dialog open={showTdsDialog} onOpenChange={setShowTdsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>TDS Amount Report</DialogTitle>
            <DialogDescription>
              Select the date range for the TDS report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="tdsAllTillDate"
                checked={tdsAllTillDate}
                onCheckedChange={(checked) => {
                  setTdsAllTillDate(checked as boolean);
                  if (checked) {
                    setTdsStartDate('');
                    setTdsEndDate('');
                  }
                }}
              />
              <Label htmlFor="tdsAllTillDate" className="cursor-pointer">
                All till date
              </Label>
            </div>
            {!tdsAllTillDate && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={tdsStartDate}
                    onChange={(e) => setTdsStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={tdsEndDate}
                    onChange={(e) => setTdsEndDate(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTdsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTdsDownload} disabled={downloading === 'tds'}>
              {downloading === 'tds' ? 'Generating...' : 'Generate Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscriptions Report Dialog */}
      <Dialog open={showSubscriptionsDialog} onOpenChange={setShowSubscriptionsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscriptions Report</DialogTitle>
            <DialogDescription>
              Select filtering options for the subscriptions report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="subscriptionsAllTillDate"
                checked={subscriptionsAllTillDate}
                onCheckedChange={(checked) => {
                  setSubscriptionsAllTillDate(checked as boolean);
                  if (checked) {
                    setSubscriptionsFilterType('all');
                  }
                }}
              />
              <Label htmlFor="subscriptionsAllTillDate" className="cursor-pointer">
                All till date
              </Label>
            </div>
            {!subscriptionsAllTillDate && (
              <>
                <div className="space-y-2">
                  <Label>Filter Type</Label>
                  <RadioGroup
                    value={subscriptionsFilterType}
                    onValueChange={(value) => setSubscriptionsFilterType(value as 'month' | 'range')}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="month" id="subscriptions-month" />
                      <Label htmlFor="subscriptions-month" className="cursor-pointer">Month & Year</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="range" id="subscriptions-range" />
                      <Label htmlFor="subscriptions-range" className="cursor-pointer">Date Range</Label>
                    </div>
                  </RadioGroup>
                </div>
                {subscriptionsFilterType === 'month' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="subscriptionsMonth">Month *</Label>
                      <Select value={subscriptionsMonth} onValueChange={setSubscriptionsMonth}>
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
                      <Label htmlFor="subscriptionsYear">Year *</Label>
                      <Input
                        id="subscriptionsYear"
                        type="number"
                        value={subscriptionsYear}
                        onChange={(e) => setSubscriptionsYear(e.target.value)}
                        placeholder={currentYear.toString()}
                        min="2020"
                        max={currentYear + 5}
                      />
                    </div>
                  </>
                )}
                {subscriptionsFilterType === 'range' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="subscriptionsStartDate">Start Date *</Label>
                      <Input
                        id="subscriptionsStartDate"
                        type="date"
                        value={subscriptionsStartDate}
                        onChange={(e) => setSubscriptionsStartDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subscriptionsEndDate">End Date *</Label>
                      <Input
                        id="subscriptionsEndDate"
                        type="date"
                        value={subscriptionsEndDate}
                        onChange={(e) => setSubscriptionsEndDate(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubscriptionsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubscriptionsDownload} disabled={downloading === 'subscriptions'}>
              {downloading === 'subscriptions' ? 'Generating...' : 'Generate Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Financial Report Dialog */}
      <Dialog open={showFinancialDialog} onOpenChange={setShowFinancialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Financial Report</DialogTitle>
            <DialogDescription>
              Select filtering options for the financial report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="financialAllTillDate"
                checked={financialAllTillDate}
                onCheckedChange={(checked) => {
                  setFinancialAllTillDate(checked as boolean);
                  if (checked) {
                    setFinancialFilterType('all');
                  }
                }}
              />
              <Label htmlFor="financialAllTillDate" className="cursor-pointer">
                All till date
              </Label>
            </div>
            {!financialAllTillDate && (
              <>
                <div className="space-y-2">
                  <Label>Filter Type</Label>
                  <RadioGroup
                    value={financialFilterType}
                    onValueChange={(value) => setFinancialFilterType(value as 'month' | 'range')}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="month" id="financial-month" />
                      <Label htmlFor="financial-month" className="cursor-pointer">Month & Year</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="range" id="financial-range" />
                      <Label htmlFor="financial-range" className="cursor-pointer">Date Range</Label>
                    </div>
                  </RadioGroup>
                </div>
                {financialFilterType === 'month' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="financialMonth">Month *</Label>
                      <Select value={financialMonth} onValueChange={setFinancialMonth}>
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
                      <Label htmlFor="financialYear">Year *</Label>
                      <Input
                        id="financialYear"
                        type="number"
                        value={financialYear}
                        onChange={(e) => setFinancialYear(e.target.value)}
                        placeholder={currentYear.toString()}
                        min="2020"
                        max={currentYear + 5}
                      />
                    </div>
                  </>
                )}
                {financialFilterType === 'range' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="financialStartDate">Start Date *</Label>
                      <Input
                        id="financialStartDate"
                        type="date"
                        value={financialStartDate}
                        onChange={(e) => setFinancialStartDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="financialEndDate">End Date *</Label>
                      <Input
                        id="financialEndDate"
                        type="date"
                        value={financialEndDate}
                        onChange={(e) => setFinancialEndDate(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinancialDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleFinancialDownload} disabled={downloading === 'financial'}>
              {downloading === 'financial' ? 'Generating...' : 'Generate Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Report Dialog */}
      <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activity Report</DialogTitle>
            <DialogDescription>
              Select the date range for the activity report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="activityAllTillDate"
                checked={activityAllTillDate}
                onCheckedChange={(checked) => {
                  setActivityAllTillDate(checked as boolean);
                  if (checked) {
                    setActivityStartDate('');
                    setActivityEndDate('');
                  }
                }}
              />
              <Label htmlFor="activityAllTillDate" className="cursor-pointer">
                All till date
              </Label>
            </div>
            {!activityAllTillDate && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="activityStartDate">Start Date *</Label>
                  <Input
                    id="activityStartDate"
                    type="date"
                    value={activityStartDate}
                    onChange={(e) => setActivityStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activityEndDate">End Date *</Label>
                  <Input
                    id="activityEndDate"
                    type="date"
                    value={activityEndDate}
                    onChange={(e) => setActivityEndDate(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivityDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleActivityDownload} disabled={downloading === 'activity'}>
              {downloading === 'activity' ? 'Generating...' : 'Generate Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Referrals Report Dialog */}
      <Dialog open={showReferralsDialog} onOpenChange={setShowReferralsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Referrals Report</DialogTitle>
            <DialogDescription>
              Select the date range for the referrals report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="referralsAllTillDate"
                checked={referralsAllTillDate}
                onCheckedChange={(checked) => {
                  setReferralsAllTillDate(checked as boolean);
                  if (checked) {
                    setReferralsStartDate('');
                    setReferralsEndDate('');
                  }
                }}
              />
              <Label htmlFor="referralsAllTillDate" className="cursor-pointer">
                All till date
              </Label>
            </div>
            {!referralsAllTillDate && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="referralsStartDate">Start Date *</Label>
                  <Input
                    id="referralsStartDate"
                    type="date"
                    value={referralsStartDate}
                    onChange={(e) => setReferralsStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referralsEndDate">End Date *</Label>
                  <Input
                    id="referralsEndDate"
                    type="date"
                    value={referralsEndDate}
                    onChange={(e) => setReferralsEndDate(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReferralsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReferralsDownload} disabled={downloading === 'referrals'}>
              {downloading === 'referrals' ? 'Generating...' : 'Generate Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Users Report Dialog */}
      <Dialog open={showUsersDialog} onOpenChange={setShowUsersDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Users Report</DialogTitle>
            <DialogDescription>
              Select filtering options for the users report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="usersAllTillDate"
                checked={usersAllTillDate}
                onCheckedChange={(checked) => {
                  setUsersAllTillDate(checked as boolean);
                  if (checked) {
                    setUsersFilterType('all');
                  }
                }}
              />
              <Label htmlFor="usersAllTillDate" className="cursor-pointer">
                All till date
              </Label>
            </div>
            {!usersAllTillDate && (
              <>
                <div className="space-y-2">
                  <Label>Filter Type</Label>
                  <RadioGroup
                    value={usersFilterType}
                    onValueChange={(value) => setUsersFilterType(value as 'month' | 'range')}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="month" id="users-month" />
                      <Label htmlFor="users-month" className="cursor-pointer">Month & Year</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="range" id="users-range" />
                      <Label htmlFor="users-range" className="cursor-pointer">Date Range</Label>
                    </div>
                  </RadioGroup>
                </div>
                {usersFilterType === 'month' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="usersMonth">Month *</Label>
                      <Select value={usersMonth} onValueChange={setUsersMonth}>
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
                      <Label htmlFor="usersYear">Year *</Label>
                      <Input
                        id="usersYear"
                        type="number"
                        value={usersYear}
                        onChange={(e) => setUsersYear(e.target.value)}
                        placeholder={currentYear.toString()}
                        min="2020"
                        max={currentYear + 5}
                      />
                    </div>
                  </>
                )}
                {usersFilterType === 'range' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="usersStartDate">Start Date *</Label>
                      <Input
                        id="usersStartDate"
                        type="date"
                        value={usersStartDate}
                        onChange={(e) => setUsersStartDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="usersEndDate">End Date *</Label>
                      <Input
                        id="usersEndDate"
                        type="date"
                        value={usersEndDate}
                        onChange={(e) => setUsersEndDate(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUsersDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUsersDownload} disabled={downloading === 'users'}>
              {downloading === 'users' ? 'Generating...' : 'Generate Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
