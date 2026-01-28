'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { SearchableUser } from '@/components/ui/searchable-user';
import Link from 'next/link';


export default function RegisterUserPage() {
  const { makeAuthenticatedRequest, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    aadharNumber: '',
    panNumber: '',
    password: '',
    confirmPassword: '',
    referredBy: 'none',
    // Nominee details
    nomineeName: '',
    nomineeRelation: '',
    nomineeAge: '',
    nomineeDateOfBirth: '',
    guardian: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


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

    if (formData.aadharNumber.trim() && !/^\d{12}$/.test(formData.aadharNumber.replace(/\D/g, ''))) {
      newErrors.aadharNumber = 'Aadhar number must be exactly 12 digits';
    }

    if (formData.panNumber.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber.trim().toUpperCase())) {
      newErrors.panNumber = 'PAN number must be in format ABCDE1234F';
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
      const response = await makeAuthenticatedRequest('/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          address: formData.address.trim() || undefined,
          aadharNumber: formData.aadharNumber.trim() || undefined,
          panNumber: formData.panNumber.trim() || undefined,
          password: formData.password,
          referredBy: user?.role === 'ADMIN' ? (formData.referredBy === 'none' ? undefined : formData.referredBy) : undefined,
          // Nominee details
          nominee: {
            name: formData.nomineeName.trim() || undefined,
            relation: formData.nomineeRelation.trim() || undefined,
            age: formData.nomineeAge ? parseInt(formData.nomineeAge) : undefined,
            dateOfBirth: formData.nomineeDateOfBirth || undefined,
            guardian: formData.guardian.trim() || undefined,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const isAdmin = user?.role === 'ADMIN';
        toast({
          title: 'Success!',
          description: isAdmin 
            ? `User ${data.user.registrationId} has been registered successfully.`
            : `User ${data.user.registrationId} has been registered and is pending admin approval.`,
          variant: 'success',
        });
        
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: '',
          aadharNumber: '',
          panNumber: '',
          password: '',
          confirmPassword: '',
          referredBy: 'none',
          // Nominee details
          nomineeName: '',
          nomineeRelation: '',
          nomineeAge: '',
          nomineeDateOfBirth: '',
          guardian: '',
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
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Real-time validation for Aadhar
    if (field === 'aadharNumber' && value.trim()) {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length > 0 && cleaned.length !== 12) {
        setErrors(prev => ({ ...prev, aadharNumber: 'Aadhar number must be exactly 12 digits' }));
      } else if (cleaned.length === 12) {
        setErrors(prev => ({ ...prev, aadharNumber: '' }));
      }
    }
    
    // Real-time validation for PAN
    if (field === 'panNumber' && value.trim()) {
      const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (cleaned.length > 0 && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleaned)) {
        if (cleaned.length < 10) {
          setErrors(prev => ({ ...prev, panNumber: 'PAN number must be 10 characters (e.g., ABCDE1234F)' }));
        } else {
          setErrors(prev => ({ ...prev, panNumber: 'Invalid PAN format. Must be ABCDE1234F (5 letters, 4 digits, 1 letter)' }));
        }
      } else if (cleaned.length === 10 && /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleaned)) {
        setErrors(prev => ({ ...prev, panNumber: '' }));
      }
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

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="aadharNumber">Aadhar Number</Label>
                    <Input
                      id="aadharNumber"
                      type="text"
                      inputMode="numeric"
                      value={formData.aadharNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                        handleInputChange('aadharNumber', value);
                      }}
                      onBlur={() => {
                        if (formData.aadharNumber.trim() && formData.aadharNumber.replace(/\D/g, '').length !== 12) {
                          setErrors(prev => ({ ...prev, aadharNumber: 'Aadhar number must be exactly 12 digits' }));
                        }
                      }}
                      placeholder="Enter 12-digit Aadhar number (optional)"
                      className={errors.aadharNumber ? 'border-red-500' : ''}
                    />
                    {errors.aadharNumber && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.aadharNumber}
                      </p>
                    )}
                    {!errors.aadharNumber && formData.aadharNumber.trim() && formData.aadharNumber.replace(/\D/g, '').length === 12 && (
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Valid Aadhar number
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="panNumber">PAN Number</Label>
                    <Input
                      id="panNumber"
                      type="text"
                      value={formData.panNumber}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                        handleInputChange('panNumber', value);
                      }}
                      onBlur={() => {
                        if (formData.panNumber.trim()) {
                          const cleaned = formData.panNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
                          if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleaned)) {
                            if (cleaned.length < 10) {
                              setErrors(prev => ({ ...prev, panNumber: 'PAN number must be 10 characters (e.g., ABCDE1234F)' }));
                            } else {
                              setErrors(prev => ({ ...prev, panNumber: 'Invalid PAN format. Must be ABCDE1234F (5 letters, 4 digits, 1 letter)' }));
                            }
                          }
                        }
                      }}
                      placeholder="Enter PAN number (e.g., ABCDE1234F)"
                      className={errors.panNumber ? 'border-red-500' : ''}
                      style={{ textTransform: 'uppercase' }}
                    />
                    {errors.panNumber && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.panNumber}
                      </p>
                    )}
                    {!errors.panNumber && formData.panNumber.trim() && /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber.toUpperCase().replace(/[^A-Z0-9]/g, '')) && (
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Valid PAN number
                      </p>
                    )}
                  </div>
                </div>

                {user?.role === 'ADMIN' ? (
                  <div className="space-y-2">
                    <Label htmlFor="referredBy">Referred By</Label>
                    <SearchableUser
                      value={formData.referredBy}
                      onValueChange={(value) => handleInputChange('referredBy', value)}
                      placeholder="Select referrer (optional)"
                      showNoOption={true}
                      noOptionLabel="None"
                      noOptionValue="none"
                      showReferralCount={true}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Referred By</Label>
                    <div className="p-3 bg-muted rounded-md border">
                      <p className="text-sm font-medium">
                        {user?.firstName} {user?.lastName} ({user?.registrationId})
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        You will be listed as the referrer for this registration
                      </p>
                    </div>
                  </div>
                )}

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
                          <SelectItem value="father">Guardian</SelectItem>
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

                  <div className="space-y-2">
                    <Label htmlFor="guardian">Guardian</Label>
                    <Input
                      id="guardian"
                      value={formData.guardian}
                      onChange={(e) => handleInputChange('guardian', e.target.value)}
                      placeholder="Enter guardian's name (optional)"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        placeholder="Enter password"
                        className={`${errors.password ? 'border-red-500' : ''} pr-10`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-primary"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        placeholder="Confirm password"
                        className={`${errors.confirmPassword ? 'border-red-500' : ''} pr-10`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-primary"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
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
              {user?.role === 'ADMIN' ? (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>User will be marked as active immediately</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>You can select a referrer or leave it as None</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span>User will be marked as inactive until admin approval</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Referrer is automatically set to your account</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Admin will review and approve the registration</span>
                  </div>
                </>
              )}
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
