'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchableUser } from '@/components/ui/searchable-user';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  TreePine, UserCheck, IndianRupee,
  ChevronDown, ChevronRight,
  Network, Phone, CreditCard, Calendar, Eye, Download
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface Member {
  id: string;
  registrationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  referredBy?: {
    id: string;
    registrationId: string;
    firstName: string;
    lastName: string;
  };
  subscriptionsCount: number;
  totalPayouts: number;
  chitGroups: Array<{
    chitId: string;
    name: string;
    amount: number;
    duration: number;
    status: string;
  }>;
  joinOrder: number;
}

interface Step {
  stepNumber: number;
  memberCount: number;
  expectedCount: number;
  members: Member[];
}

interface SequentialTreeData {
  rootUser: {
    id: string;
    registrationId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    subscriptionsCount: number;
    totalPayouts: number;
    chitGroups: Array<{
      chitId: string;
      name: string;
      amount: number;
      duration: number;
      status: string;
    }>;
  };
  steps: Step[];
  summary: {
    totalMembers: number;
    directMembers: number;
    indirectMembers: number;
  };
}

export default function ReferralTreeV2Page() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [sequentialData, setSequentialData] = useState<SequentialTreeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1])); // Default: expand step 1
  const [showQuickView, setShowQuickView] = useState(false);
  const [selectedMemberForView, setSelectedMemberForView] = useState<Member | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const fetchSequentialData = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/referral-tree/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSequentialData(data);
        // Expand step 1 by default
        setExpandedSteps(new Set([1]));
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to fetch referral data',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching sequential data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch referral data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (user?.role !== 'ADMIN' && user?.id) {
      setSelectedUser(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (selectedUser && token) {
      fetchSequentialData(selectedUser);
    }
  }, [selectedUser, fetchSequentialData, token]);

  const toggleStepExpansion = (step: number) => {
    if (expandedSteps.has(step)) {
      // If clicking an already expanded step, collapse it
      setExpandedSteps(new Set());
    } else {
      // Expand only this step (accordion behavior)
      setExpandedSteps(new Set([step]));
    }
  };

  const collapseAllSteps = () => {
    // Collapse all steps
    setExpandedSteps(new Set());
  };

  const handleDownloadPDF = async () => {
    if (!selectedUser || !sequentialData) return;
    
    setDownloadingPDF(true);
    try {
      // Send existing frontend data directly - no database queries needed!
      const response = await fetch('/api/reports/export-referral-tree-pdf', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          treeData: sequentialData
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `referral-tree-${sequentialData.rootUser.registrationId}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast({ title: 'Success', description: 'PDF downloaded successfully' });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to download PDF');
      }
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to download PDF', 
        variant: 'destructive' 
      });
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleViewMember = (member: Member) => {
    setSelectedMemberForView(member);
    setShowQuickView(true);
  };


  // Render step section
  const renderStep = (step: Step | null, stepNumber: number) => {
    if (stepNumber === 0) {
      // Root user
      if (!sequentialData) return null;
      const root = sequentialData.rootUser;
      const isExpanded = expandedSteps.has(0);
      
      return (
        <Card key="step-0" className="border-2 border-yellow-500/30">
          <CardHeader 
            className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 dark:from-yellow-500/20 dark:to-yellow-600/20 cursor-pointer"
            onClick={() => toggleStepExpansion(0)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm text-foreground">
                <button className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span className="text-foreground">Step 0: Root User</span>
                <Badge variant="outline" className="bg-yellow-500/20 text-xs">Root</Badge>
              </CardTitle>
            </div>
          </CardHeader>
          {isExpanded && (
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="border-2 border-yellow-500/30">
                  <CardHeader>
                    <CardTitle>{root.firstName} {root.lastName}</CardTitle>
                    <CardDescription className="font-mono">{root.registrationId}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        const rootMember: Member = {
                          ...root,
                          joinOrder: 0,
                        };
                        handleViewMember(rootMember);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          )}
        </Card>
      );
    }

    if (!step || step.memberCount === 0) return null;

    const isExpanded = expandedSteps.has(stepNumber);

    return (
      <Card 
        key={`step-${stepNumber}`} 
        className="border-2 border-gray-200 dark:border-gray-700"
      >
        <CardHeader 
          className="cursor-pointer bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900"
          onClick={() => toggleStepExpansion(stepNumber)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm text-foreground">
              <button className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              <span className="text-sm text-foreground">Step {stepNumber}: {step.memberCount} member{step.memberCount !== 1 ? 's' : ''}</span>
              {step.memberCount < step.expectedCount && (
                <Badge variant="outline" className="text-xs">
                  {step.memberCount} of {step.expectedCount}
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        {isExpanded && (
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sub ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Group Name/Ticket Number</TableHead>
                  <TableHead>Chit Value</TableHead>
                  <TableHead>Chit Duration</TableHead>
                  <TableHead>Referred By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {step.members.map(member => {
                  const rootUserId = sequentialData?.rootUser.id;
                  const isDirect = rootUserId && member.referredBy?.id === rootUserId;
                  
                  // Get primary chit group (first active one, or first one if none active)
                  const primaryChitGroup = member.chitGroups.length > 0 
                    ? member.chitGroups.find(g => g.status === 'ACTIVE') || member.chitGroups[0]
                    : null;
                  
                  return (
                    <TableRow 
                      key={member.id}
                      className={isDirect ? 'bg-orange-50/50' : 'bg-green-50/50'}
                    >
                      <TableCell className="font-mono text-sm">
                        {member.registrationId}
                      </TableCell>
                      <TableCell className="font-medium">
                        {member.firstName} {member.lastName}
                      </TableCell>
                      <TableCell>
                        {primaryChitGroup ? (
                          <div>
                            <div className="font-medium">{primaryChitGroup.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{primaryChitGroup.chitId}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {primaryChitGroup ? (
                          <span className="font-semibold">₹{Number(primaryChitGroup.amount).toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {primaryChitGroup ? (
                          <span>{primaryChitGroup.duration} months</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {member.referredBy ? (
                          <div>
                            <div className="font-medium">
                              {member.referredBy.firstName} {member.referredBy.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {member.referredBy.registrationId}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewMember(member)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    );
  };

  // All old tree-related functions removed - using new sequential step-based view

  return (
    <div className="space-y-6 overflow-x-hidden max-w-full" style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-full">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gradient-primary">Referral Network</h1>
          <p className="text-sm text-muted-foreground">
            Sequential step-based view of your referral network organized by join order
          </p>
        </div>
      </div>

      {/* User Selection */}
      <Card className="shadow-glow border-2 border-primary/20 w-full">
        <CardHeader className="bg-gradient-secondary text-white rounded-t-lg">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <TreePine className="h-5 w-5" />
            Select User
          </CardTitle>
          <CardDescription className="text-blue-100 text-sm">
            Choose a user to view their referral network
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <SearchableUser
            value={selectedUser}
            onValueChange={setSelectedUser}
            placeholder="Select a user to view referral network"
            className="w-full border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
            showNoOption={false}
          />
        </CardContent>
      </Card>

      {/* Referral Counts Stats */}
      {sequentialData && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-glow border-2 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Direct Members</p>
                  <p className="text-2xl font-bold text-primary mt-2">{sequentialData.summary.directMembers}</p>
                  <p className="text-xs text-muted-foreground mt-1">Referred by root user</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <UserCheck className="h-8 w-8 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-glow border-2 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Indirect Members</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">{sequentialData.summary.indirectMembers}</p>
                  <p className="text-xs text-muted-foreground mt-1">Referred by others</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Network className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls - Sticky */}
      {sequentialData && (
        <Card className="shadow-glow border-2 border-primary/20 sticky top-0 z-50 bg-background w-full">
          <CardContent className="p-4">
            <div className="flex items-center justify-between w-full flex-wrap gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <h3 className="font-semibold text-primary text-sm">Step Controls</h3>
                
                {/* Legend */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="bg-orange-500/20 text-xs">Direct</Badge>
                    <span className="text-muted-foreground">(referred by root user)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="bg-green-500/20 text-xs">Indirect</Badge>
                    <span className="text-muted-foreground">(referred by others)</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={collapseAllSteps}>
                        <ChevronRight className="h-4 w-4" />
                        <span className="ml-1 text-xs">Collapse All</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Collapse all steps</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {user?.role === 'ADMIN' && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleDownloadPDF}
                          disabled={downloadingPDF}
                        >
                          <Download className="h-4 w-4" />
                          <span className="ml-1 text-xs">
                            {downloadingPDF ? 'Downloading...' : 'Download PDF'}
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Download referral network as PDF</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card className="shadow-glow border-2 border-primary/20 w-full">
          <CardContent className="p-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading referral network...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && sequentialData && (
        <div className="space-y-4">
          {/* Root User (Step 0) */}
          {renderStep(null, 0)}
          
          {/* Steps 1-9 */}
          {sequentialData.steps.map(step => renderStep(step, step.stepNumber))}
        </div>
      )}

      {!loading && !sequentialData && selectedUser && (
        <Card className="shadow-glow border-2 border-primary/20 w-full">
          <CardContent className="p-12">
            <div className="text-center">
              <TreePine className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Referral Network Found</h3>
              <p className="text-muted-foreground">
                This user doesn&apos;t have any members in their network yet.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !selectedUser && (
        <Card className="shadow-glow border-2 border-primary/20 w-full">
          <CardContent className="p-12">
            <div className="text-center">
              <TreePine className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Select a User</h3>
              <p className="text-muted-foreground">
                Choose a user from the dropdown above to view their referral network.
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
          
          {selectedMemberForView && (
            <div className="space-y-6">
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
                          {selectedMemberForView.firstName} {selectedMemberForView.lastName}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Registration ID</label>
                        <p className="text-lg font-mono">{selectedMemberForView.registrationId}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="text-lg">{selectedMemberForView.email || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          Mobile
                        </label>
                        <p className="text-lg font-mono">{selectedMemberForView.phone}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Total Payouts</label>
                        <p className="text-lg font-semibold text-green-600">
                          ₹{Number(selectedMemberForView.totalPayouts).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/20">
                <CardHeader className="bg-gradient-secondary text-white rounded-t-lg">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Chit Groups ({selectedMemberForView.chitGroups.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {selectedMemberForView.chitGroups.length > 0 ? (
                    <div className="space-y-3">
                      {selectedMemberForView.chitGroups.map((group, index) => (
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

