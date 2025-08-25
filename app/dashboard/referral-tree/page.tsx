'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { 
  PieChart, Users, Search, TreePine, UserCheck, IndianRupee, Activity, 
  ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, ChevronDown, ChevronRight,
  Crown, Star, TrendingUp, Network, Layers, Target, Award, Sparkles
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

interface TreeStats {
  totalMembers: number;
  totalSubscriptions: number;
  totalPayouts: number;
  maxLevel: number;
  directReferrals: number;
  averagePayoutsPerMember: number;
  networkGrowth: string;
  topPerformers: ReferralNode[];
}

export default function ReferralTreePage() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [referralTree, setReferralTree] = useState<ReferralNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'list' | 'stats'>('tree');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [animationSpeed, setAnimationSpeed] = useState(300);
  const [showConnections, setShowConnections] = useState(true);
  const [treeStats, setTreeStats] = useState<TreeStats | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchReferralTree(selectedUser);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (referralTree) {
      calculateTreeStats();
    }
  }, [referralTree]);

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
        // Expand root node by default
        setExpandedNodes(new Set([data.tree.id]));
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

  const calculateTreeStats = () => {
    if (!referralTree) return;

    let totalMembers = 1;
    let totalSubscriptions = referralTree.subscriptionsCount;
    let totalPayouts = referralTree.totalPayouts;
    let maxLevel = referralTree.level;
    let allNodes: ReferralNode[] = [referralTree];

    const traverse = (node: ReferralNode) => {
      totalMembers += node.children.length;
      totalSubscriptions += node.subscriptionsCount;
      totalPayouts += node.totalPayouts;
      maxLevel = Math.max(maxLevel, node.level);
      allNodes.push(node);
      
      node.children.forEach(traverse);
    };

    traverse(referralTree);

    // Find top performers (nodes with highest payouts)
    const topPerformers = allNodes
      .sort((a, b) => b.totalPayouts - a.totalPayouts)
      .slice(0, 5);

    const stats: TreeStats = {
      totalMembers,
      totalSubscriptions,
      totalPayouts,
      maxLevel,
      directReferrals: referralTree.children.length,
      averagePayoutsPerMember: totalPayouts / totalMembers,
      networkGrowth: referralTree.children.length > 0 ? 'Active' : 'No referrals yet',
      topPerformers
    };

    setTreeStats(stats);
  };

  const toggleNodeExpansion = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const highlightNode = (nodeId: string) => {
    setHighlightedNode(nodeId);
    setTimeout(() => setHighlightedNode(null), 2000);
  };

  const resetView = () => {
    setZoomLevel(1);
    setExpandedNodes(new Set([referralTree?.id || '']));
    setHighlightedNode(null);
  };

  const filteredUsers = users.filter(user => 
    user.firstName.toLowerCase().includes(search.toLowerCase()) ||
    user.lastName.toLowerCase().includes(search.toLowerCase()) ||
    user.registrationId.toLowerCase().includes(search.toLowerCase())
  );

  const getNodeColor = (level: number, isHighlighted: boolean = false) => {
    if (isHighlighted) return 'bg-gradient-primary';
    
    const colors = [
      'bg-gradient-primary',
      'bg-gradient-secondary', 
      'bg-gradient-success',
      'bg-gradient-warning',
      'bg-gradient-danger'
    ];
    return colors[level % colors.length];
  };

  const getPerformanceBadge = (payouts: number) => {
    if (payouts > 100000) return { color: 'bg-gradient-primary', icon: Crown, text: 'Elite' };
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
        
        {/* Children */}
        {node.children.length > 0 && isExpanded && (
          <div className="relative">
            {/* Connection Lines */}
            {showConnections && (
              <div className="absolute top-0 left-1/2 w-px h-4 bg-gradient-to-b from-primary to-transparent transform -translate-x-1/2"></div>
            )}
            <div className="grid grid-cols-1 gap-6 mt-4">
              {node.children.map((child, index) => (
                <div key={child.id} className="relative">
                  {showConnections && index < node.children.length - 1 && (
                    <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-primary/50 to-transparent transform -translate-y-1/2"></div>
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

  const renderListView = () => {
    if (!referralTree) return null;

    const flattenTree = (node: ReferralNode): ReferralNode[] => {
      return [node, ...node.children.flatMap(flattenTree)];
    };

    const allNodes = flattenTree(referralTree);

    return (
      <div className="space-y-4">
        {allNodes.map((node, index) => {
          const performanceBadge = getPerformanceBadge(node.totalPayouts);
          const PerformanceIcon = performanceBadge.icon;
          
          return (
            <Card 
              key={node.id} 
              className={`transition-all duration-300 cursor-pointer hover:shadow-glow ${
                highlightedNode === node.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => highlightNode(node.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-4 h-4 ${getNodeColor(node.level)} rounded-full`}></div>
                    <div>
                      <h3 className="font-semibold">
                        {node.firstName} {node.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground font-mono">
                        {node.registrationId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={`${performanceBadge.color} text-white`}>
                      <PerformanceIcon className="h-3 w-3 mr-1" />
                      {performanceBadge.text}
                    </Badge>
                    <Badge variant="outline">Level {node.level}</Badge>
                    <div className="text-right">
                      <div className="font-semibold text-primary">{node.subscriptionsCount} subs</div>
                      <div className="text-sm text-success">₹{Number(node.totalPayouts).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderStatsView = () => {
    if (!treeStats) return null;

    return (
      <div className="space-y-6">
        {/* Performance Overview */}
        <Card className="shadow-glow border-2 border-primary/20">
          <CardHeader className="bg-gradient-primary text-white rounded-t-lg">
            <CardTitle className="text-white">Network Performance Overview</CardTitle>
            <CardDescription className="text-yellow-100">
              Comprehensive analysis of your referral network
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center p-4 bg-gradient-primary/10 rounded-lg">
                <Users className="h-8 w-8 mx-auto text-primary mb-2" />
                <div className="text-2xl font-bold text-primary">{treeStats.totalMembers}</div>
                <div className="text-sm text-muted-foreground">Total Members</div>
              </div>
              <div className="text-center p-4 bg-gradient-success/10 rounded-lg">
                <Activity className="h-8 w-8 mx-auto text-success mb-2" />
                <div className="text-2xl font-bold text-success">{treeStats.totalSubscriptions}</div>
                <div className="text-sm text-muted-foreground">Total Subscriptions</div>
              </div>
              <div className="text-center p-4 bg-gradient-warning/10 rounded-lg">
                <IndianRupee className="h-8 w-8 mx-auto text-warning mb-2" />
                <div className="text-2xl font-bold text-warning">₹{Number(treeStats.totalPayouts).toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Payouts</div>
              </div>
              <div className="text-center p-4 bg-gradient-secondary/10 rounded-lg">
                <Layers className="h-8 w-8 mx-auto text-secondary mb-2" />
                <div className="text-2xl font-bold text-secondary">{treeStats.maxLevel}</div>
                <div className="text-sm text-muted-foreground">Max Level</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card className="shadow-glow border-2 border-primary/20">
          <CardHeader className="bg-gradient-success text-white rounded-t-lg">
            <CardTitle className="text-white flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Performers
            </CardTitle>
            <CardDescription className="text-green-100">
              Members with highest payouts in your network
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {treeStats.topPerformers.map((performer, index) => {
                const performanceBadge = getPerformanceBadge(performer.totalPayouts);
                const PerformanceIcon = performanceBadge.icon;
                
                return (
                  <div key={performer.id} className="flex items-center justify-between p-4 bg-gradient-primary/5 rounded-lg hover:bg-gradient-primary/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-primary">#{index + 1}</div>
                      <div>
                        <h3 className="font-semibold">
                          {performer.firstName} {performer.lastName}
                        </h3>
                        <p className="text-sm text-muted-foreground font-mono">
                          {performer.registrationId}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={`${performanceBadge.color} text-white`}>
                        <PerformanceIcon className="h-3 w-3 mr-1" />
                        {performanceBadge.text}
                      </Badge>
                      <div className="text-right">
                        <div className="font-semibold text-success">₹{Number(performer.totalPayouts).toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">{performer.subscriptionsCount} subscriptions</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Network Insights */}
        <Card className="shadow-glow border-2 border-primary/20">
          <CardHeader className="bg-gradient-secondary text-white rounded-t-lg">
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Network Insights
            </CardTitle>
            <CardDescription className="text-blue-100">
              Key metrics and growth indicators
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h4 className="font-semibold text-primary">Growth Metrics</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gradient-primary/10 rounded-lg">
                    <span className="text-sm">Direct Referrals</span>
                    <Badge variant="outline">{treeStats.directReferrals}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gradient-success/10 rounded-lg">
                    <span className="text-sm">Network Growth</span>
                    <Badge className="bg-gradient-success text-white">{treeStats.networkGrowth}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gradient-warning/10 rounded-lg">
                    <span className="text-sm">Avg Payouts/Member</span>
                    <span className="font-semibold text-warning">₹{Number(treeStats.averagePayoutsPerMember).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold text-primary">Performance Indicators</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-gradient-primary/10 rounded-lg">
                    <div className="text-sm text-muted-foreground">Subscription Rate</div>
                    <div className="text-2xl font-bold text-primary">
                      {((treeStats.totalSubscriptions / treeStats.totalMembers) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 bg-gradient-success/10 rounded-lg">
                    <div className="text-sm text-muted-foreground">Network Depth</div>
                    <div className="text-2xl font-bold text-success">{treeStats.maxLevel} levels</div>
                  </div>
                  <div className="p-3 bg-gradient-warning/10 rounded-lg">
                    <div className="text-sm text-muted-foreground">Total Value</div>
                    <div className="text-2xl font-bold text-warning">₹{Number(treeStats.totalPayouts).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
                <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="tree" className="flex items-center gap-2">
                      <TreePine className="h-4 w-4" />
                      Tree View
                    </TabsTrigger>
                    <TabsTrigger value="list" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      List View
                    </TabsTrigger>
                    <TabsTrigger value="stats" className="flex items-center gap-2">
                      <PieChart className="h-4 w-4" />
                      Analytics
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
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
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="w-full">
          <TabsContent value="tree" className="space-y-6">
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
          </TabsContent>

          <TabsContent value="list" className="space-y-6">
            <Card className="shadow-glow border-2 border-primary/20">
              <CardHeader className="bg-gradient-secondary text-white rounded-t-lg">
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Network Members List
                </CardTitle>
                <CardDescription className="text-blue-100">
                  All members in the referral network
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {renderListView()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            {renderStatsView()}
          </TabsContent>
        </Tabs>
      )}

      {!loading && !referralTree && selectedUser && (
        <Card className="shadow-glow border-2 border-primary/20">
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