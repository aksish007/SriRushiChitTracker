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
import { TrendingUp, Plus, Users, DollarSign, Calendar, Activity, Search, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface Subscription {
  id: string;
  subscriberId: string;
  userId: string;
  chitSchemeId: string;
  status: string;
  joinedAt: string;
  completedAt: string | null;
  createdAt: string;
  user: {
    registrationId: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  chitScheme: {
    chitId: string;
    name: string;
    amount: number;
    duration: number;
    totalSlots: number;
  };
  payouts: Array<{
    id: string;
    amount: number;
    month: number;
    year: number;
    status: string;
  }>;
}

interface User {
  id: string;
  registrationId: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ChitScheme {
  id: string;
  chitId: string;
  name: string;
  amount: number;
  totalSlots: number;
}

export default function SubscriptionsPage() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [schemes, setSchemes] = useState<ChitScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    userId: '',
    chitSchemeId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subscriptionsRes, usersRes, schemesRes] = await Promise.all([
        fetch('/api/subscriptions', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/users?limit=1000', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/chit-schemes', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (subscriptionsRes.ok) {
        const subscriptionsData = await subscriptionsRes.json();
        setSubscriptions(subscriptionsData.subscriptions);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users);
      }

      if (schemesRes.ok) {
        const schemesData = await schemesRes.json();
        setSchemes(schemesData.schemes);
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

    if (!formData.userId) {
      newErrors.userId = 'Please select a user';
    }

    if (!formData.chitSchemeId) {
      newErrors.chitSchemeId = 'Please select a chit scheme';
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
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success!',
          description: `Subscription created successfully for ${data.subscription.subscriberId}`,
        });
        
        setShowCreateDialog(false);
        resetForm();
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create subscription',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      chitSchemeId: '',
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
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPayoutStatusColor = (status: string) => {
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

  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = search === '' || 
      subscription.user.firstName.toLowerCase().includes(search.toLowerCase()) ||
      subscription.user.lastName.toLowerCase().includes(search.toLowerCase()) ||
      subscription.user.registrationId.toLowerCase().includes(search.toLowerCase()) ||
      subscription.subscriberId.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === '' || subscription.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
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
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground">
            Manage user subscriptions to chit fund schemes
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Subscription
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Subscription</DialogTitle>
                <DialogDescription>
                  Add a user to a chit fund scheme
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="userId">Select User *</Label>
                  <Select
                    value={formData.userId}
                    onValueChange={(value) => handleInputChange('userId', value)}
                  >
                    <SelectTrigger className={errors.userId ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Choose a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.registrationId} - {user.firstName} {user.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.userId && (
                    <p className="text-sm text-red-500">{errors.userId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chitSchemeId">Select Chit Scheme *</Label>
                  <Select
                    value={formData.chitSchemeId}
                    onValueChange={(value) => handleInputChange('chitSchemeId', value)}
                  >
                    <SelectTrigger className={errors.chitSchemeId ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Choose a scheme" />
                    </SelectTrigger>
                    <SelectContent>
                      {schemes.filter(scheme => scheme.isActive).map((scheme) => (
                        <SelectItem key={scheme.id} value={scheme.id}>
                          {scheme.chitId} - {scheme.name} (₹{scheme.amount.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.chitSchemeId && (
                    <p className="text-sm text-red-500">{errors.chitSchemeId}</p>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button type="submit" className="flex-1">
                    Create Subscription
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
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{subscriptions.length}</p>
                <p className="text-sm text-muted-foreground">Total Subscriptions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Activity className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {subscriptions.filter(s => s.status === 'ACTIVE').length}
                </p>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {new Set(subscriptions.map(s => s.userId)).size}
                </p>
                <p className="text-sm text-muted-foreground">Unique Users</p>
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
                  ₹{subscriptions.reduce((sum, sub) => sum + sub.chitScheme.amount, 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Value</p>
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
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, registration ID, or subscriber ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions ({filteredSubscriptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subscriber ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Chit Scheme</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payouts</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell className="font-mono text-sm">
                    {subscription.subscriberId}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {subscription.user.firstName} {subscription.user.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {subscription.user.registrationId}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{subscription.chitScheme.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {subscription.chitScheme.chitId}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      ₹{subscription.chitScheme.amount.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {subscription.chitScheme.duration} months
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(subscription.status)}>
                      {subscription.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {subscription.payouts.slice(0, 2).map((payout) => (
                        <div key={payout.id} className="flex items-center gap-2 text-sm">
                          <Badge className={getPayoutStatusColor(payout.status)}>
                            {payout.status}
                          </Badge>
                          <span className="text-xs">
                            {payout.month}/{payout.year}
                          </span>
                        </div>
                      ))}
                      {subscription.payouts.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{subscription.payouts.length - 2} more
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(subscription.joinedAt).toLocaleDateString()}
                    </div>
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
