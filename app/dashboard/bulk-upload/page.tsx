'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, FileText, CheckCircle, AlertCircle, ArrowLeft, Users } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

interface UploadResult {
  success: number;
  errors: number;
  results: Array<{
    registrationId: string;
    email?: string;
    name: string;
  }>;
  errorDetails: string[];
}

export default function BulkUploadPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an Excel file (.xlsx or .xls)',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select a file smaller than 5MB',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'No file selected',
        description: 'Please select an Excel file to upload',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/users/bulk-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result: UploadResult = await response.json();

      if (response.ok) {
        setUploadResult(result);
        toast({
          title: 'Upload completed!',
          description: `Successfully uploaded ${result.success} users with ${result.errors} errors.`,
          variant: 'success',
        });
      } else {
        toast({
          title: 'Upload failed',
          description: result.errorDetails?.join(', ') || 'An error occurred during upload',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/reports/template', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to download template');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulk-upload-template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Template downloaded',
        description: 'Excel template has been downloaded successfully',
        variant: 'success',
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download failed',
        description: 'Failed to download template',
        variant: 'destructive',
      });
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/users">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bulk Upload Users</h1>
          <p className="text-muted-foreground">
            Upload multiple users at once using an Excel file
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* File Upload Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Excel File
              </CardTitle>
              <CardDescription>
                Select an Excel file with user data to bulk upload
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {!selectedFile ? (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 mx-auto text-gray-400" />
                    <div>
                      <p className="text-lg font-medium">Drop your Excel file here</p>
                      <p className="text-sm text-muted-foreground">
                        or click to browse files
                      </p>
                    </div>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                    >
                      Choose File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <FileText className="h-12 w-12 mx-auto text-green-500" />
                    <div>
                      <p className="text-lg font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={handleUpload}
                        disabled={uploading}
                      >
                        {uploading ? 'Uploading...' : 'Upload File'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={resetUpload}
                        disabled={uploading}
                      >
                        Change File
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  {/* <Progress value={uploadProgress} className="w-full" /> */}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload Results */}
          {uploadResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Upload Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {uploadResult.success}
                    </div>
                    <div className="text-sm text-muted-foreground">Successfully Added</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {uploadResult.errors}
                    </div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {uploadResult.success + uploadResult.errors}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Processed</div>
                  </div>
                </div>

                {/* Success Results */}
                {uploadResult.results.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Successfully Added Users:</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {uploadResult.results.map((user, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="font-mono">{user.registrationId}</span>
                          <span>-</span>
                          <span>{user.name}</span>
                          {user.email && (
                            <span className="text-muted-foreground">({user.email})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error Details */}
                {uploadResult.errorDetails.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-red-600">Errors:</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {uploadResult.errorDetails.map((error, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm text-red-600">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Information Panel */}
        <div className="space-y-6">
          {/* Template Download */}
          <Card>
            <CardHeader>
              <CardTitle>Download Template</CardTitle>
              <CardDescription>
                Get the Excel template for bulk upload
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={downloadTemplate}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="text-sm">
                    <strong>Download the template</strong> and fill in user details
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="text-sm">
                    <strong>Required fields:</strong> First Name, Last Name, Phone
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="text-sm">
                    <strong>Optional fields:</strong> Email, Address, Referred By (Registration ID), Chit ID, Nominee Details
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="text-sm">
                    <strong>Password:</strong> Default password is the last 6 digits of phone number
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="text-sm">
                    <strong>Chit Subscription:</strong> If Chit ID is provided, user will be automatically subscribed to that chit
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="text-sm">
                    <strong>File size:</strong> Maximum 5MB
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Format */}
          <Card>
            <CardHeader>
              <CardTitle>Template Format</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2 font-medium">
                  <span>Column</span>
                  <span>Description</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-mono">A</span>
                  <span>First Name *</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-mono">B</span>
                  <span>Last Name *</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-mono">C</span>
                  <span>Email (Optional)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-mono">D</span>
                  <span>Phone *</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-mono">E</span>
                  <span>Address (Optional)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-mono">F</span>
                  <span>Referred By (Optional)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-mono">G</span>
                  <span>Chit ID (Optional)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-mono">H</span>
                  <span>Nominee Name (Optional)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-mono">I</span>
                  <span>Nominee Relation (Optional)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-mono">J</span>
                  <span>Nominee Age (Optional)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-mono">K</span>
                  <span>Nominee Date of Birth (Optional)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Phone numbers must be unique and 10 digits</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Email addresses must be unique (if provided)</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Referrer must have less than 3 referrals</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Don&apos;t include header row in template</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Chit ID must be a valid active chit scheme ID</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Nominee relation options: spouse, son, daughter, father, mother, brother, sister, other</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Date format for nominee DOB: YYYY-MM-DD</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
