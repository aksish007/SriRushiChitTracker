'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CreditCard, Plus, Users, IndianRupee, Calendar, Activity, Edit, Eye, Trash2, MoreHorizontal, Check, X, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface ChitScheme {
  id: string;
  chitId: string;
  name: string;
  amount: number;
  duration: number;
  totalSlots: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  subscriptions: Array<{
    id: string;
    subscriberId: string;
    status: string;
    user: {
      registrationId: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

export default function ChitSchemesPage() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [schemes, setSchemes] = useState<ChitScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedSchemes, setSelectedSchemes] = useState<string[]>([]);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<ChitScheme | null>(null);
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
  const [sortField, setSortField] = useState<'name' | 'amount' | 'duration' | 'totalSlots' | 'createdAt' | 'chitId'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    chitId: '',
    name: '',
    amount: '',
    duration: '',
    totalSlots: '',
    description: '',
  });
  const [editForm, setEditForm] = useState({
    chitId: '',
    name: '',
    amount: '',
    duration: '',
    totalSlots: '',
    description: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSchemes();
  }, [currentPage, pageSize, debouncedSearch, sortField, sortOrder, statusFilter]);

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        sortField: sortField,
        sortOrder: sortOrder,
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const response = await fetch(`/api/chit-schemes?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch schemes');

      const data = await response.json();
      setSchemes(data.schemes);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching schemes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chit schemes',
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

  const handleSort = (field: 'name' | 'amount' | 'duration' | 'totalSlots' | 'createdAt' | 'chitId') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: 'name' | 'amount' | 'duration' | 'totalSlots' | 'createdAt' | 'chitId') => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const handleSelectScheme = (schemeId: string, checked: boolean) => {
    if (checked) {
      setSelectedSchemes([...selectedSchemes, schemeId]);
    } else {
      setSelectedSchemes(selectedSchemes.filter(id => id !== schemeId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSchemes(schemes.map(scheme => scheme.id));
    } else {
      setSelectedSchemes([]);
    }
  };

  const handleViewScheme = (scheme: ChitScheme) => {
    setSelectedScheme(scheme);
    setShowViewDialog(true);
  };

  const handleEditScheme = (scheme: ChitScheme) => {
    setSelectedScheme(scheme);
    setEditForm({
      chitId: scheme.chitId,
      name: scheme.name,
      amount: scheme.amount.toString(),
      duration: scheme.duration.toString(),
      totalSlots: scheme.totalSlots.toString(),
      description: scheme.description || '',
      isActive: scheme.isActive,
    });
    setShowEditDialog(true);
  };

  const handleUpdateScheme = async () => {
    if (!selectedScheme) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/chit-schemes/${selectedScheme.id}`, {
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
          description: 'Chit scheme updated successfully',
        });
        setShowEditDialog(false);
        fetchSchemes();
      } else {
        throw new Error('Failed to update chit scheme');
      }
    } catch (error) {
      console.error('Error updating chit scheme:', error);
      toast({
        title: 'Error',
        description: 'Failed to update chit scheme',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteScheme = async (schemeId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/chit-schemes/${schemeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Chit scheme deleted successfully',
        });
        fetchSchemes();
      } else {
        throw new Error('Failed to delete chit scheme');
      }
    } catch (error) {
      console.error('Error deleting chit scheme:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete chit scheme',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/chit-schemes/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ schemeIds: selectedSchemes }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `${selectedSchemes.length} chit schemes deleted successfully`,
        });
        setSelectedSchemes([]);
        fetchSchemes();
      } else {
        throw new Error('Failed to delete chit schemes');
      }
    } catch (error) {
      console.error('Error deleting chit schemes:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete chit schemes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStatusUpdate = async (isActive: boolean) => {
    try {
      setLoading(true);
      const response = await fetch('/api/chit-schemes/bulk-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ schemeIds: selectedSchemes, isActive }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `${selectedSchemes.length} chit schemes ${isActive ? 'activated' : 'deactivated'} successfully`,
        });
        setSelectedSchemes([]);
        fetchSchemes();
      } else {
        throw new Error('Failed to update chit schemes');
      }
    } catch (error) {
      console.error('Error updating chit schemes:', error);
      toast({
        title: 'Error',
        description: 'Failed to update chit schemes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.chitId.trim()) {
      newErrors.chitId = 'Chit ID is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Scheme name is required';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.duration || parseInt(formData.duration) <= 0) {
      newErrors.duration = 'Duration must be greater than 0';
    }

    if (!formData.totalSlots || parseInt(formData.totalSlots) <= 0) {
      newErrors.totalSlots = 'Total slots must be greater than 0';
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
      const response = await fetch('/api/chit-schemes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          chitId: formData.chitId.trim(),
          name: formData.name.trim(),
          amount: parseFloat(formData.amount),
          duration: parseInt(formData.duration),
          totalSlots: parseInt(formData.totalSlots),
          description: formData.description.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success!',
          description: `Chit scheme ${data.scheme.chitId} has been created successfully.`,
        });
        
        setShowCreateDialog(false);
        resetForm();
        fetchSchemes();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create chit scheme',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating scheme:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      chitId: '',
      name: '',
      amount: '',
      duration: '',
      totalSlots: '',
      description: '',
    });
    setErrors({});
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-gradient-success text-white' 
      : 'bg-gradient-warning text-white';
  };

  const getSubscriptionStatusColor = (status: string) => {
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Chit Schemes</h1>
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
          <h1 className="text-3xl font-bold tracking-tight text-gradient-primary">Chit Schemes</h1>
          <p className="text-muted-foreground">
            {user?.role === 'ADMIN' 
              ? 'Manage chit fund schemes and their subscriptions'
              : 'View available chit fund schemes'
            }
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:shadow-glow transition-all duration-300">
                <Plus className="h-4 w-4 mr-2" />
                Create Scheme
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Chit Scheme</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new chit fund scheme
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="chitId">Chit ID *</Label>
                  <Input
                    id="chitId"
                    value={formData.chitId}
                    onChange={(e) => handleInputChange('chitId', e.target.value)}
                    placeholder="e.g., CHIT001"
                    className={errors.chitId ? 'border-red-500' : ''}
                  />
                  {errors.chitId && (
                    <p className="text-sm text-red-500">{errors.chitId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Scheme Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Monthly Saver Scheme"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    placeholder="50000"
                    className={errors.amount ? 'border-red-500' : ''}
                  />
                  {errors.amount && (
                    <p className="text-sm text-red-500">{errors.amount}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (months) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    placeholder="12"
                    className={errors.duration ? 'border-red-500' : ''}
                  />
                  {errors.duration && (
                    <p className="text-sm text-red-500">{errors.duration}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalSlots">Total Slots *</Label>
                  <Input
                    id="totalSlots"
                    type="number"
                    value={formData.totalSlots}
                    onChange={(e) => handleInputChange('totalSlots', e.target.value)}
                    placeholder="20"
                    className={errors.totalSlots ? 'border-red-500' : ''}
                  />
                  {errors.totalSlots && (
                    <p className="text-sm text-red-500">{errors.totalSlots}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the chit scheme..."
                  rows={3}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1">
                  Create Scheme
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
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gradient-primary">
                  {schemes.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Schemes</p>
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
                  {schemes.filter(s => s.isActive).length}
                </p>
                <p className="text-sm text-muted-foreground">Active Schemes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-glow border-2 border-primary/20 hover:shadow-glow-blue transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-secondary rounded-full">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gradient-secondary">
                  {schemes.reduce((sum, scheme) => sum + scheme.subscriptions.length, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Subscriptions</p>
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
                  ₹{schemes.reduce((sum, scheme) => sum + Number(scheme.amount), 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {selectedSchemes.length > 0 && user?.role === 'ADMIN' && (
        <Card className="shadow-glow border-2 border-primary/20">
          <CardHeader className="bg-gradient-primary text-white rounded-t-lg">
            <CardTitle className="text-white">Bulk Actions</CardTitle>
            <CardDescription className="text-yellow-100">
              {selectedSchemes.length} scheme(s) selected
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-primary">
                  {selectedSchemes.length} scheme(s) selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSchemes([])}
                  className="hover:bg-gradient-secondary hover:text-white hover:border-blue-500 transition-all duration-300"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate(true)}
                  className="hover:bg-gradient-success hover:text-white hover:border-green-500 transition-all duration-300"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Activate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate(false)}
                  className="hover:bg-gradient-warning hover:text-white hover:border-orange-500 transition-all duration-300"
                >
                  <X className="h-4 w-4 mr-2" />
                  Deactivate
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      className="hover:shadow-glow-red transition-all duration-300"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Chit Schemes</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedSchemes.length} chit scheme(s)? This action cannot be undone.
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

      {/* Search and Filters */}
      <Card className="shadow-glow border-2 border-primary/20">
        <CardHeader className="bg-gradient-secondary text-white rounded-t-lg">
          <CardTitle className="text-white">Search & Filters</CardTitle>
          <CardDescription className="text-blue-100">
            Find and filter chit schemes
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search schemes by name, chit ID..."
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
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Schemes Table */}
      <Card className="shadow-glow border-2 border-primary/20">
        <CardHeader className="bg-gradient-primary text-white rounded-t-lg">
          <CardTitle className="text-white">All Chit Schemes ({pagination.total})</CardTitle>
          <CardDescription className="text-yellow-100">
            Manage and monitor all chit fund schemes
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-primary text-white">
                  <TableHead className="w-12 text-white">
                    <Checkbox
                      checked={selectedSchemes.length === schemes.length && schemes.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-white">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 text-white hover:bg-white/20"
                      onClick={() => handleSort('chitId')}
                    >
                      Chit ID {getSortIcon('chitId')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-white">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 text-white hover:bg-white/20"
                      onClick={() => handleSort('name')}
                    >
                      Name {getSortIcon('name')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-white">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 text-white hover:bg-white/20"
                      onClick={() => handleSort('amount')}
                    >
                      Amount {getSortIcon('amount')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-white">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 text-white hover:bg-white/20"
                      onClick={() => handleSort('duration')}
                    >
                      Duration {getSortIcon('duration')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-white">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 text-white hover:bg-white/20"
                      onClick={() => handleSort('totalSlots')}
                    >
                      Slots {getSortIcon('totalSlots')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-white">Subscriptions</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 text-white hover:bg-white/20"
                      onClick={() => handleSort('createdAt')}
                    >
                      Created {getSortIcon('createdAt')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-12 text-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {schemes.map((scheme) => (
                <TableRow key={scheme.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedSchemes.includes(scheme.id)}
                      onCheckedChange={(checked) => handleSelectScheme(scheme.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {scheme.chitId}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{scheme.name}</div>
                      {scheme.description && (
                        <div className="text-sm text-muted-foreground">
                          {scheme.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      ₹{Number(scheme.amount).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{scheme.duration} months</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-center">
                      <div className="font-medium">{scheme.subscriptions.length}</div>
                      <div className="text-xs text-muted-foreground">
                        / {scheme.totalSlots}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {scheme.subscriptions.slice(0, 2).map((sub) => (
                        <div key={sub.id} className="flex items-center gap-2 text-sm">
                          <Badge className={getSubscriptionStatusColor(sub.status)}>
                            {sub.status}
                          </Badge>
                          <span className="font-mono text-xs">
                            {sub.subscriberId}
                          </span>
                        </div>
                      ))}
                      {scheme.subscriptions.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{scheme.subscriptions.length - 2} more
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(scheme.isActive)}>
                      {scheme.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(scheme.createdAt).toLocaleDateString()}
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
                        <DropdownMenuItem onClick={() => handleViewScheme(scheme)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        {user?.role === 'ADMIN' && (
                          <>
                            <DropdownMenuItem onClick={() => handleEditScheme(scheme)}>
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
                              <AlertDialogTitle>Delete Chit Scheme</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {scheme.name}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteScheme(scheme.id)}>
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
          
          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            </div>
          )}
        </div>

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

      {/* View Scheme Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chit Scheme Details</DialogTitle>
            <DialogDescription>
              View detailed information about the chit scheme
            </DialogDescription>
          </DialogHeader>
          {selectedScheme && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Chit ID</Label>
                  <p className="font-mono text-sm">{selectedScheme.chitId}</p>
                </div>
                <div>
                  <Label>Name</Label>
                  <p>{selectedScheme.name}</p>
                </div>
                <div>
                  <Label>Amount</Label>
                  <p>₹{Number(selectedScheme.amount).toLocaleString()}</p>
                </div>
                <div>
                  <Label>Duration</Label>
                  <p>{selectedScheme.duration} months</p>
                </div>
                <div>
                  <Label>Total Slots</Label>
                  <p>{selectedScheme.totalSlots}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selectedScheme.isActive)}>
                    {selectedScheme.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              {selectedScheme.description && (
                <div>
                  <Label>Description</Label>
                  <p className="text-sm">{selectedScheme.description}</p>
                </div>
              )}
              <div>
                <Label>Created Date</Label>
                <p>{new Date(selectedScheme.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <Label>Subscriptions ({selectedScheme.subscriptions.length})</Label>
                <div className="space-y-2 mt-2">
                  {selectedScheme.subscriptions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium">{sub.user.firstName} {sub.user.lastName}</span>
                        <span className="text-sm text-muted-foreground ml-2">({sub.subscriberId})</span>
                      </div>
                      <Badge className={getSubscriptionStatusColor(sub.status)}>
                        {sub.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Scheme Dialog */}
      {user?.role === 'ADMIN' && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Chit Scheme</DialogTitle>
            <DialogDescription>
              Update chit scheme information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-chitId">Chit ID *</Label>
                <Input
                  id="edit-chitId"
                  value={editForm.chitId}
                  onChange={(e) => setEditForm({ ...editForm, chitId: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-name">Scheme Name *</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-amount">Amount (₹) *</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-duration">Duration (months) *</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  value={editForm.duration}
                  onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-totalSlots">Total Slots *</Label>
                <Input
                  id="edit-totalSlots"
                  type="number"
                  value={editForm.totalSlots}
                  onChange={(e) => setEditForm({ ...editForm, totalSlots: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-isActive">Status</Label>
                <Select value={editForm.isActive.toString()} onValueChange={(value) => setEditForm({ ...editForm, isActive: value === 'true' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Optional description of the scheme"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateScheme}>
              Update Scheme
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
