'use client';

import { useState, useEffect } from 'react';
import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SearchableUser } from '@/components/ui/searchable-user';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { User, Lock, Eye, EyeOff, Calendar, Phone, Mail, MapPin, Users, RefreshCw } from 'lucide-react';

export default function ProfilePage() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [referralCount, setReferralCount] = useState<number>(0);
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [updatingReferrer, setUpdatingReferrer] = useState(false);
  const [selectedReferrer, setSelectedReferrer] = useState<string>('');
  const [userReferrer, setUserReferrer] = useState<{ id: string; registrationId: string; firstName: string; lastName: string } | null>(null);
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Fetch user referral count and referrer info
  const fetchReferralInfo = async () => {
    if (!user?.id || !token) return;
    
    setLoadingReferral(true);
    try {
      // Fetch referral count
      const countResponse = await fetch(`/api/users/${user.id}/referral-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (countResponse.ok) {
        const countData = await countResponse.json();
        setReferralCount(countData.directReferralCount || 0);
      }

      // Fetch user details with referrer - try the update-referrer endpoint or check if user can access their own data
      // Since GET /api/users/[id] requires ADMIN, we'll fetch from a different source or check the user object
      // For now, let's check if user.referredBy exists in the auth context or fetch it differently
      // Actually, we can use the referral-count endpoint which allows users to view their own data
      // But it doesn't return referrer info. Let's check the user object from auth context first
      
      // Check if user has referrer info in auth context (might not be there)
      // We'll need to make a separate call or modify the approach
      // For now, let's set it based on whether we can determine it
      // We'll handle this by checking the user's referredBy field if available
      
      // Since regular users can't access /api/users/[id], we'll need to handle this differently
      // Let's check if the user object from auth has referrer info, or we'll need a new endpoint
      // For now, we'll set it to empty and let the user update it
      setUserReferrer(null);
      setSelectedReferrer('');
    } catch (error) {
      console.error('Error fetching referral info:', error);
    } finally {
      setLoadingReferral(false);
    }
  };

  // Fetch referral info on mount
  React.useEffect(() => {
    if (user?.id) {
      fetchReferralInfo();
    }
  }, [user?.id, token]);

  const handleUpdateReferrer = async () => {
    if (!user?.id || !token) return;

    setUpdatingReferrer(true);
    try {
      const referrerId = selectedReferrer === 'self' ? user.id : (selectedReferrer || null);
      
      const response = await fetch(`/api/users/${user.id}/update-referrer`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          referredBy: referrerId
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Update referrer info from response
        if (data.user?.referrer) {
          setUserReferrer(data.user.referrer);
          setSelectedReferrer(data.user.referrer.id);
        } else if (referrerId === user.id) {
          // Self-referral - set referrer to self
          setUserReferrer({
            id: user.id,
            registrationId: user.registrationId,
            firstName: user.firstName,
            lastName: user.lastName
          });
          setSelectedReferrer('self');
        } else {
          setUserReferrer(null);
          setSelectedReferrer('');
        }
        
        toast({
          title: "Success",
          description: referrerId === user.id ? "Self-referral updated successfully" : referrerId ? "Referrer updated successfully" : "Referrer cleared successfully",
          variant: 'success',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update referrer',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while updating referrer',
        variant: 'destructive',
      });
    } finally {
      setUpdatingReferrer(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Validation Error',
        description: 'New passwords do not match',
        variant: 'warning',
      });
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: 'Validation Error',
        description: 'New password must be at least 6 characters long',
        variant: 'warning',
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Password changed successfully",
          variant: 'success',
        });
        
        // Reset form
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to change password',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while changing password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-gradient-primary">Profile</h1>
        </div>
        <Card className="shadow-glow">
          <CardContent className="p-6">
            <p className="text-muted-foreground">Loading profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gradient-primary">Profile</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <Card className="shadow-glow border-2 border-primary/20">
          <CardHeader className="bg-gradient-primary text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-white">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription className="text-yellow-100">
              Your personal and account details
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                  <p className="font-medium">{user.firstName} {user.lastName}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="font-medium">{user.phone || 'Not provided'}</p>
                </div>
              </div>
              
              {user.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p className="font-medium">{user.address}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Registration ID</p>
                  <p className="font-medium font-mono">{user.registrationId}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge className="bg-gradient-primary text-white">
                  {user.role}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="shadow-glow border-2 border-primary/20">
          <CardHeader className="bg-gradient-secondary text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-white">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription className="text-blue-100">
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-primary font-medium">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 pr-10"
                    placeholder="Enter current password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-primary"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-primary font-medium">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 pr-10"
                    placeholder="Enter new password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-primary"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-primary font-medium">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 pr-10"
                    placeholder="Confirm new password"
                    required
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
              </div>
              
              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Changing Password...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Lock className="h-4 w-4 mr-2" />
                    Change Password
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Referrer Management */}
        <Card className="shadow-glow border-2 border-primary/20">
          <CardHeader className="bg-gradient-primary text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5" />
              Referrer Management
            </CardTitle>
            <CardDescription className="text-yellow-100">
              Manage your referral relationship
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {loadingReferral ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-primary font-medium">Current Referrer</Label>
                  {userReferrer ? (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="font-medium">{userReferrer.firstName} {userReferrer.lastName}</p>
                      <p className="text-sm text-muted-foreground font-mono">{userReferrer.registrationId}</p>
                      {(userReferrer.id === user.id || selectedReferrer === 'self') && (
                        <Badge className="mt-2 bg-blue-100 text-blue-800">Self-Referral</Badge>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-muted-foreground">
                      No referrer assigned
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-primary font-medium">Your Referrals</Label>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="font-medium text-lg">{referralCount}</p>
                    <p className="text-sm text-muted-foreground">direct referrals</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-primary font-medium">Change Referrer</Label>
                  <SearchableUser
                    value={selectedReferrer}
                    onValueChange={setSelectedReferrer}
                    placeholder="Select a referrer or choose self-referral"
                    showNoOption={true}
                    noOptionLabel="Clear Referrer"
                    noOptionValue=""
                  />
                  
                  {referralCount >= 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => setSelectedReferrer('self')}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Set Self-Referral
                    </Button>
                  )}

                  {referralCount < 1 && (
                    <Alert>
                      <AlertDescription className="text-sm">
                        You need at least one referral before you can self-refer.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <Button
                  type="button"
                  className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                  onClick={handleUpdateReferrer}
                  disabled={updatingReferrer || loadingReferral}
                >
                  {updatingReferrer ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Update Referrer
                    </div>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
