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
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, DollarSign, Calendar, Activity, Search, Filter, CheckCircle, Clock } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [formData, setFormData] = useState({
    subscriptionId: '',
    amount: '',
    month: '',
    year: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [payoutsRes, subscriptionsRes] = await Promise.all([
        fetch('/api/payouts', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/subscriptions', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (payoutsRes.ok) {
        const payoutsData = await payoutsRes.json();
        setPayouts(payoutsData.payouts);
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
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
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
    const matchesSearch = search === '' || 
      payout.user.firstName.toLowerCase().includes(search.toLowerCase()) ||
      payout.user.lastName.toLowerCase().includes(search.toLowerCase()) ||
      payout.user.registrationId.toLowerCase().includes(search.toLowerCase()) ||
      payout.subscription.subscriberId.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === '' || payout.status === statusFilter;
    const matchesMonth = monthFilter === '' || payout.month.toString() === monthFilter;
    const matchesYear = yearFilter === '' || payout.year.toString() === yearFilter;
    
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payouts</h1>
          <p className="text-muted-foreground">
            Manage payouts for chit fund subscriptions
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{payouts.length}</p>
                <p className="text-sm text-muted-foreground">Total Payouts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {payouts.filter(p => p.status === 'PAID').length}
                </p>
                <p className="text-sm text-muted-foreground">Paid Payouts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">
                  {payouts.filter(p => p.status === 'PENDING').length}
                </p>
                <p className="text-sm text-muted-foreground">Pending Payouts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  ₹{payouts.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Amount</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Input
                placeholder="Search by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Months</SelectItem>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <SelectItem key={month} value={month.toString()}>
                    {getMonthName(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Years</SelectItem>
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

      {/* Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Payouts ({filteredPayouts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Month/Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayouts.map((payout) => (
                <TableRow key={payout.id}>
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
                      ₹{payout.amount.toLocaleString()}
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
                        onClick={() => markAsPaid(payout.id)}
                        className="h-8"
                      >
                        Mark Paid
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
