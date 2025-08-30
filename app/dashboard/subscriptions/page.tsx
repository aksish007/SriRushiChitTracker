'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Plus, Users, IndianRupee, Calendar, Activity, Search, Filter, Edit, Trash2, Eye, MoreHorizontal, Check, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
  isActive: boolean;
}

interface SubscriptionsResponse {
  subscriptions: Subscription[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [chitIdFilter, setChitIdFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<string[]>([]);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
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
  const [sortField, setSortField] = useState<'status' | 'joinedAt' | 'createdAt' | 'userName' | 'schemeName'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Form states
  const [formData, setFormData] = useState({
    userId: '',
    chitSchemeId: '',
  });
  const [editForm, setEditForm] = useState({
    status: '',
  });
  const [bulkImportData, setBulkImportData] = useState({
    userId: '',
    subscriberIds: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, [currentPage, debouncedSearch, statusFilter, chitIdFilter, pageSize, sortField, sortOrder]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(chitIdFilter !== 'all' && { chitId: chitIdFilter }),
        sortField: sortField,
        sortOrder: sortOrder,
      });

      const [subscriptionsRes, usersRes, schemesRes] = await Promise.all([
        fetch(`/api/subscriptions?${params}`, {
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
        const subscriptionsData: SubscriptionsResponse = await subscriptionsRes.json();
        setSubscriptions(subscriptionsData.subscriptions);
        setPagination(subscriptionsData.pagination);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users);
      }

      if (schemesRes.ok) {
        const schemesData = await schemesRes.json();
        setSchemes(schemesData.schemes.filter((scheme: ChitScheme) => scheme.isActive));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
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

  const handleChitIdFilter = (value: string) => {
    setChitIdFilter(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setChitIdFilter('all');
    setSearchInput('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  const handleSort = (field: 'status' | 'joinedAt' | 'createdAt' | 'userName' | 'schemeName') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: 'status' | 'joinedAt' | 'createdAt' | 'userName' | 'schemeName') => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const handleSelectSubscription = (subscriptionId: string, checked: boolean) => {
    if (checked) {
      setSelectedSubscriptions([...selectedSubscriptions, subscriptionId]);
    } else {
      setSelectedSubscriptions(selectedSubscriptions.filter(id => id !== subscriptionId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSubscriptions(subscriptions.map(sub => sub.id));
    } else {
      setSelectedSubscriptions([]);
    }
  };

  const handleViewSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowViewDialog(true);
  };

  const handleEditSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setEditForm({
      status: subscription.status,
    });
    setShowEditDialog(true);
  };

  const handleUpdateSubscription = async () => {
    if (!selectedSubscription) return;

    try {
      const response = await fetch(`/api/subscriptions/${selectedSubscription.id}`, {
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
          description: 'Subscription updated successfully',
        });
        setShowEditDialog(false);
        fetchData();
      } else {
        throw new Error('Failed to update subscription');
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to update subscription',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Subscription deleted successfully',
        });
        fetchData();
      } else {
        throw new Error('Failed to delete subscription');
      }
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete subscription',
        variant: 'destructive',
      });
    }
  };

  const handleBulkImport = async () => {
    try {
      // Parse subscriber IDs from text area
      const subscriberIds = bulkImportData.subscriberIds
        .split('\n')
        .map(id => id.trim())
        .filter(id => id.length > 0);

      if (subscriberIds.length === 0) {
        toast({
          title: 'Error',
          description: 'Please enter at least one subscriber ID',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch('/api/subscriptions/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: bulkImportData.userId,
          subscriberIds,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Successfully imported ${result.success} subscriptions${result.errors > 0 ? ` with ${result.errors} errors` : ''}`,
        });
        setShowBulkImportDialog(false);
        setBulkImportData({ userId: '', subscriberIds: '' });
        fetchData();
      } else {
        throw new Error(result.error || 'Failed to import subscriptions');
      }
    } catch (error) {
      console.error('Error importing subscriptions:', error);
      toast({
        title: 'Error',
        description: 'Failed to import subscriptions',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      const response = await fetch('/api/subscriptions/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ subscriptionIds: selectedSubscriptions }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `${selectedSubscriptions.length} subscriptions deleted successfully`,
        });
        setSelectedSubscriptions([]);
        fetchData();
      } else {
        throw new Error('Failed to delete subscriptions');
      }
    } catch (error) {
      console.error('Error deleting subscriptions:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete subscriptions',
        variant: 'destructive',
      });
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    try {
      const response = await fetch('/api/subscriptions/bulk-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ subscriptionIds: selectedSubscriptions, status }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `${selectedSubscriptions.length} subscriptions updated to ${status}`,
        });
        setSelectedSubscriptions([]);
        fetchData();
      } else {
        throw new Error('Failed to update subscriptions');
      }
    } catch (error) {
      console.error('Error updating subscriptions:', error);
      toast({
        title: 'Error',
        description: 'Failed to update subscriptions',
        variant: 'destructive',
      });
    }
  };

  const handleCreateSubscription = async () => {
    // Reset errors
    setErrors({});

    // Validate form
    const newErrors: Record<string, string> = {};
    if (!formData.userId) newErrors.userId = 'User is required';
    if (!formData.chitSchemeId) newErrors.chitSchemeId = 'Chit scheme is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
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

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Success',
          description: `Subscription created successfully for ${data.subscription.subscriberId}`,
        });
        setShowCreateDialog(false);
        setFormData({ userId: '', chitSchemeId: '' });
        fetchData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subscription');
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create subscription',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-gradient-success text-white';
      case 'COMPLETED':
        return 'bg-gradient-secondary text-white';
      case 'CANCELLED':
        return 'bg-gradient-danger text-white';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPayoutStatusColor = (status: string) => {
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold tracking-tight text-gradient-primary">Subscriptions</h1>
          <p className="text-muted-foreground">
            {user?.role === 'ADMIN' 
              ? 'Manage chit fund subscriptions and track member participation'
              : 'View your chit fund subscriptions'
            }
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowBulkImportDialog(true)}
              variant="outline"
              className="hover:shadow-glow transition-all duration-300"
            >
              <Users className="h-4 w-4 mr-2" />
              Bulk Import
            </Button>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Subscription
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-glow border-2 border-primary/20 hover:shadow-glow-blue transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-full">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gradient-primary">
                  {subscriptions.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Subscriptions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-glow border-2 border-primary/20 hover:shadow-glow-green transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-success rounded-full">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gradient-success">
                  {subscriptions.filter(s => s.status === 'ACTIVE').length}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-glow border-2 border-primary/20 hover:shadow-glow-blue transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-secondary rounded-full">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gradient-secondary">
                  {subscriptions.filter(s => s.status === 'COMPLETED').length}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-glow border-2 border-primary/20 hover:shadow-glow-green transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-warning rounded-full">
                <IndianRupee className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gradient-warning">
                  ₹{subscriptions.reduce((sum, sub) => sum + Number(sub.chitScheme.amount), 0).toLocaleString()}
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
                <form onSubmit={handleSearchSubmit} className="relative flex">
                  <Input
                    placeholder="Search by name, registration ID, or subscriber ID..."
                    value={searchInput}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pr-20"
                  />
                  <Button 
                    type="submit" 
                    size="sm" 
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 px-3"
                  >
                    Search
                  </Button>
                </form>
              </div>
            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
              <SelectTrigger className="w-32">
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
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={chitIdFilter} onValueChange={handleChitIdFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by chit ID" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chit Schemes</SelectItem>
                {schemes.map((scheme) => (
                  <SelectItem key={scheme.id} value={scheme.chitId}>
                    {scheme.chitId} - {scheme.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearFilters}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedSubscriptions.length > 0 && user?.role === 'ADMIN' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedSubscriptions.length} subscription(s) selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSubscriptions([])}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate('ACTIVE')}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Activate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate('COMPLETED')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Complete
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
                      <AlertDialogTitle>Delete Subscriptions</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedSubscriptions.length} subscription(s)? This action cannot be undone.
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

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedSubscriptions.length === subscriptions.length && subscriptions.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Subscriber ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Chit Scheme</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payouts</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedSubscriptions.includes(subscription.id)}
                      onCheckedChange={(checked) => handleSelectSubscription(subscription.id, checked as boolean)}
                    />
                  </TableCell>
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
                      ₹{Number(subscription.chitScheme.amount).toLocaleString()}
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
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewSubscription(subscription)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        {user?.role === 'ADMIN' && (
                          <>
                            <DropdownMenuItem onClick={() => handleEditSubscription(subscription)}>
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
                              <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this subscription? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteSubscription(subscription.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.pages > 1 && (
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

      {/* Create Subscription Dialog */}
      {user?.role === 'ADMIN' && (
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Subscription</DialogTitle>
            <DialogDescription>
              Add a new subscription to a chit scheme
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="userId">User *</Label>
              <Select value={formData.userId} onValueChange={(value) => setFormData({ ...formData, userId: value })}>
                <SelectTrigger className={errors.userId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a user" />
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
            <div>
              <Label htmlFor="chitSchemeId">Chit Scheme *</Label>
              <Select value={formData.chitSchemeId} onValueChange={(value) => setFormData({ ...formData, chitSchemeId: value })}>
                <SelectTrigger className={errors.chitSchemeId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a chit scheme" />
                </SelectTrigger>
                <SelectContent>
                  {schemes.filter(scheme => scheme.isActive).map((scheme) => (
                    <SelectItem key={scheme.id} value={scheme.id}>
                      {scheme.chitId} - {scheme.name} (₹{Number(scheme.amount).toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.chitSchemeId && (
                <p className="text-sm text-red-500">{errors.chitSchemeId}</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubscription}>
              Create Subscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* View Subscription Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
            <DialogDescription>
              View detailed information about the subscription
            </DialogDescription>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Subscriber ID</Label>
                  <p className="font-mono text-sm">{selectedSubscription.subscriberId}</p>
                </div>
                <div>
                  <Label>User</Label>
                  <p>{selectedSubscription.user.firstName} {selectedSubscription.user.lastName}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p>{selectedSubscription.user.email}</p>
                </div>
                <div>
                  <Label>Registration ID</Label>
                  <p className="font-mono text-sm">{selectedSubscription.user.registrationId}</p>
                </div>
                <div>
                  <Label>Chit Scheme</Label>
                  <p>{selectedSubscription.chitScheme.name} ({selectedSubscription.chitScheme.chitId})</p>
                </div>
                <div>
                  <Label>Amount</Label>
                  <p>₹{Number(selectedSubscription.chitScheme.amount).toLocaleString()}</p>
                </div>
                <div>
                  <Label>Duration</Label>
                  <p>{selectedSubscription.chitScheme.duration} months</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selectedSubscription.status)}>
                    {selectedSubscription.status}
                  </Badge>
                </div>
              </div>
              <div>
                <Label>Joined Date</Label>
                <p>{new Date(selectedSubscription.joinedAt).toLocaleDateString()}</p>
              </div>
              {selectedSubscription.completedAt && (
                <div>
                  <Label>Completed Date</Label>
                  <p>{new Date(selectedSubscription.completedAt).toLocaleDateString()}</p>
                </div>
              )}
              <div>
                <Label>Payouts ({selectedSubscription.payouts.length})</Label>
                <div className="space-y-2 mt-2">
                  {selectedSubscription.payouts.map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium">₹{Number(payout.amount).toLocaleString()}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {payout.month}/{payout.year}
                        </span>
                      </div>
                      <Badge className={getPayoutStatusColor(payout.status)}>
                        {payout.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Dialog */}
      {user?.role === 'ADMIN' && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Subscription</DialogTitle>
              <DialogDescription>
                Update subscription status
              </DialogDescription>
            </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSubscription}>
              Update Subscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Bulk Import Dialog */}
      {user?.role === 'ADMIN' && (
        <Dialog open={showBulkImportDialog} onOpenChange={setShowBulkImportDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Bulk Import Subscriptions</DialogTitle>
            <DialogDescription>
              Import multiple subscriptions using subscriber IDs in SRC format (e.g., SRC01NS/04, SRC03MC/22)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="userId">User *</Label>
              <Select value={bulkImportData.userId} onValueChange={(value) => setBulkImportData({ ...bulkImportData, userId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.registrationId} - {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subscriberIds">Subscriber IDs *</Label>
              <Textarea
                id="subscriberIds"
                value={bulkImportData.subscriberIds}
                onChange={(e) => setBulkImportData({ ...bulkImportData, subscriberIds: e.target.value })}
                placeholder="Enter subscriber IDs, one per line:&#10;SRC01NS/04&#10;SRC03MC/22&#10;SRC05CM/05"
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Format: SRCXXYY/ZZ where XX=2-digit number, YY=2-3 letter code, ZZ=2-digit number
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowBulkImportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkImport}>
              Import Subscriptions
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
