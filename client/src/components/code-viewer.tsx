import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { getCobolFile } from "@/lib/cobol-service";
import Prism from "prismjs";
import "prismjs/components/prism-cobol";
import CodeAssistant from "@/components/code-assistant";
import { AIConfig } from "@shared/schema";

type CodeViewerProps = {
  fileId?: number;
  aiConfig?: AIConfig;
};

export default function CodeViewer({ fileId, aiConfig }: CodeViewerProps) {
  const { data: file, isLoading } = useQuery({
    queryKey: [`/api/files/${fileId}`],
    queryFn: async () => {
      if (!fileId) return null;
      return getCobolFile(fileId);
    },
    enabled: !!fileId
  });

  useEffect(() => {
    if (file?.content) {
      Prism.highlightAll();
    }
  }, [file?.content]);

  if (!fileId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Source Code</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-neutral-500">Select a file to view its source code</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Source Code</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-neutral-500">Loading code...</p>
        </CardContent>
      </Card>
    );
  }

  if (!file) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Source Code</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-neutral-500">Failed to load code</p>
        </CardContent>
      </Card>
    );
  }

  const lineCount = file.content.split('\n').length;

  const defaultAIConfig: AIConfig = {
    modelName: "llama3-8b",
    modelTemperature: 0.7,
    contextWindow: 4096,
    detailLevel: "Standard"
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle>Source Code</CardTitle>
          <div className="text-xs bg-neutral-100 px-2 py-1 rounded">{lineCount} LOC</div>
        </CardHeader>
        <div className="max-h-96 overflow-auto scrollbar-thin">
          <pre className="p-4 bg-neutral-800 text-neutral-200 rounded-b-lg">
            <code className="language-cobol text-sm">
              {file.content}
            </code>
          </pre>
        </div>
      </Card>
      
      {/* Code Assistant */}
      {fileId && file && (
        <CodeAssistant 
          fileId={fileId} 
          codeContent={file.content}
          aiConfig={aiConfig || defaultAIConfig}
        />
      )}
    </div>
  );
}
