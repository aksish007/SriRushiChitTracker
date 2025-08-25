'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Users, CreditCard, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  totalUsers: number;
  totalSubscriptions: number;
  totalPayouts: number;
  activeSchemes: number;
  monthlyData: Array<{ month: string; users: number; payouts: number }>;
  statusData: Array<{ name: string; value: number; color: string }>;
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

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
        { name: 'Active Subscriptions', value: subscriptionsData.subscriptions?.filter((s: any) => s.status === 'ACTIVE').length || 0, color: '#10b981' },
        { name: 'Completed', value: subscriptionsData.subscriptions?.filter((s: any) => s.status === 'COMPLETED').length || 0, color: '#3b82f6' },
        { name: 'Cancelled', value: subscriptionsData.subscriptions?.filter((s: any) => s.status === 'CANCELLED').length || 0, color: '#ef4444' },
      ];

      setStats({
        totalUsers: usersData.pagination?.total || 0,
        totalSubscriptions: subscriptionsData.subscriptions?.length || 0,
        totalPayouts,
        activeSchemes: schemesData.schemes?.filter((s: any) => s.isActive).length || 0,
        monthlyData,
        statusData,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
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
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName}! Here's what's happening with your chit fund business.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>Registration ID: <span className="font-medium">{user?.registrationId}</span></p>
          <p>Role: <span className="font-medium">{user?.role}</span></p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          value={`₹${(stats?.totalPayouts || 0).toLocaleString()}`}
          description="Amount distributed"
          icon={DollarSign}
          trend={{ value: 15, isPositive: true }}
        />
        <StatsCard
          title="Active Schemes"
          value={stats?.activeSchemes || 0}
          description="Running chit schemes"
          icon={Activity}
          trend={{ value: 3, isPositive: true }}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Activity</CardTitle>
            <CardDescription>User registrations and payouts over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="#3b82f6" name="New Users" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subscription Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>Distribution of subscription statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats?.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {user?.role === 'ADMIN' && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <h3 className="font-semibold">Register New User</h3>
                  <p className="text-sm text-muted-foreground">Add a new member</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <h3 className="font-semibold">Create Chit Scheme</h3>
                  <p className="text-sm text-muted-foreground">Start new chit</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <h3 className="font-semibold">Process Payouts</h3>
                  <p className="text-sm text-muted-foreground">Manage payments</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}