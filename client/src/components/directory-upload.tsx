import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DirectoryInput } from '@/components/ui/directory-input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, Check, AlertCircle } from 'lucide-react';
import { uploadCobolDirectory } from '@/lib/cobol-service';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

type DirectoryUploadProps = {
  onUploadSuccess?: () => void;
  variant?: 'default' | 'compact' | 'full';
  className?: string;
};

export default function DirectoryUpload({ onUploadSuccess, variant = 'default', className = '' }: DirectoryUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [filesUploaded, setFilesUploaded] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [failedUploads, setFailedUploads] = useState<string[]>([]);
  const { toast } = useToast();

  const handleDirectorySelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsUploading(true);
    setFailedUploads([]);
    setFilesUploaded(0);

    const files = Array.from(e.target.files);
    const cobolFiles = files.filter(file => {
      const fileName = file.name.toLowerCase();
      return fileName.endsWith('.cbl') || 
             fileName.endsWith('.cob') || 
             fileName.endsWith('.cobol') ||
             fileName.endsWith('.cpy') ||
             fileName.endsWith('.copy');
    });

    setTotalFiles(cobolFiles.length);

    if (cobolFiles.length === 0) {
      toast({
        title: 'No COBOL files found',
        description: 'The selected directory does not contain any COBOL files (.cbl, .cob, .cobol, .cpy, or .copy)',
        variant: 'destructive',
      });
      setIsUploading(false);
      return;
    }

    console.log(`Found ${cobolFiles.length} COBOL files to upload`, cobolFiles.map(f => f.name));

    // Upload each COBOL file individually
    const uploadedCount = 0;
    const failedCount = 0;
    const failedFiles: string[] = [];

    for (const file of cobolFiles) {
      try {
        // Log each file being processed
        console.log(`Uploading file: ${file.name}, size: ${file.size}`);
        await uploadCobolDirectory(file);
        setFilesUploaded(prevCount => prevCount + 1);
      } catch (error) {
        console.error('Error uploading file:', file.name, error);
        failedFiles.push(file.name);
        setFailedUploads(prev => [...prev, file.name]);
      }
    }

    // Invalidate the files query to refresh the file list
    queryClient.invalidateQueries({ queryKey: ['/api/files'] });

    if (onUploadSuccess) {
      onUploadSuccess();
    }

    // Show success or partial success message
    if (failedUploads.length === 0) {
      toast({
        title: 'Directory uploaded successfully',
        description: `Successfully uploaded ${filesUploaded} COBOL files.`,
        variant: 'default',
      });
    } else {
      toast({
        title: 'Directory partially uploaded',
        description: `Uploaded ${filesUploaded} out of ${totalFiles} files. ${failedUploads.length} files failed.`,
        variant: 'destructive',
      });
    }

    setIsUploading(false);
  }, [onUploadSuccess, toast, failedUploads.length, filesUploaded]);

  return (
    <div className={`w-full ${className}`}>
      <DirectoryInput 
        type="file" 
        webkitdirectory="true"
        multiple 
        id="directory-upload"
        className="hidden"
        onChange={handleDirectorySelect}
      />
      
      {variant === 'compact' ? (
        <Button 
          className="w-full flex items-center justify-center" 
          onClick={() => document.getElementById('directory-upload')?.click()}
          disabled={isUploading}
        >
          <FolderOpen className="h-4 w-4 mr-1" />
          {isUploading ? `Uploading ${filesUploaded}/${totalFiles}...` : "Upload Directory"}
        </Button>
      ) : variant === 'full' ? (
        <div className="flex flex-col items-center">
          <label 
            htmlFor="directory-upload" 
            className={`w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 transition-colors cursor-pointer
              ${isUploading ? 'opacity-70 cursor-wait' : ''}
              ${filesUploaded > 0 && !isUploading ? 'border-green-400 bg-green-50/30' : 'border-gray-300 hover:border-primary-400 bg-gray-50'}`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center space-x-1 mb-2">
                  <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <p className="text-sm text-gray-600">
                  Uploading {filesUploaded}/{totalFiles} files...
                </p>
              </div>
            ) : filesUploaded > 0 && !isUploading ? (
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center text-green-600 mb-1">
                  <Check className="h-5 w-5 mr-1" />
                  <span className="font-medium">Upload Complete</span>
                </div>
                <p className="text-sm text-gray-600">
                  {filesUploaded} COBOL files uploaded successfully
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Click to upload more files
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <FolderOpen className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 text-center">
                  Upload an entire directory of COBOL files<br />
                  for project-wide analysis
                </p>
              </div>
            )}
          </label>
          
          {failedUploads.length > 0 && (
            <div className="mt-4 p-2 w-full bg-red-50 rounded-md border border-red-200">
              <div className="flex items-center text-red-800 mb-1">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Failed uploads:</span>
              </div>
              <ul className="list-disc list-inside text-xs text-red-700 ml-4">
                {failedUploads.slice(0, 3).map((file, index) => (
                  <li key={index}>{file}</li>
                ))}
                {failedUploads.length > 3 && (
                  <li>...and {failedUploads.length - 3} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <Card className="w-full shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="flex items-center text-base">
              <FolderOpen className="mr-2 h-4 w-4" />
              Project Directory Upload
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <label 
              htmlFor="directory-upload" 
              className={`flex items-center justify-center w-full h-20 px-4 
                      transition bg-white border-2 border-gray-300 border-dashed 
                      rounded-md appearance-none cursor-pointer 
                      hover:border-primary focus:outline-none ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center justify-center">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Uploading {filesUploaded}/{totalFiles} files...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-gray-400" />
                  <p className="pt-1 text-sm tracking-wider text-gray-600">
                    Select a Directory
                  </p>
                </div>
              )}
            </label>
          </CardContent>
          <CardFooter className="flex justify-between py-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => document.getElementById('directory-upload')?.click()}
              disabled={isUploading}
            >
              Select Directory
            </Button>
            {filesUploaded > 0 && !isUploading && (
              <div className="flex items-center text-green-600 text-sm">
                <Check className="h-4 w-4 mr-1" />
                Uploaded {filesUploaded} files
              </div>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}