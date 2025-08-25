'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tree, TreeNode } from 'react-organizational-chart';
import { Users, TrendingUp, IndianRupee, Search } from 'lucide-react';
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

interface ReferralTreeProps {
  registrationId?: string;
}

function UserNode({ node }: { node: ReferralNode }) {
  const isRoot = node.level === 0;
  
  return (
    <div
      className={`
        bg-white border-2 rounded-lg p-3 shadow-lg min-w-[200px] text-center
        ${isRoot ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
        ${node.level === 1 ? 'border-green-400 bg-green-50' : ''}
        ${node.level === 2 ? 'border-yellow-400 bg-yellow-50' : ''}
        ${node.level >= 3 ? 'border-purple-400 bg-purple-50' : ''}
      `}
    >
      <div className="font-bold text-sm">{node.firstName} {node.lastName}</div>
      <div className="text-xs text-gray-600 mb-2">{node.registrationId}</div>
      
      <div className="flex justify-around text-xs">
        <div className="flex flex-col items-center">
          <Users className="h-4 w-4 mb-1 text-blue-600" />
          <span>{node.subscriptionsCount}</span>
          <span className="text-gray-500">Subs</span>
        </div>
        <div className="flex flex-col items-center">
                          <IndianRupee className="h-4 w-4 mb-1 text-green-600" />
                      <span>₹{Number(node.totalPayouts).toLocaleString()}</span>
          <span className="text-gray-500">Payouts</span>
        </div>
      </div>
      
      <div className="text-xs mt-2 text-gray-500">
        Level {node.level} • {node.children.length} Direct
      </div>
    </div>
  );
}

function RenderTree({ node }: { node: ReferralNode }) {
  if (node.children.length === 0) {
    return <UserNode node={node} />;
  }

  return (
    <TreeNode label={<UserNode node={node} />}>
      {node.children.map((child) => (
        <RenderTree key={child.id} node={child} />
      ))}
    </TreeNode>
  );
}

export function ReferralTree({ registrationId }: ReferralTreeProps) {
  const { user, token } = useAuth();
  const [tree, setTree] = useState<ReferralNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchId, setSearchId] = useState(registrationId || user?.registrationId || '');

  const fetchReferralTree = async (regId: string) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/referral-tree/${regId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch referral tree');
      }

      const data = await response.json();
      setTree(data.tree);
    } catch (err: any) {
      setError(err.message);
      setTree(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchId) {
      fetchReferralTree(searchId);
    }
  }, []);

  const handleSearch = () => {
    if (searchId.trim()) {
      fetchReferralTree(searchId.trim());
    }
  };

  const calculateTotalReferrals = (node: ReferralNode): number => {
    let total = node.children.length;
    for (const child of node.children) {
      total += calculateTotalReferrals(child);
    }
    return total;
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>Referral Tree Visualization</CardTitle>
          <CardDescription>
            View the complete referral hierarchy for any user
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="registrationId">Registration ID</Label>
              <Input
                id="registrationId"
                placeholder="Enter Registration ID (e.g., REG-123456)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={loading || !searchId.trim()}
              className="mt-6"
            >
              <Search className="h-4 w-4 mr-2" />
              {loading ? 'Loading...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tree Visualization */}
      {tree && (
        <Card>
          <CardHeader>
            <CardTitle>
              Referral Network for {tree.firstName} {tree.lastName}
            </CardTitle>
            <CardDescription>
              Registration ID: {tree.registrationId}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {tree.children.length}
                </div>
                <div className="text-sm text-gray-600">Direct Referrals</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {calculateTotalReferrals(tree)}
                </div>
                <div className="text-sm text-gray-600">Total Network</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {tree.subscriptionsCount}
                </div>
                <div className="text-sm text-gray-600">Active Subscriptions</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  ₹{Number(tree.totalPayouts).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Payouts</div>
              </div>
            </div>

            {/* Tree Structure */}
            <div className="overflow-auto bg-gray-50 p-6 rounded-lg">
              <Tree
                lineWidth="2px"
                lineColor="#94a3b8"
                lineBorderRadius="10px"
                label={<UserNode node={tree} />}
              >
                {tree.children.map((child) => (
                  <RenderTree key={child.id} node={child} />
                ))}
              </Tree>
            </div>

            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 bg-blue-50 rounded"></div>
                <span>Root User</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-green-400 bg-green-50 rounded"></div>
                <span>Level 1</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-yellow-400 bg-yellow-50 rounded"></div>
                <span>Level 2</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-purple-400 bg-purple-50 rounded"></div>
                <span>Level 3+</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && !tree && searchId && (
        <Card>
          <CardContent className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No referral tree found for the specified Registration ID.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}