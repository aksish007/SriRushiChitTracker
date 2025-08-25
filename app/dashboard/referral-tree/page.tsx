'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PieChart, Users, Search, TreePine, UserCheck, IndianRupee, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface ReferralNode {
  id: string;
  registrationId: string;
  firstName: string;
  lastName: string;
  email: string;
  level: number;
  children: ReferralNode[];
  subscriptionsCount: number;
  totalPayouts: number;
}

interface User {
  id: string;
  registrationId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function ReferralTreePage() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [referralTree, setReferralTree] = useState<ReferralNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchReferralTree(selectedUser);
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        
        // Auto-select current user if they're not admin
        if (user?.role !== 'ADMIN' && user?.registrationId) {
          setSelectedUser(user.registrationId);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchReferralTree = async (registrationId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/referral-tree/${registrationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReferralTree(data.tree);
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to load referral tree',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching referral tree:', error);
      toast({
        title: 'Error',
        description: 'Failed to load referral tree',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.firstName.toLowerCase().includes(search.toLowerCase()) ||
    user.lastName.toLowerCase().includes(search.toLowerCase()) ||
    user.registrationId.toLowerCase().includes(search.toLowerCase())
  );

  const renderTreeNode = (node: ReferralNode, level: number = 0) => {
    const maxWidth = Math.max(200, 300 - level * 20);
    
    return (
      <div key={node.id} className="flex flex-col items-center">
        <Card className={`w-full max-w-[${maxWidth}px] mb-4 ${level > 0 ? 'border-l-2 border-blue-200' : ''}`}>
          <CardContent className="p-4">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <h3 className="font-semibold text-sm">
                  {node.firstName} {node.lastName}
                </h3>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {node.registrationId}
              </div>
              <div className="flex items-center justify-center gap-1 text-xs">
                <Badge variant="outline" className="text-xs">
                  Level {node.level}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-medium text-blue-600">{node.subscriptionsCount}</div>
                  <div className="text-muted-foreground">Subscriptions</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-green-600">₹{Number(node.totalPayouts).toLocaleString()}</div>
                  <div className="text-muted-foreground">Payouts</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {node.children.length > 0 && (
          <div className="relative">
            <div className="absolute top-0 left-1/2 w-px h-4 bg-blue-200 transform -translate-x-1/2"></div>
            <div className="grid grid-cols-1 gap-4 mt-4">
              {node.children.map((child, index) => (
                <div key={child.id} className="relative">
                  {index < node.children.length - 1 && (
                    <div className="absolute top-1/2 left-0 w-full h-px bg-blue-200 transform -translate-y-1/2"></div>
                  )}
                  {renderTreeNode(child, level + 1)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const getTreeStats = (node: ReferralNode) => {
    let totalMembers = 1;
    let totalSubscriptions = node.subscriptionsCount;
    let totalPayouts = node.totalPayouts;
    let maxLevel = node.level;

    const traverse = (n: ReferralNode) => {
      totalMembers += n.children.length;
      totalSubscriptions += n.subscriptionsCount;
      totalPayouts += n.totalPayouts;
      maxLevel = Math.max(maxLevel, n.level);
      
      n.children.forEach(traverse);
    };

    traverse(node);
    return { totalMembers, totalSubscriptions, totalPayouts, maxLevel };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Referral Tree</h1>
          <p className="text-muted-foreground">
            Visualize the referral network and hierarchy
          </p>
        </div>
      </div>

      {/* User Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TreePine className="h-5 w-5" />
            Select User
          </CardTitle>
          <CardDescription>
            Choose a user to view their referral tree
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Select a user to view referral tree" />
              </SelectTrigger>
              <SelectContent>
                {filteredUsers.map((user) => (
                  <SelectItem key={user.id} value={user.registrationId}>
                    {user.registrationId} - {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="p-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading referral tree...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && referralTree && (
        <>
          {/* Tree Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            {(() => {
              const stats = getTreeStats(referralTree);
              return (
                <>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <Users className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold">{stats.totalMembers}</p>
                          <p className="text-sm text-muted-foreground">Total Members</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <Activity className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold">{stats.totalSubscriptions}</p>
                          <p className="text-sm text-muted-foreground">Total Subscriptions</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <IndianRupee className="h-8 w-8 text-orange-600" />
                        <div>
                          <p className="text-2xl font-bold">₹{Number(stats.totalPayouts).toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">Total Payouts</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <TreePine className="h-8 w-8 text-purple-600" />
                        <div>
                          <p className="text-2xl font-bold">{stats.maxLevel}</p>
                          <p className="text-sm text-muted-foreground">Max Level</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </div>

          {/* Referral Tree Visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Referral Tree for {referralTree.firstName} {referralTree.lastName}
              </CardTitle>
              <CardDescription>
                Showing the complete referral network starting from {referralTree.registrationId}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-max p-4">
                  {renderTreeNode(referralTree)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tree Information */}
          <Card>
            <CardHeader>
              <CardTitle>Tree Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">Tree Structure</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Root: {referralTree.firstName} {referralTree.lastName} ({referralTree.registrationId})</li>
                    <li>• Direct Referrals: {referralTree.children.length}</li>
                    <li>• Total Levels: {getTreeStats(referralTree).maxLevel}</li>
                    <li>• Network Size: {getTreeStats(referralTree).totalMembers} members</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Performance Metrics</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Total Subscriptions: {getTreeStats(referralTree).totalSubscriptions}</li>
                    <li>• Total Payouts: ₹{Number(getTreeStats(referralTree).totalPayouts).toLocaleString()}</li>
                    <li>• Average Payouts per Member: ₹{(Number(getTreeStats(referralTree).totalPayouts) / getTreeStats(referralTree).totalMembers).toLocaleString()}</li>
                    <li>• Network Growth: {referralTree.children.length > 0 ? 'Active' : 'No referrals yet'}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!loading && !referralTree && selectedUser && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <TreePine className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Referral Tree Found</h3>
              <p className="text-muted-foreground">
                This user doesn't have any referrals in their network yet.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !selectedUser && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <TreePine className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Select a User</h3>
              <p className="text-muted-foreground">
                Choose a user from the dropdown above to view their referral tree.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}