import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud, FolderSearch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadCobolFile } from "@/lib/cobol-service";
import { queryClient } from "@/lib/queryClient";
import { isCobolFile } from "@/lib/utils";

type FileUploadProps = {
  onUploadSuccess?: (fileId?: number) => void;
  variant?: 'default' | 'compact' | 'full';
  className?: string;
};

export default function FileUpload({ onUploadSuccess, variant = 'default', className = '' }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Validate file is a COBOL file
    if (!isCobolFile(file.name)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a COBOL file (.cbl, .cob, .cobol)",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      const response = await uploadCobolFile(file);
      
      // Refresh the file list
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      
      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been uploaded.`,
      });
      
      if (onUploadSuccess && response) {
        onUploadSuccess(response.id);
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleScanDirectory = () => {
    toast({
      title: "Scan Directory",
      description: "This feature is not implemented yet",
    });
  };

  return (
    <div className={`w-full ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".cbl,.cob,.cobol"
        className="hidden"
      />
      
      {variant === 'compact' ? (
        <Button 
          className="w-full flex items-center justify-center" 
          onClick={handleUploadClick}
          disabled={isUploading}
        >
          <UploadCloud className="h-4 w-4 mr-1" />
          {isUploading ? "Uploading..." : "Upload COBOL File"}
        </Button>
      ) : variant === 'full' ? (
        <div className="flex flex-col items-center">
          <div 
            className={`w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 transition-colors cursor-pointer ${
              isDragging ? 'border-primary-500 bg-primary-50/30' : 'border-gray-300 hover:border-primary-400 bg-gray-50'
            }`}
            onClick={handleUploadClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <UploadCloud className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 text-center">
              {isUploading ? (
                <span className="flex items-center">
                  Uploading <span className="ml-1 flex space-x-1">
                    <span className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </span>
                </span>
              ) : (
                <>Drag and drop your COBOL file here<br />or click to browse</>
              )}
            </p>
          </div>
        </div>
      ) : (
        <>
          <Button 
            className="w-full mb-2 flex items-center justify-center" 
            onClick={handleUploadClick}
            disabled={isUploading}
          >
            <UploadCloud className="h-4 w-4 mr-1" />
            {isUploading ? "Uploading..." : "Upload Files"}
          </Button>
          
          <div 
            className={`mt-1 border rounded-md transition-colors text-center p-2 text-xs text-neutral-500 italic ${
              isDragging ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 bg-neutral-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            or drag files here
          </div>
        </>
      )}
    </div>
  );
}
