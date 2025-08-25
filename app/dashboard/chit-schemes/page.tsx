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
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Plus, Users, DollarSign, Calendar, Activity, Edit, Eye } from 'lucide-react';
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
  const { token } = useAuth();
  const { toast } = useToast();
  const [schemes, setSchemes] = useState<ChitScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    chitId: '',
    name: '',
    amount: '',
    duration: '',
    totalSlots: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSchemes();
  }, []);

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/chit-schemes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch schemes');

      const data = await response.json();
      setSchemes(data.schemes);
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
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chit Schemes</h1>
          <p className="text-muted-foreground">
            Manage chit fund schemes and their subscriptions
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
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
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CreditCard className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{schemes.length}</p>
                <p className="text-sm text-muted-foreground">Total Schemes</p>
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
                  {schemes.filter(s => s.isActive).length}
                </p>
                <p className="text-sm text-muted-foreground">Active Schemes</p>
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
                  {schemes.reduce((sum, scheme) => sum + scheme.subscriptions.length, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Subscriptions</p>
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
                  ₹{schemes.reduce((sum, scheme) => sum + scheme.amount, 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schemes Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Chit Schemes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chit ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Slots</TableHead>
                <TableHead>Subscriptions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schemes.map((scheme) => (
                <TableRow key={scheme.id}>
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
                      ₹{scheme.amount.toLocaleString()}
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
