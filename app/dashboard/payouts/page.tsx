'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileText, Plus, IndianRupee, Calendar, Activity, Search, Filter, CheckCircle, Clock, Edit, Trash2, Eye, MoreHorizontal, Check, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface Payout {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  month: number;
  year: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
  user: {
    registrationId: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  subscription: {
    subscriberId: string;
    chitScheme: {
      chitId: string;
      name: string;
      amount: number;
    };
  };
}

interface Subscription {
  id: string;
  subscriberId: string;
  status: string;
  user: {
    registrationId: string;
    firstName: string;
    lastName: string;
  };
  chitScheme: {
    chitId: string;
    name: string;
    amount: number;
  };
}

export default function PayoutsPage() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showMarkPaidDialog, setShowMarkPaidDialog] = useState(false);
  const [payoutToMarkPaid, setPayoutToMarkPaid] = useState<string | null>(null);
  const [showBulkMarkPaidDialog, setShowBulkMarkPaidDialog] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Sorting state
  const [sortField, setSortField] = useState<'amount' | 'month' | 'year' | 'status' | 'createdAt' | 'paidAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [formData, setFormData] = useState({
    subscriptionId: '',
    amount: '',
    month: '',
    year: '',
  });
  const [editForm, setEditForm] = useState({
    amount: '',
    month: '',
    year: '',
    status: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, [currentPage, debouncedSearch, statusFilter, monthFilter, yearFilter, pageSize, sortField, sortOrder]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(monthFilter !== 'all' && { month: monthFilter }),
        ...(yearFilter !== 'all' && { year: yearFilter }),
        sortField: sortField,
        sortOrder: sortOrder,
      });

      const [payoutsRes, subscriptionsRes] = await Promise.all([
        fetch(`/api/payouts?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/subscriptions', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (payoutsRes.ok) {
        const payoutsData = await payoutsRes.json();
        setPayouts(payoutsData.payouts);
        setPagination(payoutsData.pagination);
      }

      if (subscriptionsRes.ok) {
        const subscriptionsData = await subscriptionsRes.json();
        setSubscriptions(subscriptionsData.subscriptions);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Only search when explicitly triggered, not automatically

  const handleSearch = (value: string) => {
    setSearchInput(value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(searchInput);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleMonthFilter = (value: string) => {
    setMonthFilter(value);
    setCurrentPage(1);
  };

  const handleYearFilter = (value: string) => {
    setYearFilter(value);
    setCurrentPage(1);
  };

  const handleSort = (field: 'amount' | 'month' | 'year' | 'status' | 'createdAt' | 'paidAt') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: 'amount' | 'month' | 'year' | 'status' | 'createdAt' | 'paidAt') => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const handleSelectPayout = (payoutId: string, checked: boolean) => {
    if (checked) {
      setSelectedPayouts([...selectedPayouts, payoutId]);
    } else {
      setSelectedPayouts(selectedPayouts.filter(id => id !== payoutId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPayouts(payouts.map(payout => payout.id));
    } else {
      setSelectedPayouts([]);
    }
  };

  const handleViewPayout = (payout: Payout) => {
    setSelectedPayout(payout);
    setShowViewDialog(true);
  };

  const handleEditPayout = (payout: Payout) => {
    setSelectedPayout(payout);
    setEditForm({
      amount: payout.amount.toString(),
      month: payout.month.toString(),
      year: payout.year.toString(),
      status: payout.status,
    });
    setShowEditDialog(true);
  };

  const handleUpdatePayout = async () => {
    if (!selectedPayout) return;

    try {
      const response = await fetch(`/api/payouts/${selectedPayout.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Payout updated successfully',
        });
        setShowEditDialog(false);
        fetchData();
      } else {
        throw new Error('Failed to update payout');
      }
    } catch (error) {
      console.error('Error updating payout:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payout',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePayout = async (payoutId: string) => {
    try {
      const response = await fetch(`/api/payouts/${payoutId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Payout deleted successfully',
        });
        fetchData();
      } else {
        throw new Error('Failed to delete payout');
      }
    } catch (error) {
      console.error('Error deleting payout:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete payout',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      const response = await fetch('/api/payouts/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ payoutIds: selectedPayouts }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `${selectedPayouts.length} payouts deleted successfully`,
        });
        setSelectedPayouts([]);
        fetchData();
      } else {
        throw new Error('Failed to delete payouts');
      }
    } catch (error) {
      console.error('Error deleting payouts:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete payouts',
        variant: 'destructive',
      });
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    try {
      const response = await fetch('/api/payouts/bulk-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ payoutIds: selectedPayouts, status }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `${selectedPayouts.length} payouts updated to ${status}`,
        });
        setSelectedPayouts([]);
        fetchData();
      } else {
        throw new Error('Failed to update payouts');
      }
    } catch (error) {
      console.error('Error updating payouts:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payouts',
        variant: 'destructive',
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.subscriptionId) {
      newErrors.subscriptionId = 'Please select a subscription';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.month || parseInt(formData.month) < 1 || parseInt(formData.month) > 12) {
      newErrors.month = 'Month must be between 1 and 12';
    }

    if (!formData.year || parseInt(formData.year) < 2020) {
      newErrors.year = 'Please enter a valid year';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const response = await fetch('/api/payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          subscriptionId: formData.subscriptionId,
          amount: parseFloat(formData.amount),
          month: parseInt(formData.month),
          year: parseInt(formData.year),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success!',
          description: `Payout created successfully for ${data.payout.subscription.subscriberId}`,
        });
        
        setShowCreateDialog(false);
        resetForm();
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create payout',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating payout:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleMarkPaidClick = (payoutId: string) => {
    setPayoutToMarkPaid(payoutId);
    setShowMarkPaidDialog(true);
  };

  const markAsPaid = async (payoutId: string) => {
    try {
      const response = await fetch(`/api/payouts/${payoutId}/mark-paid`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Success!',
          description: 'Payout marked as paid successfully',
        });
        setShowMarkPaidDialog(false);
        setPayoutToMarkPaid(null);
        fetchData();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to mark payout as paid',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error marking payout as paid:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      subscriptionId: '',
      amount: '',
      month: '',
      year: '',
    });
    setErrors({});
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-gradient-success text-white';
      case 'PENDING':
        return 'bg-gradient-warning text-white';
      case 'CANCELLED':
        return 'bg-gradient-danger text-white';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  const filteredPayouts = payouts.filter(payout => {
    const searchLower = debouncedSearch.toLowerCase();
    const matchesSearch = debouncedSearch === '' || 
      payout.user.firstName.toLowerCase().includes(searchLower) ||
      payout.user.lastName.toLowerCase().includes(searchLower) ||
      payout.user.registrationId.toLowerCase().includes(searchLower) ||
      payout.subscription.subscriberId.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === '' || statusFilter === 'all' || payout.status === statusFilter;
    const matchesMonth = monthFilter === '' || monthFilter === 'all' || payout.month.toString() === monthFilter;
    const matchesYear = yearFilter === '' || yearFilter === 'all' || payout.year.toString() === yearFilter;
    
    return matchesSearch && matchesStatus && matchesMonth && matchesYear;
  });

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Payouts</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient-primary">Payouts</h1>
          <p className="text-muted-foreground">
            Manage payouts for chit fund subscriptions
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:shadow-glow transition-all duration-300">
                <Plus className="h-4 w-4 mr-2" />
                Create Payout
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Payout</DialogTitle>
                <DialogDescription>
                  Create a payout for a subscription
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subscriptionId">Select Subscription *</Label>
                  <Select
                    value={formData.subscriptionId}
                    onValueChange={(value) => handleInputChange('subscriptionId', value)}
                  >
                    <SelectTrigger className={errors.subscriptionId ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Choose a subscription" />
                    </SelectTrigger>
                    <SelectContent>
                      {subscriptions.filter(sub => sub.status === 'ACTIVE').map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.subscriberId} - {sub.user.firstName} {sub.user.lastName} ({sub.chitScheme.chitId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.subscriptionId && (
                    <p className="text-sm text-red-500">{errors.subscriptionId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    placeholder="5000"
                    className={errors.amount ? 'border-red-500' : ''}
                  />
                  {errors.amount && (
                    <p className="text-sm text-red-500">{errors.amount}</p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="month">Month *</Label>
                    <Select
                      value={formData.month}
                      onValueChange={(value) => handleInputChange('month', value)}
                    >
                      <SelectTrigger className={errors.month ? 'border-red-500' : ''}>
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
                    {errors.month && (
                      <p className="text-sm text-red-500">{errors.month}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">Year *</Label>
                    <Input
                      id="year"
                      type="number"
                      value={formData.year}
                      onChange={(e) => handleInputChange('year', e.target.value)}
                      placeholder={currentYear.toString()}
                      min="2020"
                      max={currentYear + 5}
                      className={errors.year ? 'border-red-500' : ''}
                    />
                    {errors.year && (
                      <p className="text-sm text-red-500">{errors.year}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button type="submit" className="flex-1">
                    Create Payout
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateDialog(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-glow border-2 border-primary/20 hover:shadow-glow-blue transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-full">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gradient-primary">
                  {payouts.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Payouts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-glow border-2 border-primary/20 hover:shadow-glow-green transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-success rounded-full">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gradient-success">
                  {payouts.filter(p => p.status === 'PAID').length}
                </p>
                <p className="text-sm text-muted-foreground">Paid Payouts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-glow border-2 border-primary/20 hover:shadow-glow-blue transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-warning rounded-full">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gradient-warning">
                  {payouts.filter(p => p.status === 'PENDING').length}
                </p>
                <p className="text-sm text-muted-foreground">Pending Payouts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-glow border-2 border-primary/20 hover:shadow-glow-green transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-secondary rounded-full">
                <IndianRupee className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gradient-secondary">
                  ₹{payouts.reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Amount</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-glow border-2 border-primary/20">
        <CardHeader className="bg-gradient-secondary text-white rounded-t-lg">
          <CardTitle className="text-white">Search & Filters</CardTitle>
          <CardDescription className="text-blue-100">
            Find and filter payouts
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name or ID..."
                  value={searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <Button type="submit" className="bg-gradient-primary hover:shadow-glow transition-all duration-300">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </form>
            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
              <SelectTrigger className="w-32 border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 rows</SelectItem>
                <SelectItem value="10">10 rows</SelectItem>
                <SelectItem value="20">20 rows</SelectItem>
                <SelectItem value="50">50 rows</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-32 border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={handleMonthFilter}>
              <SelectTrigger className="w-32 border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <SelectItem key={month} value={month.toString()}>
                    {getMonthName(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={handleYearFilter}>
              <SelectTrigger className="w-32 border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedPayouts.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedPayouts.length} payout(s) selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPayouts([])}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkMarkPaidDialog(true)}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark Paid
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate('PENDING')}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Mark Pending
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate('CANCELLED')}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Payouts</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedPayouts.length} payout(s)? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Payouts ({filteredPayouts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedPayouts.length === payouts.length && payouts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Month/Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-24">Mark Paid</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayouts.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedPayouts.includes(payout.id)}
                      onCheckedChange={(checked) => handleSelectPayout(payout.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {payout.user.firstName} {payout.user.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {payout.user.registrationId}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{payout.subscription.chitScheme.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {payout.subscription.subscriberId}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      ₹{Number(payout.amount).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{getMonthName(payout.month)} {payout.year}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(payout.status)}>
                      {payout.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    {payout.status === 'PENDING' && user?.role === 'ADMIN' && (
                      <Button
                        size="sm"
                        onClick={() => handleMarkPaidClick(payout.id)}
                        className="h-8 w-full"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark Paid
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewPayout(payout)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditPayout(payout)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Payout</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this payout? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletePayout(payout.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          className={currentPage === page ? 'bg-primary text-primary-foreground' : 'cursor-pointer'}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                      className={currentPage === pagination.pages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Payout Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payout Details</DialogTitle>
            <DialogDescription>
              View detailed information about the payout
            </DialogDescription>
          </DialogHeader>
          {selectedPayout && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>User</Label>
                  <p>{selectedPayout.user.firstName} {selectedPayout.user.lastName}</p>
                </div>
                <div>
                  <Label>Registration ID</Label>
                  <p className="font-mono text-sm">{selectedPayout.user.registrationId}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p>{selectedPayout.user.email}</p>
                </div>
                <div>
                  <Label>Amount</Label>
                  <p>₹{Number(selectedPayout.amount).toLocaleString()}</p>
                </div>
                <div>
                  <Label>Month/Year</Label>
                  <p>{getMonthName(selectedPayout.month)} {selectedPayout.year}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selectedPayout.status)}>
                    {selectedPayout.status}
                  </Badge>
                </div>
              </div>
              <div>
                <Label>Subscription</Label>
                <p>{selectedPayout.subscription.chitScheme.name} ({selectedPayout.subscription.subscriberId})</p>
              </div>
              <div>
                <Label>Created Date</Label>
                <p>{new Date(selectedPayout.createdAt).toLocaleDateString()}</p>
              </div>
              {selectedPayout.paidAt && (
                <div>
                  <Label>Paid Date</Label>
                  <p>{new Date(selectedPayout.paidAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Payout Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Payout</DialogTitle>
            <DialogDescription>
              Update payout information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="month">Month</Label>
              <Select value={editForm.month} onValueChange={(value) => setEditForm({ ...editForm, month: value })}>
                <SelectTrigger>
                  <SelectValue />
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
            <div>
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={editForm.year}
                onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePayout}>
              Update Payout
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Confirmation Dialog */}
      <AlertDialog open={showMarkPaidDialog} onOpenChange={setShowMarkPaidDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Mark as Paid</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this payout as paid? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowMarkPaidDialog(false);
              setPayoutToMarkPaid(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => payoutToMarkPaid && markAsPaid(payoutToMarkPaid)}>
              Mark as Paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Mark as Paid Confirmation Dialog */}
      <AlertDialog open={showBulkMarkPaidDialog} onOpenChange={setShowBulkMarkPaidDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Mark as Paid</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark {selectedPayouts.length} payout(s) as paid? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowBulkMarkPaidDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              handleBulkStatusUpdate('PAID');
              setShowBulkMarkPaidDialog(false);
            }}>
              Mark as Paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
