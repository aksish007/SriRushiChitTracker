'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Extend Window interface for d3 CDN fallback
declare global {
  interface Window {
    d3?: any;
  }
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchableUser } from '@/components/ui/searchable-user';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  TreePine, UserCheck, IndianRupee,
  ZoomIn, ZoomOut, RotateCcw, ChevronDown, ChevronRight,
  Star, TrendingUp, Network, Target, Phone, CreditCard, Calendar, Printer,
  Download, Maximize, Minimize, Move, FileText
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
}

// D3 hierarchy node type (d3 loaded dynamically)
interface HierarchyNode {
  data: ReferralNode;
  depth: number;
  height: number;
  x?: number;
  y?: number;
  parent?: HierarchyNode | null;
  children?: HierarchyNode[];
  descendants(): HierarchyNode[];
  links(): Array<{ source: HierarchyNode; target: HierarchyNode }>;
}

export default function ReferralTreeV2Page() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [referralTree, setReferralTree] = useState<ReferralNode | null>(null);
  const [referralCounts, setReferralCounts] = useState<{ directReferralCount: number; indirectReferralCount: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0.6); // Default more zoomed out
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [showConnections, setShowConnections] = useState(true);
  const [showQuickView, setShowQuickView] = useState(false);
  const [selectedNodeForView, setSelectedNodeForView] = useState<ReferralNode | null>(null);
  const [showSchemeDialog, setShowSchemeDialog] = useState(false);
  const [selectedNodeForSchemes, setSelectedNodeForSchemes] = useState<ReferralNode | null>(null);
  const [d3Loaded, setD3Loaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollPosition, setScrollPosition] = useState({ left: 0, top: 0 });
  const d3Ref = useRef<any>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load d3 dynamically using CDN (avoids module resolution issues)
  useEffect(() => {
    if (typeof window !== 'undefined' && !d3Ref.current) {
      if (window.d3) {
        // Already loaded
        d3Ref.current = window.d3;
        setD3Loaded(true);
      } else {
        // Load from CDN
        const script = document.createElement('script');
        script.src = 'https://d3js.org/d3.v7.min.js';
        script.async = true;
        script.onload = () => {
          if (window.d3) {
            d3Ref.current = window.d3;
            setD3Loaded(true);
          }
        };
        script.onerror = () => {
          toast({
            title: 'Error',
            description: 'Failed to load visualization library. Please refresh the page.',
            variant: 'destructive',
          });
        };
        document.head.appendChild(script);
      }
    }
  }, [toast]);

  const fetchReferralTree = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/referral-tree/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReferralTree(data.tree);
        setReferralCounts(data.referralCounts || null);
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
    if (user?.role !== 'ADMIN' && user?.id) {
      setSelectedUser(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (selectedUser && token) {
      fetchReferralTree(selectedUser);
    }
  }, [selectedUser, fetchReferralTree, token]);

  const getAllNodeIds = (node: ReferralNode): string[] => {
    const ids = [node.id];
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        ids.push(...getAllNodeIds(child));
      });
    }
    return ids;
  };

  // Find a node in the original tree by ID
  const findNodeInTree = useCallback((nodeId: string, tree: ReferralNode | null): ReferralNode | null => {
    if (!tree) return null;
    if (tree.id === nodeId) return tree;
    if (tree.children && tree.children.length > 0) {
      for (const child of tree.children) {
        const found = findNodeInTree(nodeId, child);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const toggleNodeExpansion = (nodeId: string) => {
    const newExpandedNodes = new Set(expandedNodes);
    if (newExpandedNodes.has(nodeId)) {
      newExpandedNodes.delete(nodeId);
    } else {
      newExpandedNodes.add(nodeId);
    }
    setExpandedNodes(newExpandedNodes);
  };

  const handleNodeClick = (node: ReferralNode, e?: React.MouseEvent) => {
    // If clicking on expand/collapse button or its area, toggle expansion instead
    if (e && (e.target as HTMLElement).closest('.expand-toggle-area')) {
      e.stopPropagation();
      toggleNodeExpansion(node.id);
      return;
    }
    setSelectedNodeForView(node);
    setShowQuickView(true);
  };

  const handleSchemeCountClick = (e: React.MouseEvent, node: ReferralNode) => {
    e.stopPropagation();
    setSelectedNodeForSchemes(node);
    setShowSchemeDialog(true);
  };

  const resetView = () => {
    setZoomLevel(0.6); // Reset to default zoomed out view
    setHighlightedNode(null);
    setScrollPosition({ left: 0, top: 0 });
    if (containerRef.current) {
      // Scroll to center both horizontally and vertically
      const scrollWidth = containerRef.current.scrollWidth;
      const clientWidth = containerRef.current.clientWidth;
      const scrollHeight = containerRef.current.scrollHeight;
      const clientHeight = containerRef.current.clientHeight;
      const scrollLeft = (scrollWidth - clientWidth) / 2;
      const scrollTop = (scrollHeight - clientHeight) / 2;
      containerRef.current.scrollTo({ top: scrollTop, left: scrollLeft, behavior: 'smooth' });
    }
  };

  // Flatten tree into hierarchical list for printing with expand/collapse
  const flattenTreeToList = (node: ReferralNode, level: number = 0, isLast: boolean = true, prefix: string = '', nodeId: string = 'node-0'): { html: string; nodeId: string } => {
    const connector = level > 0 ? prefix : '';
    const currentPrefix = level > 0 ? (isLast ? '└─ ' : '├─ ') : '';
    const nextPrefix = level > 0 ? (isLast ? '   ' : '│  ') : '';
    const hasChildren = node.children && node.children.length > 0;
    const childrenId = `${nodeId}-children`;
    const toggleId = `${nodeId}-toggle`;
    
    let html = `
      <div class="tree-item" id="${nodeId}" style="margin-left: ${level * 20}px; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; align-items: start; gap: 12px;">
          <div style="font-family: monospace; color: #6b7280; min-width: 40px; white-space: pre;">${connector}${currentPrefix}</div>
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
              ${hasChildren ? `
                <button 
                  id="${toggleId}" 
                  class="toggle-btn" 
                  onclick="toggleNode('${childrenId}', '${toggleId}')"
                  style="background: #3b82f6; color: white; border: none; border-radius: 4px; width: 24px; height: 24px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"
                  title="Expand/Collapse"
                >−</button>
              ` : '<div style="width: 24px;"></div>'}
              <strong style="font-size: 14px; color: #111827;">${node.firstName} ${node.lastName}</strong>
              <span style="font-family: monospace; font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${node.registrationId}</span>
              <span style="font-size: 11px; color: #6b7280; background: #dbeafe; padding: 2px 6px; border-radius: 4px;">Level ${node.level}</span>
              ${hasChildren ? `<span style="font-size: 11px; color: #059669; background: #d1fae5; padding: 2px 6px; border-radius: 4px;">${node.children.length} referral${node.children.length !== 1 ? 's' : ''}</span>` : ''}
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; font-size: 12px; color: #4b5563;">
              <div><strong>Email:</strong> ${node.email || 'N/A'}</div>
              <div><strong>Phone:</strong> ${node.phone || 'N/A'}</div>
              ${node.referredBy ? `<div><strong>Referred By:</strong> ${node.referredBy.firstName} ${node.referredBy.lastName} (${node.referredBy.registrationId})</div>` : ''}
              <div><strong>Subscriptions:</strong> ${node.subscriptionsCount}</div>
              <div><strong>Total Payouts:</strong> ₹${Number(node.totalPayouts).toLocaleString()}</div>
            </div>
            ${node.chitGroups.length > 0 ? `
              <div style="margin-top: 8px; padding: 8px; background: #f9fafb; border-radius: 4px; font-size: 11px;">
                <strong style="color: #374151;">Chit Groups (${node.chitGroups.length}):</strong>
                <div style="margin-top: 4px; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 6px;">
                  ${node.chitGroups.map(group => `
                    <div style="padding: 6px; background: white; border: 1px solid #e5e7eb; border-radius: 4px;">
                      <div><strong>${group.name}</strong> (${group.chitId})</div>
                      <div style="color: #6b7280;">₹${Number(group.amount).toLocaleString()} • ${group.duration} months • ${group.status}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    let childrenHtml = '';
    if (hasChildren) {
      childrenHtml = `<div id="${childrenId}" class="tree-children" style="display: block;">`;
      node.children.forEach((child, index) => {
        const isLastChild = index === node.children.length - 1;
        const childNodeId = `${nodeId}-${index}`;
        const childResult = flattenTreeToList(child, level + 1, isLastChild, nextPrefix, childNodeId);
        childrenHtml += childResult.html;
      });
      childrenHtml += '</div>';
    }

    return { html: html + childrenHtml, nodeId };
  };

  const generatePrintableContent = () => {
    if (!referralTree) return '';

    const treeResult = flattenTreeToList(referralTree);
    const treeList = treeResult.html;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Referral Tree - ${referralTree.firstName} ${referralTree.lastName}</title>
          <meta charset="utf-8">
          <style>
            @media print {
              @page {
                margin: 1cm;
                size: A4;
              }
              body {
                margin: 0;
                padding: 0;
              }
              .no-print {
                display: none;
              }
              .toggle-btn {
                display: none !important;
              }
              .tree-children {
                display: block !important;
              }
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              font-size: 12px;
              line-height: 1.5;
              color: #111827;
              background: white;
              padding: 20px;
            }
            .header {
              margin-bottom: 24px;
              padding-bottom: 16px;
              border-bottom: 2px solid #3b82f6;
            }
            .header h1 {
              font-size: 24px;
              color: #1e40af;
              margin-bottom: 8px;
            }
            .header-info {
              display: flex;
              gap: 24px;
              font-size: 11px;
              color: #6b7280;
            }
            .tree-item {
              page-break-inside: avoid;
            }
            .tree-item:hover {
              background: #f9fafb;
            }
            .toggle-btn {
              transition: background-color 0.2s;
            }
            .toggle-btn:hover {
              background: #2563eb !important;
            }
            .toggle-btn:active {
              background: #1d4ed8 !important;
            }
            .tree-children {
              transition: opacity 0.2s;
            }
            .tree-children.collapsed {
              display: none !important;
            }
            .controls {
              margin-bottom: 16px;
              padding: 12px;
              background: #f3f4f6;
              border-radius: 8px;
              display: flex;
              gap: 8px;
              flex-wrap: wrap;
            }
            .control-btn {
              padding: 6px 12px;
              background: #3b82f6;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
              transition: background-color 0.2s;
            }
            .control-btn:hover {
              background: #2563eb;
            }
            .control-btn:active {
              background: #1d4ed8;
            }
          </style>
          <script>
            function toggleNode(childrenId, toggleId) {
              const children = document.getElementById(childrenId);
              const toggle = document.getElementById(toggleId);
              
              if (children && toggle) {
                if (children.classList.contains('collapsed')) {
                  children.classList.remove('collapsed');
                  toggle.textContent = '−';
                } else {
                  children.classList.add('collapsed');
                  toggle.textContent = '+';
                }
              }
            }
            
            function expandAll() {
              const allChildren = document.querySelectorAll('.tree-children');
              const allToggles = document.querySelectorAll('.toggle-btn');
              
              allChildren.forEach(children => {
                children.classList.remove('collapsed');
              });
              
              allToggles.forEach(toggle => {
                toggle.textContent = '−';
              });
            }
            
            function collapseAll() {
              const allChildren = document.querySelectorAll('.tree-children');
              const allToggles = document.querySelectorAll('.toggle-btn');
              
              allChildren.forEach(children => {
                children.classList.add('collapsed');
              });
              
              allToggles.forEach(toggle => {
                toggle.textContent = '+';
              });
            }
            
            // Expand all by default on load
            window.addEventListener('DOMContentLoaded', function() {
              expandAll();
            });
          </script>
        </head>
        <body>
          <div class="header">
            <h1>Referral Tree Report</h1>
            <div class="header-info">
              <div><strong>Root User:</strong> ${referralTree.firstName} ${referralTree.lastName} (${referralTree.registrationId})</div>
              <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
            </div>
          </div>
          <div class="controls no-print">
            <button class="control-btn" onclick="expandAll()">Expand All</button>
            <button class="control-btn" onclick="collapseAll()">Collapse All</button>
          </div>
          <div class="tree-content">
            ${treeList}
          </div>
        </body>
      </html>
    `;
  };

  const handleDownloadPDF = async () => {
    if (!referralTree || !selectedUser) {
      toast({
        title: 'No Tree to Export',
        description: 'Please select a user and load the referral tree first',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`/api/reports/export-referral-tree-pdf?registrationId=${selectedUser}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `referral-tree-${referralTree.registrationId}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'PDF Export Complete',
        description: 'Referral tree PDF downloaded successfully',
        variant: 'success',
      });
    } catch (error: any) {
      console.error('PDF export error:', error);
      toast({
        title: 'PDF Export Failed',
        description: error.message || 'Failed to export referral tree as PDF',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = () => {
    if (!referralTree) {
      toast({
        title: 'No Tree to Download',
        description: 'Please select a user and load a referral tree first',
        variant: 'destructive',
      });
      return;
    }

    try {
      const content = generatePrintableContent();
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `referral-tree-${referralTree.registrationId}-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download Complete',
        description: 'Referral tree list downloaded successfully',
        variant: 'default',
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to download referral tree',
        variant: 'destructive',
      });
    }
  };

  const toggleFullscreen = () => {
    const element = containerRef.current?.closest('.fullscreen-target') || containerRef.current;
    if (!element) return;

    if (!isFullscreen) {
      // Enter fullscreen
      if ((element as any).requestFullscreen) {
        (element as any).requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        (element as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Drag handlers for canvas
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    if (!containerRef.current) return;
    
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left + containerRef.current.scrollLeft,
      y: e.clientY - rect.top + containerRef.current.scrollTop,
    });
    setScrollPosition({
      left: containerRef.current.scrollLeft,
      top: containerRef.current.scrollTop,
    });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    containerRef.current.scrollLeft = dragStart.x - x;
    containerRef.current.scrollTop = dragStart.y - y;
    e.preventDefault();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const expandAllNodes = () => {
    if (referralTree) {
      const allNodeIds = getAllNodeIds(referralTree);
      setExpandedNodes(new Set(allNodeIds));
    }
  };

  const collapseAllNodes = () => {
    if (referralTree) {
      setExpandedNodes(new Set([referralTree.id]));
    }
  };

  // Transform ReferralNode to d3 hierarchy format, respecting expanded nodes
  const transformToD3Hierarchy = useCallback((node: ReferralNode): any => {
    const isExpanded = expandedNodes.has(node.id);
    const children = isExpanded && node.children && node.children.length > 0
      ? node.children.map(child => transformToD3Hierarchy(child))
      : [];

    return {
      ...node,
      children: children.length > 0 ? children : undefined,
    };
  }, [expandedNodes]);

  // Create d3 hierarchy and tree layout - horizontal layout (levels as rows)
  const treeData = useMemo(() => {
    if (!referralTree || !d3Loaded || !d3Ref.current) return null;

    try {
      const d3 = d3Ref.current;
      if (!d3 || !d3.hierarchy) {
        console.error('d3.hierarchy is not available');
        return null;
      }
      
      const transformed = transformToD3Hierarchy(referralTree);
      const hierarchy = d3.hierarchy(transformed);
      
      if (!hierarchy) {
        console.error('Failed to create hierarchy');
        return null;
      }
    
    // Calculate dimensions based on tree size - compact layout
    const nodeWidth = 280;
    const nodeHeight = 45;
    const levelHeight = 90; // Vertical spacing between levels (rows) - reduced from 300
    const horizontalSpacing = 300; // Horizontal spacing between nodes in same level - reduced from 320
    const margin = 100; // Margin around the tree
    
    // Group nodes by depth (level)
    const nodesByLevel: HierarchyNode[][] = [];
    hierarchy.each((node: HierarchyNode) => {
      if (!nodesByLevel[node.depth]) {
        nodesByLevel[node.depth] = [];
      }
      nodesByLevel[node.depth].push(node);
    });

    const maxDepth = hierarchy.height;
    const levelLengths = nodesByLevel.map(level => level.length);
    const maxNodesAtAnyLevel = levelLengths.length > 0 ? Math.max(...levelLengths) : 1;

    // Calculate dimensions
    const width = Math.max(1200, maxNodesAtAnyLevel * horizontalSpacing) + margin * 2;
    const height = (maxDepth + 1) * levelHeight + margin * 2;

    // Store level Y positions for step labels
    const levelYPositions: Map<number, number> = new Map();

    // Position nodes: each level is a horizontal row
    nodesByLevel.forEach((levelNodes, depth) => {
      if (levelNodes.length === 0) return;
      
      const y = margin + depth * levelHeight + levelHeight / 2;
      levelYPositions.set(depth, y);
      
      const totalWidth = levelNodes.length * horizontalSpacing;
      const startX = (width - totalWidth) / 2 + horizontalSpacing / 2;
      
      levelNodes.forEach((node, index) => {
        node.x = startX + index * horizontalSpacing;
        node.y = y;
      });
    });

      return { hierarchy, width, height, nodeWidth, nodeHeight, levelYPositions };
    } catch (error) {
      console.error('Error creating tree layout:', error);
      return null;
    }
  }, [referralTree, transformToD3Hierarchy, expandedNodes, d3Loaded]);

  // Scroll to center when tree data is ready
  useEffect(() => {
    if (treeData && containerRef.current) {
      // Wait for next frame to ensure DOM is updated
      setTimeout(() => {
        if (containerRef.current) {
          const scrollWidth = containerRef.current.scrollWidth;
          const clientWidth = containerRef.current.clientWidth;
          const scrollHeight = containerRef.current.scrollHeight;
          const clientHeight = containerRef.current.clientHeight;
          const scrollLeft = (scrollWidth - clientWidth) / 2;
          const scrollTop = (scrollHeight - clientHeight) / 2;
          containerRef.current.scrollTo({ top: scrollTop, left: scrollLeft, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [treeData]);

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

  const renderNodeCard = (node: ReferralNode, hierarchyNode: HierarchyNode) => {
    const isHighlighted = highlightedNode === node.id;
    
    // Always check the original tree for children, not the transformed hierarchy
    const originalNode = findNodeInTree(node.id, referralTree);
    const hasChildren = originalNode ? (originalNode.children && originalNode.children.length > 0) : false;
    const isExpanded = expandedNodes.has(node.id);
    const childrenCount = hasChildren && originalNode ? originalNode.children.length : 0;

    // Compact single-line dimensions - increased width to fit full names
    const cardWidth = 280;
    const cardHeight = 45;

    return (
      <g key={node.id} transform={`translate(${hierarchyNode.x}, ${hierarchyNode.y})`}>
        <foreignObject
          x={-cardWidth / 2}
          y={-cardHeight / 2}
          width={cardWidth}
          height={cardHeight}
        >
          <div className="relative flex items-center">
            <div 
              className={`flex items-center gap-2 px-3 py-2 rounded-md border-2 transition-all duration-200 cursor-pointer ${
                isHighlighted 
                  ? 'ring-2 ring-primary border-primary bg-primary/10' 
                  : 'border-primary/20 bg-white hover:border-primary/40 hover:bg-primary/5'
              } ${!isExpanded && hasChildren ? 'border-orange-300 bg-orange-50/50' : ''}`}
              onClick={(e) => {
                // Don't trigger if clicking on expand/collapse button
                if (!(e.target as HTMLElement).closest('.expand-toggle-area') && 
                    !(e.target as HTMLElement).closest('button')) {
                  handleNodeClick(node, e);
                }
              }}
            >
              {/* Expand/Collapse Indicator */}
              {hasChildren ? (
                <button
                  className="expand-toggle-area flex items-center justify-center w-6 h-6 rounded bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNodeExpansion(node.id);
                  }}
                  title={isExpanded ? 'Collapse children' : 'Expand children'}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-primary" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-primary" />
                  )}
                </button>
              ) : (
                <div className="w-6 h-6 flex-shrink-0"></div>
              )}
              
              {/* Level indicator dot */}
              <div className={`w-2 h-2 ${getNodeColor(node.level, isHighlighted)} rounded-full flex-shrink-0`}></div>
              
              {/* Name only */}
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm text-gray-900 whitespace-nowrap">
                  {node.firstName} {node.lastName}
                </span>
              </div>
              
              {/* View Details Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNodeClick(node, e);
                }}
                className="h-7 px-2 text-xs flex-shrink-0"
                title="View Details"
              >
                View
              </Button>
            </div>
          </div>
        </foreignObject>
      </g>
    );
  };

  const handlePrint = () => {
    if (!referralTree) {
      toast({
        title: 'No Tree to Print',
        description: 'Please select a user and load a referral tree first',
        variant: 'destructive',
      });
      return;
    }

    try {
      const printContent = generatePrintableContent();
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        toast({
          title: 'Print Failed',
          description: 'Please allow popups for this site to print',
          variant: 'destructive',
        });
        return;
      }

      printWindow.document.write(printContent);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        setTimeout(() => printWindow.close(), 1000);
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
        description: 'Failed to generate print preview',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 overflow-x-hidden max-w-full" style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-full">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient-primary">Referral Tree</h1>
          <p className="text-muted-foreground">
            Hierarchical visualization of your referral network and hierarchy
          </p>
        </div>
      </div>

      {/* User Selection */}
      <Card className="shadow-glow border-2 border-primary/20 w-full">
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
          <SearchableUser
            value={selectedUser}
            onValueChange={setSelectedUser}
            placeholder="Select a user to view referral tree"
            className="w-full border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
            showNoOption={false}
          />
        </CardContent>
      </Card>

      {/* Referral Counts Stats */}
      {referralCounts && referralTree && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-glow border-2 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Direct Referrals</p>
                  <p className="text-3xl font-bold text-primary mt-2">{referralCounts.directReferralCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">Immediate referrals</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Indirect Referrals</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{referralCounts.indirectReferralCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total downline network</p>
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
      {referralTree && (
        <Card className="shadow-glow border-2 border-primary/20 sticky top-0 z-50 bg-background w-full">
          <CardContent className="p-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold text-primary">Tree Controls</h3>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={expandAllNodes}>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Expand all nodes</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={collapseAllNodes}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Collapse all nodes</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={handleDownload}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Download as HTML list</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Export as PDF</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Print referral tree</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setShowConnections(!showConnections)}>
                        <Network className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Toggle connection lines</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setZoomLevel(Math.max(0.3, zoomLevel - 0.1))}>
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Zoom out</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}>
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Zoom in</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={resetView}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Reset view</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
              <span className="ml-2">Loading referral tree...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !d3Loaded && referralTree && (
        <Card className="shadow-glow border-2 border-primary/20 w-full">
          <CardContent className="p-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading visualization library...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && d3Loaded && referralTree && treeData && (
        <Card className="shadow-glow border-2 border-primary/20 fullscreen-target w-full max-w-full overflow-hidden" style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
          <CardHeader className="bg-gradient-primary text-white rounded-t-lg">
            <CardTitle className="text-white flex items-center gap-2">
              <TreePine className="h-5 w-5" />
              Referral Tree for {referralTree.firstName} {referralTree.lastName}
            </CardTitle>
            <CardDescription className="text-yellow-100">
              Hierarchical tree visualization starting from {referralTree.registrationId}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 w-full max-w-full overflow-hidden" style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
            <div 
              ref={containerRef}
              className="overflow-x-auto overflow-y-auto"
              style={{ 
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                maxHeight: isFullscreen ? '100vh' : 'calc(100vh - 300px)',
                height: isFullscreen ? '100vh' : 'auto',
                minHeight: isFullscreen ? '100vh' : '600px',
                cursor: isDragging ? 'grabbing' : 'grab',
                boxSizing: 'border-box',
                contain: 'layout style'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              <div
                ref={canvasRef}
                style={{ 
                  width: `${treeData.width * zoomLevel}px`,
                  height: `${treeData.height * zoomLevel}px`,
                  position: 'relative',
                  transition: isDragging ? 'none' : 'width 0.3s ease, height 0.3s ease',
                  userSelect: 'none',
                  flexShrink: 0
                }}
              >
                <svg
                  ref={svgRef}
                  width={treeData.width * zoomLevel}
                  height={treeData.height * zoomLevel}
                  viewBox={`0 0 ${treeData.width} ${treeData.height}`}
                  preserveAspectRatio="xMidYMid meet"
                  className="border border-gray-200 rounded-lg bg-white"
                  style={{ display: 'block', minWidth: '100%', height: '100%' }}
                >
                  {/* Arrow marker definition */}
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="10"
                      markerHeight="10"
                      refX="9"
                      refY="3"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3, 0 6" fill="rgb(59, 130, 246)" />
                    </marker>
                  </defs>

                  {/* Step labels on the left side of each level */}
                  {treeData.levelYPositions && Array.from(treeData.levelYPositions.entries()).map(([level, yPos]) => {
                    // Position label on the left side
                    const labelX = 20;
                    // Find the leftmost node in this level to draw the connecting line
                    const nodesInLevel = treeData.hierarchy.descendants().filter(
                      (node: HierarchyNode) => node.depth === level && node.x !== undefined && node.y !== undefined
                    );
                    const leftmostX = nodesInLevel.length > 0 
                      ? Math.min(...nodesInLevel.map((n: HierarchyNode) => n.x!))
                      : labelX + 100;
                    
                    return (
                      <g key={`step-label-${level}`}>
                        <text
                          x={labelX}
                          y={yPos}
                          textAnchor="start"
                          fontSize="14"
                          fontWeight="bold"
                          fill="rgb(59, 130, 246)"
                          className="select-none"
                        >
                          Step {level}
                        </text>
                        {/* Dashed line connecting the label to the level */}
                        {nodesInLevel.length > 0 && (
                          <line
                            x1={labelX + 60}
                            y1={yPos}
                            x2={leftmostX - 20}
                            y2={yPos}
                            stroke="rgb(200, 200, 200)"
                            strokeWidth="1"
                            strokeDasharray="3,3"
                            strokeOpacity="0.4"
                          />
                        )}
                      </g>
                    );
                  })}

                  {/* Connection lines */}
                  {showConnections && treeData.hierarchy.links && treeData.hierarchy.links().map((link: any, i: number) => {
                    const source = link.source as HierarchyNode;
                    const target = link.target as HierarchyNode;
                    // Only draw if both nodes have valid positions
                    if (source.x === undefined || source.y === undefined || 
                        target.x === undefined || target.y === undefined) {
                      return null;
                    }
                    return (
                      <line
                        key={`link-${i}`}
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke="rgb(59, 130, 246)"
                        strokeWidth="2"
                        strokeOpacity="0.6"
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  })}

                  {/* Nodes */}
                  {treeData.hierarchy.descendants && treeData.hierarchy.descendants().map((node: HierarchyNode) => {
                    const nodeData = node.data as ReferralNode;
                    // Only render if node has valid position
                    if (node.x === undefined || node.y === undefined) {
                      return null;
                    }
                    return renderNodeCard(nodeData, node);
                  })}
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !referralTree && selectedUser && (
        <Card className="shadow-glow border-2 border-primary/20 w-full">
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
        <Card className="shadow-glow border-2 border-primary/20 w-full">
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

      {/* Scheme Details Dialog */}
      <Dialog open={showSchemeDialog} onOpenChange={setShowSchemeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Scheme Details
            </DialogTitle>
            <DialogDescription>
              Chit scheme subscriptions for {selectedNodeForSchemes?.firstName} {selectedNodeForSchemes?.lastName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedNodeForSchemes && (
            <Card className="border-2 border-primary/20">
              <CardHeader className="bg-gradient-secondary text-white rounded-t-lg">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Chit Schemes ({selectedNodeForSchemes.chitGroups.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {selectedNodeForSchemes.chitGroups.length > 0 ? (
                  <div className="space-y-3">
                    {selectedNodeForSchemes.chitGroups.map((group, index) => (
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
                    <p className="text-muted-foreground">No active chit schemes found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

