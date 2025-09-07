'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableUser } from '@/components/ui/searchable-user';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';


export default function RegisterUserPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
    referredBy: 'none',
    // Nominee details
    nomineeName: '',
    nomineeRelation: '',
    nomineeAge: '',
    nomineeDateOfBirth: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});


  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          address: formData.address.trim() || undefined,
          password: formData.password,
          referredBy: formData.referredBy === 'none' ? undefined : formData.referredBy,
          // Nominee details
          nominee: {
            name: formData.nomineeName.trim() || undefined,
            relation: formData.nomineeRelation.trim() || undefined,
            age: formData.nomineeAge ? parseInt(formData.nomineeAge) : undefined,
            dateOfBirth: formData.nomineeDateOfBirth || undefined,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success!',
          description: `User ${data.user.registrationId} has been registered successfully.`,
          variant: 'success',
        });
        
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: '',
          password: '',
          confirmPassword: '',
          referredBy: 'none',
          // Nominee details
          nomineeName: '',
          nomineeRelation: '',
          nomineeAge: '',
          nomineeDateOfBirth: '',
        });
        setErrors({});
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to register user',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error registering user:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/users">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Register New User</h1>
          <p className="text-muted-foreground">
            Add a new member to the chit fund system
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Registration Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                User Information
              </CardTitle>
              <CardDescription>
                Fill in the details to register a new user
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="Enter first name"
                      className={errors.firstName ? 'border-red-500' : ''}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Enter last name"
                      className={errors.lastName ? 'border-red-500' : ''}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter email address (optional)"
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Enter 10-digit phone number"
                      className={errors.phone ? 'border-red-500' : ''}
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Enter address (optional)"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referredBy">Referred By</Label>
                  <SearchableUser
                    value={formData.referredBy}
                    onValueChange={(value) => handleInputChange('referredBy', value)}
                    placeholder="Select referrer (optional)"
                    showNoOption={true}
                    noOptionLabel="No referrer"
                    noOptionValue="none"
                    showReferralCount={true}
                  />
                </div>

                {/* Nominee Details Section */}
                <div className="space-y-4 border-t pt-6">
                  <div>
                    <h3 className="text-lg font-medium">Nominee Details</h3>
                    <p className="text-sm text-muted-foreground">
                      Information about the person who will receive benefits in case of any eventuality
                    </p>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nomineeName">Nominee Name</Label>
                      <Input
                        id="nomineeName"
                        value={formData.nomineeName}
                        onChange={(e) => handleInputChange('nomineeName', e.target.value)}
                        placeholder="Enter nominee's full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nomineeRelation">Relation with Applicant</Label>
                      <Select
                        value={formData.nomineeRelation}
                        onValueChange={(value) => handleInputChange('nomineeRelation', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="son">Son</SelectItem>
                          <SelectItem value="daughter">Daughter</SelectItem>
                          <SelectItem value="father">Father</SelectItem>
                          <SelectItem value="mother">Mother</SelectItem>
                          <SelectItem value="brother">Brother</SelectItem>
                          <SelectItem value="sister">Sister</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nomineeAge">Age</Label>
                      <Input
                        id="nomineeAge"
                        type="number"
                        min="0"
                        max="120"
                        value={formData.nomineeAge}
                        onChange={(e) => handleInputChange('nomineeAge', e.target.value)}
                        placeholder="Enter age"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nomineeDateOfBirth">Date of Birth</Label>
                      <Input
                        id="nomineeDateOfBirth"
                        type="date"
                        value={formData.nomineeDateOfBirth}
                        onChange={(e) => handleInputChange('nomineeDateOfBirth', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Enter password"
                      className={errors.password ? 'border-red-500' : ''}
                    />
                    {errors.password && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="Confirm password"
                      className={errors.confirmPassword ? 'border-red-500' : ''}
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Registering...' : 'Register User'}
                  </Button>
                  <Link href="/dashboard/users">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Information Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Registration Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>User will get a unique Registration ID</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Phone number must be unique</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Email address is optional</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Default role will be set to USER</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>User will be marked as active</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Referral system supports up to 3 direct referrals</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Nominee details are optional but recommended</span>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
