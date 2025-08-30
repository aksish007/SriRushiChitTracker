'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Users, CreditCard, TrendingUp, IndianRupee, Activity, Plus, FileText, Download, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  totalUsers: number;
  totalSubscriptions: number;
  totalPayouts: number;
  activeSchemes: number;
  monthlyData: Array<{ month: string; users: number; payouts: number }>;
  statusData: Array<{ name: string; value: number; color: string }>;
  userStats?: {
    mySubscriptions: number;
    myPayouts: number;
    nextPayoutDate?: string;
    totalEarned: number;
  };
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (token && user && !hasFetched.current) {
      hasFetched.current = true;
      
      const fetchDashboardStats = async () => {
        try {
          setLoading(true);
          
          // Fetch multiple endpoints for dashboard data
          const [usersResponse, subscriptionsResponse, payoutsResponse, schemesResponse] = await Promise.all([
            fetch('/api/users?limit=1000', {
              headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('/api/subscriptions', {
              headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('/api/payouts', {
              headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('/api/chit-schemes', {
              headers: { 'Authorization': `Bearer ${token}` }
            })
          ]);

          const [usersData, subscriptionsData, payoutsData, schemesData] = await Promise.all([
            usersResponse.json(),
            subscriptionsResponse.json(),
            payoutsResponse.json(),
            schemesResponse.json()
          ]);

          // Calculate stats
          const totalPayouts = payoutsData.payouts?.reduce((sum: number, payout: any) => 
            sum + (payout.status === 'PAID' ? Number(payout.amount) : 0), 0) || 0;

          // Calculate user-specific stats if not admin
          let userStats = undefined;
          if (user?.role !== 'ADMIN') {
            // Use userId if available, otherwise fall back to filtering by registrationId
            const mySubscriptions = subscriptionsData.subscriptions?.filter((s: any) => 
              s.userId === user?.id || s.user?.registrationId === user?.registrationId) || [];
            const myPayouts = payoutsData.payouts?.filter((p: any) => 
              p.userId === user?.id || p.user?.registrationId === user?.registrationId) || [];
            

            
            userStats = {
              mySubscriptions: mySubscriptions.length,
              myPayouts: myPayouts.filter((p: any) => p.status === 'PAID').length,
              totalEarned: myPayouts.reduce((sum: number, p: any) => 
                sum + (p.status === 'PAID' ? Number(p.amount) : 0), 0),
              nextPayoutDate: mySubscriptions.find((s: any) => s.status === 'ACTIVE')?.nextPayoutDate
            };
          }

          // Generate monthly data (mock data for demo)
          const monthlyData = [
            { month: 'Jan', users: 45, payouts: 125000 },
            { month: 'Feb', users: 52, payouts: 145000 },
            { month: 'Mar', users: 48, payouts: 135000 },
            { month: 'Apr', users: 61, payouts: 165000 },
            { month: 'May', users: 55, payouts: 155000 },
            { month: 'Jun', users: 67, payouts: 185000 },
          ];

          // Status data for pie chart
          const statusData = [
            { name: 'Active', value: subscriptionsData.subscriptions?.filter((s: any) => s.status === 'ACTIVE').length || 0, color: '#10b981' },
            { name: 'Completed', value: subscriptionsData.subscriptions?.filter((s: any) => s.status === 'COMPLETED').length || 0, color: '#3b82f6' },
            { name: 'Cancelled', value: subscriptionsData.subscriptions?.filter((s: any) => s.status === 'CANCELLED').length || 0, color: '#ef4444' },
          ];

          console.log('Dashboard data:', {
            subscriptions: subscriptionsData.subscriptions?.length || 0,
            statusData,
            userRole: user?.role
          });

          setStats({
            totalUsers: usersData.pagination?.total || 0,
            totalSubscriptions: subscriptionsData.subscriptions?.length || 0,
            totalPayouts,
            activeSchemes: schemesData.schemes?.filter((s: any) => s.isActive).length || 0,
            monthlyData,
            statusData,
            userStats,
          });
        } catch (error) {
          console.error('Error fetching dashboard stats:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchDashboardStats();
    }
  }, [token, user]);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'register':
        router.push('/dashboard/register');
        break;
      case 'scheme':
        router.push('/dashboard/chit-schemes');
        break;
      case 'payouts':
        router.push('/dashboard/payouts');
        break;
      case 'users':
        router.push('/dashboard/users');
        break;
      case 'bulk-upload':
        router.push('/dashboard/bulk-upload');
        break;
      case 'reports':
        router.push('/dashboard/reports');
        break;
      case 'subscriptions':
        router.push('/dashboard/subscriptions');
        break;
      case 'referral-tree':
        router.push('/dashboard/referral-tree');
        break;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-gradient-primary">Dashboard</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="shadow-glow">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-300 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient-primary">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName}! {user?.role === 'ADMIN' ? "Here's what's happening with your chit fund business." : "Here's your chit fund overview."}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>Registration ID: <span className="font-medium text-primary">{user?.registrationId}</span></p>
          <div>Role: <Badge variant={user?.role === 'ADMIN' ? 'default' : 'secondary'} className="bg-gradient-primary text-white">{user?.role}</Badge></div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {user?.role === 'ADMIN' ? (
          <>
            <StatsCard
              title="Total Users"
              value={stats?.totalUsers || 0}
              description="Registered members"
              icon={Users}
              trend={{ value: 12, isPositive: true }}
            />
            <StatsCard
              title="Active Subscriptions"
              value={stats?.totalSubscriptions || 0}
              description="Current chit subscriptions"
              icon={CreditCard}
              trend={{ value: 8, isPositive: true }}
            />
            <StatsCard
              title="Total Payouts"
              value={`₹${Number(stats?.totalPayouts || 0).toLocaleString()}`}
              description="Amount distributed"
              icon={IndianRupee}
              trend={{ value: 15, isPositive: true }}
            />
            <StatsCard
              title="Active Schemes"
              value={stats?.activeSchemes || 0}
              description="Running chit schemes"
              icon={Activity}
              trend={{ value: 3, isPositive: true }}
            />
          </>
        ) : (
          <>
            <StatsCard
              title="My Subscriptions"
              value={stats?.userStats?.mySubscriptions || 0}
              description="Active chit subscriptions"
              icon={CreditCard}
            />
            <StatsCard
              title="Total Earned"
              value={`₹${Number(stats?.userStats?.totalEarned || 0).toLocaleString()}`}
              description="Total payouts received"
              icon={IndianRupee}
            />
            <StatsCard
              title="Payouts Received"
              value={stats?.userStats?.myPayouts || 0}
              description="Successful payouts"
              icon={CheckCircle}
            />
            <StatsCard
              title="Next Payout"
              value={stats?.userStats?.nextPayoutDate ? new Date(stats.userStats.nextPayoutDate).toLocaleDateString() : 'N/A'}
              description="Expected payout date"
              icon={Calendar}
            />
          </>
        )}
      </div>

      {/* Charts - Only show for Admin */}
      {user?.role === 'ADMIN' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Monthly Activity Chart */}
          <Card className="shadow-glow-blue">
            <CardHeader className="bg-gradient-secondary text-white rounded-t-lg">
              <CardTitle className="text-white">Monthly Activity</CardTitle>
              <CardDescription className="text-blue-100">User registrations and payouts over time</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats?.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="users" fill="#d19d0d" name="New Users" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Subscription Status Chart */}
          <Card className="shadow-glow-green">
            <CardHeader className="bg-gradient-success text-white rounded-t-lg">
              <CardTitle className="text-white">Subscription Status</CardTitle>
              <CardDescription className="text-green-100">Distribution of subscription statuses</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {stats?.statusData && stats.statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <div className="text-center">
                    <p>No subscription data available</p>
                    <p className="text-sm">Create some subscriptions to see the chart</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      {user?.role === 'ADMIN' ? (
        <Card className="shadow-glow">
          <CardHeader className="bg-gradient-primary text-white rounded-t-lg">
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-yellow-100">Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2 hover:shadow-glow-blue transition-all duration-300 border-2 hover:border-blue-500 hover:scale-105"
                onClick={() => handleQuickAction('register')}
              >
                <Users className="h-8 w-8 text-blue-600" />
                <div className="text-center">
                  <h3 className="font-semibold">Register User</h3>
                  <p className="text-sm text-muted-foreground">Add new member</p>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2 hover:shadow-glow-green transition-all duration-300 border-2 hover:border-green-500 hover:scale-105"
                onClick={() => handleQuickAction('bulk-upload')}
              >
                <FileText className="h-8 w-8 text-green-600" />
                <div className="text-center">
                  <h3 className="font-semibold">Bulk Upload</h3>
                  <p className="text-sm text-muted-foreground">Upload users</p>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2 hover:shadow-glow transition-all duration-300 border-2 hover:border-yellow-500 hover:scale-105"
                onClick={() => handleQuickAction('scheme')}
              >
                <CreditCard className="h-8 w-8 text-yellow-600" />
                <div className="text-center">
                  <h3 className="font-semibold">Create Scheme</h3>
                  <p className="text-sm text-muted-foreground">New chit scheme</p>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2 hover:shadow-glow transition-all duration-300 border-2 hover:border-orange-500 hover:scale-105"
                onClick={() => handleQuickAction('payouts')}
              >
                <IndianRupee className="h-8 w-8 text-orange-600" />
                <div className="text-center">
                  <h3 className="font-semibold">Process Payouts</h3>
                  <p className="text-sm text-muted-foreground">Manage payments</p>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2 hover:shadow-glow-blue transition-all duration-300 border-2 hover:border-indigo-500 hover:scale-105"
                onClick={() => handleQuickAction('users')}
              >
                <Users className="h-8 w-8 text-indigo-600" />
                <div className="text-center">
                  <h3 className="font-semibold">Manage Users</h3>
                  <p className="text-sm text-muted-foreground">View all users</p>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2 hover:shadow-glow-green transition-all duration-300 border-2 hover:border-teal-500 hover:scale-105"
                onClick={() => handleQuickAction('subscriptions')}
              >
                <CreditCard className="h-8 w-8 text-teal-600" />
                <div className="text-center">
                  <h3 className="font-semibold">Subscriptions</h3>
                  <p className="text-sm text-muted-foreground">Manage subscriptions</p>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2 hover:shadow-glow transition-all duration-300 border-2 hover:border-pink-500 hover:scale-105"
                onClick={() => handleQuickAction('referral-tree')}
              >
                <TrendingUp className="h-8 w-8 text-pink-600" />
                <div className="text-center">
                  <h3 className="font-semibold">Referral Tree</h3>
                  <p className="text-sm text-muted-foreground">View network</p>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2 hover:shadow-glow transition-all duration-300 border-2 hover:border-red-500 hover:scale-105"
                onClick={() => handleQuickAction('reports')}
              >
                <Download className="h-8 w-8 text-red-600" />
                <div className="text-center">
                  <h3 className="font-semibold">Reports</h3>
                  <p className="text-sm text-muted-foreground">Download reports</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* User Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="My Subscriptions"
              value={stats?.userStats?.mySubscriptions || 0}
              description="Active chit subscriptions"
              icon={CreditCard}
              trend={{ value: 0, isPositive: true }}
            />
            <StatsCard
              title="Total Earned"
              value={`₹${Number(stats?.userStats?.totalEarned || 0).toLocaleString()}`}
              description="From completed payouts"
              icon={IndianRupee}
              trend={{ value: 0, isPositive: true }}
            />
            <StatsCard
              title="Completed Payouts"
              value={stats?.userStats?.myPayouts || 0}
              description="Successfully received"
              icon={CheckCircle}
              trend={{ value: 0, isPositive: true }}
            />
            <StatsCard
              title="Next Payout"
              value={stats?.userStats?.nextPayoutDate ? new Date(stats.userStats.nextPayoutDate).toLocaleDateString() : 'N/A'}
              description="Expected payment date"
              icon={Calendar}
              trend={{ value: 0, isPositive: true }}
            />
          </div>

          {/* User Subscription Status Chart */}
          {(stats?.userStats?.mySubscriptions || 0) > 0 && (
            <Card className="shadow-glow-green">
              <CardHeader className="bg-gradient-success text-white rounded-t-lg">
                <CardTitle className="text-white">My Subscription Status</CardTitle>
                <CardDescription className="text-green-100">Your subscription overview</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                                         <Pie
                       data={[
                         { name: 'Active', value: stats?.userStats?.mySubscriptions || 0, color: '#10b981' },
                         { name: 'Completed', value: 0, color: '#3b82f6' },
                         { name: 'Cancelled', value: 0, color: '#ef4444' },
                       ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#3b82f6" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-glow">
            <CardHeader className="bg-gradient-primary text-white rounded-t-lg">
              <CardTitle className="text-white">My Activities</CardTitle>
              <CardDescription className="text-yellow-100">Quick access to your chit fund activities</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col items-center gap-2 hover:shadow-glow-blue transition-all duration-300 border-2 hover:border-blue-500 hover:scale-105"
                  onClick={() => handleQuickAction('subscriptions')}
                >
                  <CreditCard className="h-8 w-8 text-blue-600" />
                  <div className="text-center">
                    <h3 className="font-semibold">My Subscriptions</h3>
                    <p className="text-sm text-muted-foreground">View my chits</p>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col items-center gap-2 hover:shadow-glow-green transition-all duration-300 border-2 hover:border-green-500 hover:scale-105"
                  onClick={() => handleQuickAction('payouts')}
                >
                  <IndianRupee className="h-8 w-8 text-green-600" />
                  <div className="text-center">
                    <h3 className="font-semibold">My Payouts</h3>
                    <p className="text-sm text-muted-foreground">Payment history</p>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col items-center gap-2 hover:shadow-glow transition-all duration-300 border-2 hover:border-purple-500 hover:scale-105"
                  onClick={() => handleQuickAction('referral-tree')}
                >
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                  <div className="text-center">
                    <h3 className="font-semibold">My Network</h3>
                    <p className="text-sm text-muted-foreground">Referral tree</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}