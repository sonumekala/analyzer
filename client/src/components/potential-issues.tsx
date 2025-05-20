import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { AnalysisReport } from "@shared/schema";

type PotentialIssuesProps = {
  analysis?: AnalysisReport;
  isLoading?: boolean;
};

export default function PotentialIssues({ analysis, isLoading }: PotentialIssuesProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Potential Issues</CardTitle>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center">
          <p className="text-neutral-500">Loading issues...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis || !analysis.issues || analysis.issues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Potential Issues</CardTitle>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center">
          <p className="text-neutral-500">No issues found or run analysis to see potential issues</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Potential Issues</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {analysis.issues.map((issue, index) => {
            const isWarning = issue.severity === 'warning';
            const isError = issue.severity === 'error';
            
            return (
              <div 
                key={index} 
                className={`p-3 ${isWarning ? 'bg-yellow-50 border border-yellow-200' : 
                  isError ? 'bg-red-50 border border-red-200' : 
                  'bg-blue-50 border border-blue-200'} rounded-md`}
              >
                <h4 className={`${isWarning ? 'text-yellow-800' : isError ? 'text-red-800' : 'text-blue-800'} font-medium flex items-center`}>
                  {isWarning ? (
                    <AlertTriangle className={`h-5 w-5 mr-1.5 ${isWarning ? 'text-yellow-500' : ''}`} />
                  ) : (
                    <AlertCircle className={`h-5 w-5 mr-1.5 ${isError ? 'text-red-500' : 'text-blue-500'}`} />
                  )}
                  {issue.type}
                </h4>
                <p className={`text-sm ${isWarning ? 'text-yellow-700' : isError ? 'text-red-700' : 'text-blue-700'} mt-1`}>
                  <strong>{issue.location}:</strong> {issue.description}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
