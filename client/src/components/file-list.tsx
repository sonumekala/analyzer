import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateSimple, calculateFileSizeDisplay } from "@/lib/utils";
import { deleteCobolFile } from "@/lib/cobol-service";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type FileListProps = {
  selectedFileId?: number;
  onSelectFile: (fileId: number) => void;
  showValidity?: boolean;
};

export default function FileList({ selectedFileId, onSelectFile, showValidity = false }: FileListProps) {
  const { toast } = useToast();
  const [fileToDelete, setFileToDelete] = useState<number | null>(null);

  const { data: files = [], isLoading, isError } = useQuery({
    queryKey: ['/api/files'],
    queryFn: async () => {
      const response = await fetch('/api/files', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      return response.json();
    }
  });

  const handleDeleteFile = async () => {
    if (fileToDelete === null) return;
    
    try {
      await deleteCobolFile(fileToDelete);
      toast({
        title: "File deleted",
        description: "The file has been deleted successfully."
      });
      
      // If the deleted file was selected, clear the selection
      if (selectedFileId === fileToDelete) {
        onSelectFile(-1);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the file.",
        variant: "destructive"
      });
    } finally {
      setFileToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="border border-neutral-200 rounded-md p-3 text-center">
        <p className="text-sm text-neutral-500">Loading files...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border border-neutral-200 rounded-md p-3 text-center">
        <p className="text-sm text-red-500">Error loading files</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="border border-neutral-200 rounded-md p-3 text-center">
        <p className="text-sm text-neutral-500">No files uploaded yet</p>
      </div>
    );
  }

  return (
    <>
      {showValidity && (
        <div className="mb-2 px-2 py-1.5 bg-background border border-border rounded-md text-xs flex items-center gap-4">
          <div className="flex items-center">
            <span className="inline-flex h-2 w-2 rounded-full bg-green-500 mr-1.5"></span>
            <span>Valid COBOL</span>
          </div>
          <div className="flex items-center">
            <span className="inline-flex h-2 w-2 rounded-full bg-red-500 mr-1.5"></span>
            <span>Invalid COBOL</span>
          </div>
          <div className="flex items-center">
            <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 mr-1.5"></span>
            <span>Unknown</span>
          </div>
        </div>
      )}
      
      <div className="border border-neutral-200 rounded-md bg-neutral-50 divide-y divide-neutral-200">
        {files.map((file: any) => (
          <div 
            key={file.id}
            className={`p-2 hover:bg-neutral-100 cursor-pointer transition-colors ${
              selectedFileId === file.id ? 'bg-primary-50' : ''
            }`}
            onClick={() => onSelectFile(file.id)}
          >
            <div className="flex items-center text-primary-600">
              <FileText className="h-4 w-4 mr-1.5 flex-shrink-0" />
              <span className="font-semibold text-sm truncate">{file.filename}</span>
              <span className="ml-auto text-xs text-neutral-500 flex-shrink-0">
                {file.content ? file.content.split('\n').length : 0} LOC
              </span>
              
              {showValidity && (
                <div className="ml-2 flex-shrink-0">
                  <span className={`inline-flex h-2 w-2 rounded-full ${
                    file.isValid === false 
                      ? 'bg-red-500' 
                      : file.isValid === true 
                        ? 'bg-green-500'
                        : 'bg-amber-500'
                  }`} />
                </div>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  setFileToDelete(file.id);
                }}
              >
                <Trash2 className="h-3 w-3 text-neutral-400 hover:text-red-500" />
              </Button>
            </div>
            
            <div className="text-xs text-neutral-500 mt-1 flex justify-between">
              <div className="flex items-center">
                <span>Modified {formatDateSimple(new Date(file.uploadedAt))}</span>
                
                {showValidity && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-background border border-border">
                    {file.isValid === true
                      ? "Valid"
                      : file.isValid === false
                        ? "Invalid"
                        : "Unknown"}
                  </span>
                )}
              </div>
              
              <span>{calculateFileSizeDisplay(file.fileSize)}</span>
            </div>
          </div>
        ))}
      </div>
      
      <AlertDialog open={fileToDelete !== null} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the file
              and all associated analysis results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDeleteFile}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
