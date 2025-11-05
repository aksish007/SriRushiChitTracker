'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchableUser } from '@/components/ui/searchable-user';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, TreePine, UserCheck, IndianRupee, Activity, 
  ZoomIn, ZoomOut, RotateCcw, ChevronDown, ChevronRight,
  Star, TrendingUp, Network, Target, Phone, CreditCard, Calendar, Printer
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface ReferralNode {
  id: string;
  registrationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  level: number;
  referredBy?: {
    id: string;
    registrationId: string;
    firstName: string;
    lastName: string;
  };
  children: ReferralNode[];
  subscriptionsCount: number;
  totalPayouts: number;
  chitGroups: Array<{
    chitId: string;
    name: string;
    amount: number;
    duration: number;
    status: string;
  }>;
  isExpanded?: boolean;
  isHighlighted?: boolean;
}


export default function ReferralTreePage() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [referralTree, setReferralTree] = useState<ReferralNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [animationSpeed, setAnimationSpeed] = useState(300);
  const [showConnections, setShowConnections] = useState(true);
  const [showQuickView, setShowQuickView] = useState(false);
  const [selectedNodeForView, setSelectedNodeForView] = useState<ReferralNode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Function to get all node IDs from the tree recursively
  const getAllNodeIds = (node: ReferralNode): string[] => {
    const ids = [node.id];
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        ids.push(...getAllNodeIds(child));
      });
    }
    return ids;
  };

  const fetchReferralTree = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/referral-tree/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReferralTree(data.tree);
        // Expand all nodes by default
        const allNodeIds = getAllNodeIds(data.tree);
        setExpandedNodes(new Set(allNodeIds));
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
    // Auto-select current user if they're not admin
    if (user?.role !== 'ADMIN' && user?.id) {
      setSelectedUser(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (selectedUser && token) {
      fetchReferralTree(selectedUser);
    }
  }, [selectedUser, fetchReferralTree]);


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

  const handleNodeClick = (node: ReferralNode) => {
    setSelectedNodeForView(node);
    setShowQuickView(true);
  };

  const resetView = () => {
    setZoomLevel(1);
    setHighlightedNode(null);
  };

  const expandAllNodes = () => {
    if (referralTree) {
      const allNodeIds = getAllNodeIds(referralTree);
      setExpandedNodes(new Set(allNodeIds));
    }
  };

  const collapseAllNodes = () => {
    if (referralTree) {
      setExpandedNodes(new Set([referralTree.id])); // Only keep root node expanded
    }
  };

  const handlePrint = async () => {
    if (!referralTree) {
      toast({
        title: 'No Tree to Print',
        description: 'Please select a user and load a referral tree first',
        variant: 'destructive',
      });
      return;
    }

    const treeContainer = document.getElementById('referral-tree-container');
    if (!treeContainer) {
      toast({
        title: 'Print Failed',
        description: 'Tree container not found',
        variant: 'destructive',
      });
      return;
    }

    try {
      toast({
        title: 'Generating Print Preview',
        description: 'Capturing tree screenshot...',
        variant: 'default',
      });

      // Temporarily hide controls and other UI elements
      const controlsCard = treeContainer.closest('.space-y-6')?.querySelector('.shadow-glow');
      const originalControlsDisplay = controlsCard ? (controlsCard as HTMLElement).style.display : '';
      if (controlsCard) {
        (controlsCard as HTMLElement).style.display = 'none';
      }

      // Reset zoom to 1 for consistent screenshot
      const originalZoom = zoomLevel;
      setZoomLevel(1);

      // Wait for zoom to reset
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture the tree as a high-quality image
      const canvas = await html2canvas(treeContainer, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        width: treeContainer.scrollWidth,
        height: treeContainer.scrollHeight,
        windowWidth: treeContainer.scrollWidth,
        windowHeight: treeContainer.scrollHeight,
        logging: false,
        removeContainer: false,
      });

      // Restore original zoom
      setZoomLevel(originalZoom);

      // Restore controls visibility
      if (controlsCard) {
        (controlsCard as HTMLElement).style.display = originalControlsDisplay;
      }

      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: 'Print Failed',
          description: 'Please allow popups for this site to print',
          variant: 'destructive',
        });
        return;
      }

      // Create print content with the screenshot
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Referral Tree - ${referralTree.firstName} ${referralTree.lastName}</title>
            <meta charset="utf-8">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                color: #333;
                background: white;
                line-height: 1.4;
              }
              
              .print-header {
                text-align: center;
                margin-bottom: 20px;
                border-bottom: 3px solid #3b82f6;
                padding: 15px 20px;
                page-break-after: avoid;
                page-break-inside: avoid;
              }
              
              .print-header h1 {
                color: #3b82f6;
                margin: 0 0 10px 0;
                font-size: 28px;
                font-weight: bold;
              }
              
              .print-header p {
                margin: 3px 0;
                color: #666;
                font-size: 14px;
              }
              
              .tree-container {
                width: 100%;
                padding: 0;
                margin: 0;
                page-break-inside: avoid;
              }
              
              .tree-image {
                width: 100%;
                height: auto;
                max-width: 100%;
                display: block;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                page-break-inside: avoid;
                page-break-after: auto;
              }
              
              @media print {
                @page {
                  size: A4 landscape;
                  margin: 10mm;
                }
                
                body { 
                  margin: 0; 
                  padding: 0;
                  width: 100%;
                }
                
                .print-header { 
                  page-break-after: avoid; 
                  page-break-inside: avoid;
                  margin-bottom: 15px;
                  padding: 10px 0;
                }
                
                .tree-container {
                  page-break-inside: avoid;
                  width: 100%;
                  overflow: visible;
                }
                
                .tree-image {
                  page-break-inside: avoid;
                  page-break-after: auto;
                  max-width: 100%;
                  height: auto;
                  width: 100%;
                  object-fit: contain;
                }
              }
            </style>
          </head>
          <body>
            <div class="print-header">
              <h1>Referral Tree</h1>
              <p><strong>User:</strong> ${referralTree.firstName} ${referralTree.lastName} (${referralTree.registrationId})</p>
              <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <div class="tree-container">
              <img src="${canvas.toDataURL('image/png')}" alt="Referral Tree" class="tree-image" />
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        
        // Close window after a delay
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 500);

      toast({
        title: 'Print Ready',
        description: 'Print dialog will open shortly',
        variant: 'default',
      });

    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: 'Print Failed',
        description: 'Failed to capture tree screenshot',
        variant: 'destructive',
      });
    }
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
            className={`w-full max-w-[280px] min-w-[200px] mb-4 cursor-pointer transition-all duration-300 ${
              isHighlighted ? 'ring-4 ring-primary shadow-glow' : 'shadow-glow border-2 border-primary/20'
            } hover:shadow-glow-blue`}
            onClick={() => handleNodeClick(node)}
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
                  {node.referredBy && (
                    <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                      <span className="font-medium">Referred by:</span> {node.referredBy.firstName} {node.referredBy.lastName}
                      <br />
                      <span className="text-[10px] font-mono text-blue-600">({node.referredBy.registrationId})</span>
                    </div>
                  )}
                  <Badge variant="outline" className="text-xs">
                    Step {node.level}
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
            {/* Vertical connection line from parent to children with arrow */}
            {showConnections && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                <div className="w-px h-4 bg-gradient-to-b from-primary to-primary/50"></div>
                {/* Arrow pointing down */}
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-primary"></div>
              </div>
            )}
            
            {/* Children Container */}
            <div className="mt-4 relative">
              {node.children.length === 1 ? (
                // Single child - center alignment
                <div className="flex flex-col items-center">
                  {showConnections && (
                    <div className="text-xs text-primary font-medium mb-1 px-2 py-0.5 bg-primary/10 rounded">
                      ↓ Referred
                    </div>
                  )}
                  {renderTreeNode(node.children[0], level + 1)}
                </div>
              ) : (
                // Multiple children - responsive flex layout with wrapping
                <div className="relative">
                  {/* Horizontal connection line connecting all children */}
                  {showConnections && node.children.length > 1 && (
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-primary/30 via-primary to-primary/30"></div>
                  )}
                  
                  {/* Children flex container with responsive wrapping */}
                  <div className="flex flex-wrap justify-center gap-4 md:gap-6 lg:gap-4">
                    {node.children.map((child, index) => (
                      <div key={child.id} className="relative flex-shrink-0 flex flex-col items-center" style={{ minWidth: '200px', maxWidth: '280px' }}>
                        {/* Vertical connection line from horizontal line to each child with arrow */}
                        {showConnections && (
                          <>
                            <div className="absolute top-0 left-1/2 w-px h-4 bg-gradient-to-b from-primary to-primary/50 transform -translate-x-1/2"></div>
                            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-primary"></div>
                          </>
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
              <SearchableUser
                value={selectedUser}
                onValueChange={setSelectedUser}
                placeholder="Select a user to view referral tree"
                className="w-full border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
                showNoOption={false}
              />
            </div>
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
                        onClick={expandAllNodes}
                        className="hover:bg-gradient-secondary hover:text-white"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Expand all nodes</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={collapseAllNodes}
                        className="hover:bg-gradient-secondary hover:text-white"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Collapse all nodes</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrint}
                        className="hover:bg-gradient-secondary hover:text-white"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Print referral tree</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
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
              id="referral-tree-container"
              ref={containerRef}
              className="overflow-auto max-h-[calc(100vh-300px)]"
              style={{ 
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
                transition: 'transform 0.3s ease'
              }}
            >
              <div className="p-4 w-full flex justify-center">
                <div className="w-full max-w-full">
                  {renderTreeNode(referralTree)}
                </div>
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

      {/* Quick View Dialog */}
      <Dialog open={showQuickView} onOpenChange={setShowQuickView}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              User Details
            </DialogTitle>
            <DialogDescription>
              Quick view of user information and chit group details
            </DialogDescription>
          </DialogHeader>
          
          {selectedNodeForView && (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card className="border-2 border-primary/20">
                <CardHeader className="bg-gradient-secondary text-white rounded-t-lg">
                  <CardTitle className="text-white text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <p className="text-lg font-semibold">
                          {selectedNodeForView.firstName} {selectedNodeForView.lastName}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Registration ID</label>
                        <p className="text-lg font-mono">{selectedNodeForView.registrationId}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="text-lg">{selectedNodeForView.email || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          Mobile
                        </label>
                        <p className="text-lg font-mono">{selectedNodeForView.phone}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Total Payouts</label>
                        <p className="text-lg font-semibold text-green-600">
                          ₹{Number(selectedNodeForView.totalPayouts).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Chit Groups */}
              <Card className="border-2 border-primary/20">
                <CardHeader className="bg-gradient-secondary text-white rounded-t-lg">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Chit Groups ({selectedNodeForView.chitGroups.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {selectedNodeForView.chitGroups.length > 0 ? (
                    <div className="space-y-3">
                      {selectedNodeForView.chitGroups.map((group, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Chit ID</label>
                              <p className="font-mono font-semibold">{group.chitId}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Scheme Name</label>
                              <p className="font-semibold">{group.name}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Status</label>
                              <Badge 
                                className={`${
                                  group.status === 'ACTIVE' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {group.status}
                              </Badge>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                <IndianRupee className="h-4 w-4" />
                                Value
                              </label>
                              <p className="font-semibold text-lg">₹{Number(group.amount).toLocaleString()}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Duration
                              </label>
                              <p className="font-semibold">{group.duration} months</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Network className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-muted-foreground">No active chit groups found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}