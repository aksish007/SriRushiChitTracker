'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, Search, TreePine, UserCheck, IndianRupee, Activity, 
  ZoomIn, ZoomOut, RotateCcw, ChevronDown, ChevronRight,
  Star, TrendingUp, Network, Target
} from 'lucide-react';
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
  isExpanded?: boolean;
  isHighlighted?: boolean;
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
  const [zoomLevel, setZoomLevel] = useState(1);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [animationSpeed, setAnimationSpeed] = useState(300);
  const [showConnections, setShowConnections] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchUsers = useCallback(async () => {
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
  }, [token, user]);

  const fetchReferralTree = useCallback(async (registrationId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/referral-tree/${registrationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReferralTree(data.tree);
        // Expand root node by default
        setExpandedNodes(new Set([data.tree.id]));
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch referral tree',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching referral tree:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch referral tree',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [fetchUsers]);

  useEffect(() => {
    if (selectedUser && token) {
      fetchReferralTree(selectedUser);
    }
  }, [selectedUser, fetchReferralTree]);

  const filteredUsers = users.filter(user =>
    user.firstName.toLowerCase().includes(search.toLowerCase()) ||
    user.lastName.toLowerCase().includes(search.toLowerCase()) ||
    user.registrationId.toLowerCase().includes(search.toLowerCase())
  );

  const toggleNodeExpansion = (nodeId: string) => {
    const newExpandedNodes = new Set(expandedNodes);
    if (newExpandedNodes.has(nodeId)) {
      newExpandedNodes.delete(nodeId);
    } else {
      newExpandedNodes.add(nodeId);
    }
    setExpandedNodes(newExpandedNodes);
  };

  const highlightNode = (nodeId: string) => {
    setHighlightedNode(highlightedNode === nodeId ? null : nodeId);
  };

  const resetView = () => {
    setZoomLevel(1);
    setHighlightedNode(null);
  };

  const getNodeColor = (level: number, isHighlighted: boolean) => {
    if (isHighlighted) return 'bg-primary';
    switch (level) {
      case 0: return 'bg-yellow-500';
      case 1: return 'bg-blue-500';
      case 2: return 'bg-green-500';
      case 3: return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getPerformanceBadge = (payouts: number) => {
    if (payouts > 50000) return { color: 'bg-gradient-success', icon: Star, text: 'Star' };
    if (payouts > 10000) return { color: 'bg-gradient-warning', icon: TrendingUp, text: 'Rising' };
    return { color: 'bg-gradient-secondary', icon: Target, text: 'New' };
  };

  const renderTreeNode = (node: ReferralNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const isHighlighted = highlightedNode === node.id;
    const performanceBadge = getPerformanceBadge(node.totalPayouts);
    const PerformanceIcon = performanceBadge.icon;
    
    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Node Card */}
        <div className={`relative transition-all duration-${animationSpeed} transform hover:scale-105`}>
          <Card 
            className={`w-64 mb-4 cursor-pointer transition-all duration-300 ${
              isHighlighted ? 'ring-4 ring-primary shadow-glow' : 'shadow-glow border-2 border-primary/20'
            } hover:shadow-glow-blue`}
            onClick={() => highlightNode(node.id)}
          >
            <CardContent className="p-4">
              <div className="text-center space-y-3">
                {/* Performance Badge */}
                <div className="flex justify-center">
                  <Badge className={`${performanceBadge.color} text-white text-xs`}>
                    <PerformanceIcon className="h-3 w-3 mr-1" />
                    {performanceBadge.text}
                  </Badge>
                </div>

                {/* User Info */}
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <div className={`w-3 h-3 ${getNodeColor(level, isHighlighted)} rounded-full`}></div>
                    <h3 className="font-semibold text-sm">
                      {node.firstName} {node.lastName}
                    </h3>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {node.registrationId}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Level {node.level}
                  </Badge>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="text-center p-2 bg-gradient-primary/10 rounded-lg">
                    <div className="font-bold text-primary">{node.subscriptionsCount}</div>
                    <div className="text-muted-foreground">Subscriptions</div>
                  </div>
                  <div className="text-center p-2 bg-gradient-success/10 rounded-lg">
                    <div className="font-bold text-success">₹{Number(node.totalPayouts).toLocaleString()}</div>
                    <div className="text-muted-foreground">Payouts</div>
                  </div>
                </div>

                {/* Expand/Collapse Button */}
                {node.children.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleNodeExpansion(node.id);
                    }}
                    className="h-6 w-6 p-0 hover:bg-primary/10"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Children with Proper Tree Layout */}
        {node.children.length > 0 && isExpanded && (
          <div className="relative w-full">
            {/* Vertical connection line from parent to children */}
            {showConnections && (
              <div className="absolute top-0 left-1/2 w-px h-4 bg-gradient-to-b from-primary to-transparent transform -translate-x-1/2"></div>
            )}
            
            {/* Children Container */}
            <div className="mt-4 relative">
              {node.children.length === 1 ? (
                // Single child - center alignment
                <div className="flex justify-center">
                  {renderTreeNode(node.children[0], level + 1)}
                </div>
              ) : (
                // Multiple children - horizontal layout with proper connections
                <div className="relative">
                  {/* Horizontal connection line connecting all children */}
                  {showConnections && node.children.length > 1 && (
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-primary/30 via-primary to-primary/30"></div>
                  )}
                  
                  {/* Children grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
                    {node.children.map((child, index) => (
                      <div key={child.id} className="relative">
                        {/* Vertical connection line from horizontal line to each child */}
                        {showConnections && (
                          <div className="absolute top-0 left-1/2 w-px h-4 bg-gradient-to-b from-primary to-transparent transform -translate-x-1/2"></div>
                        )}
                        {renderTreeNode(child, level + 1)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient-primary">Referral Tree</h1>
          <p className="text-muted-foreground">
            Interactive visualization of your referral network and hierarchy
          </p>
        </div>
      </div>

      {/* User Selection */}
      <Card className="shadow-glow border-2 border-primary/20">
        <CardHeader className="bg-gradient-secondary text-white rounded-t-lg">
          <CardTitle className="text-white flex items-center gap-2">
            <TreePine className="h-5 w-5" />
            Select User
          </CardTitle>
          <CardDescription className="text-blue-100">
            Choose a user to view their referral tree
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-80 border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20">
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

      {/* Controls */}
      {referralTree && (
        <Card className="shadow-glow border-2 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold text-primary">Tree Controls</h3>
              </div>
              
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowConnections(!showConnections)}
                        className="hover:bg-gradient-secondary hover:text-white"
                      >
                        <Network className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Toggle connection lines</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
                        className="hover:bg-gradient-primary hover:text-white"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Zoom out</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
                        className="hover:bg-gradient-primary hover:text-white"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Zoom in</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetView}
                        className="hover:bg-gradient-warning hover:text-white"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Reset view</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card className="shadow-glow border-2 border-primary/20">
          <CardContent className="p-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading referral tree...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && referralTree && (
        <Card className="shadow-glow border-2 border-primary/20">
          <CardHeader className="bg-gradient-primary text-white rounded-t-lg">
            <CardTitle className="text-white flex items-center gap-2">
              <TreePine className="h-5 w-5" />
              Referral Tree for {referralTree.firstName} {referralTree.lastName}
            </CardTitle>
            <CardDescription className="text-yellow-100">
              Interactive tree visualization starting from {referralTree.registrationId}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div 
              ref={containerRef}
              className="overflow-auto"
              style={{ 
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
                transition: 'transform 0.3s ease'
              }}
            >
              <div className="min-w-max p-4">
                {renderTreeNode(referralTree)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !referralTree && selectedUser && (
        <Card className="shadow-glow border-2 border-primary/20">
          <CardContent className="p-12">
            <div className="text-center">
              <TreePine className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Referral Tree Found</h3>
              <p className="text-muted-foreground">
                This user doesn&apos;t have any referrals in their network yet.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !selectedUser && (
        <Card className="shadow-glow border-2 border-primary/20">
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