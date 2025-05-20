import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisReport } from "@shared/schema";

type AnalysisSummaryProps = {
  analysis?: AnalysisReport;
  isLoading?: boolean;
};

export default function AnalysisSummary({ analysis, isLoading }: AnalysisSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-12 gap-6">
        <Card className="col-span-6">
          <CardHeader>
            <CardTitle>Code Structure</CardTitle>
          </CardHeader>
          <CardContent className="h-40 flex items-center justify-center">
            <p className="text-neutral-500">Loading analysis...</p>
          </CardContent>
        </Card>
        <Card className="col-span-6">
          <CardHeader>
            <CardTitle>Code Quality</CardTitle>
          </CardHeader>
          <CardContent className="h-40 flex items-center justify-center">
            <p className="text-neutral-500">Loading analysis...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="grid grid-cols-12 gap-6">
        <Card className="col-span-6">
          <CardHeader>
            <CardTitle>Code Structure</CardTitle>
          </CardHeader>
          <CardContent className="h-40 flex items-center justify-center">
            <p className="text-neutral-500">Run analysis to see code structure</p>
          </CardContent>
        </Card>
        <Card className="col-span-6">
          <CardHeader>
            <CardTitle>Code Quality</CardTitle>
          </CardHeader>
          <CardContent className="h-40 flex items-center justify-center">
            <p className="text-neutral-500">Run analysis to see code quality</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { codeStructure, codeQuality } = analysis;

  // Helper function to get color based on rating
  const getRatingColor = (rating: string) => {
    switch(rating) {
      case 'Good':
        return 'bg-green-500';
      case 'Fair':
        return 'bg-yellow-500';
      case 'Poor':
      case 'High': // For complexity, high is bad
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  // Helper function to get text color based on rating
  const getRatingTextColor = (rating: string) => {
    switch(rating) {
      case 'Good':
        return 'text-green-600';
      case 'Fair':
        return 'text-yellow-600';
      case 'Poor':
      case 'High': // For complexity, high is bad
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Code Structure Card */}
      <Card className="col-span-6">
        <CardHeader>
          <CardTitle>Code Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-neutral-200 rounded-md p-3 bg-neutral-50">
              <div className="text-neutral-500 text-sm mb-1">LOC:</div>
              <div className="text-lg font-semibold">{codeStructure.loc}</div>
            </div>
            <div className="border border-neutral-200 rounded-md p-3 bg-neutral-50">
              <div className="text-neutral-500 text-sm mb-1">Procedures:</div>
              <div className="text-lg font-semibold">{codeStructure.procedures}</div>
            </div>
            <div className="border border-neutral-200 rounded-md p-3 bg-neutral-50">
              <div className="text-neutral-500 text-sm mb-1">Data Items:</div>
              <div className="text-lg font-semibold">{codeStructure.dataItems}</div>
            </div>
            <div className="border border-neutral-200 rounded-md p-3 bg-neutral-50">
              <div className="text-neutral-500 text-sm mb-1">File Sections:</div>
              <div className="text-lg font-semibold">{codeStructure.fileSections}</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-200">
            <div className="text-neutral-500 text-sm mb-1">COBOL Dialect:</div>
            <div className="flex items-center gap-2">
              <div className="font-medium">{codeStructure.cobolDialect}</div>
              <div className="inline-flex h-5 items-center rounded-full border px-2.5 text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200">
                {codeStructure.cobolDialect.includes("Enterprise") && codeStructure.cobolDialect.includes("DB2") ? "IBM DB2" : 
                 codeStructure.cobolDialect.includes("Enterprise") ? "IBM Mainframe" : 
                 codeStructure.cobolDialect.includes("SQL") ? "Database Integration" :
                 codeStructure.cobolDialect.includes("Micro Focus") ? "Distributed" : 
                 codeStructure.cobolDialect.includes("Gnu") ? "Open Source" : 
                 codeStructure.cobolDialect.includes("COBOL II") ? "Legacy IBM" : 
                 codeStructure.cobolDialect.includes("VS") ? "Legacy IBM" :
                 codeStructure.cobolDialect.includes("COBOL/400") ? "AS/400" :
                 codeStructure.cobolDialect.includes("ACUCOBOL") ? "Distributed" :
                 codeStructure.cobolDialect.includes("Fujitsu") ? "Mainframe" :
                 codeStructure.cobolDialect.includes("RM/COBOL") ? "Distributed" :
                 codeStructure.cobolDialect.includes("COBOL-74") ? "Legacy" :
                 codeStructure.cobolDialect.includes("Object-Oriented") ? "OO COBOL" :
                 "Standard"}
              </div>
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              {codeStructure.cobolDialect.includes("Enterprise") && codeStructure.cobolDialect.includes("DB2") ? 
                "IBM mainframe COBOL with integrated DB2 database access using SQL" : 
               codeStructure.cobolDialect.includes("Enterprise") ? 
                "IBM mainframe environments, supports modern COBOL features" : 
               codeStructure.cobolDialect.includes("Micro Focus") && codeStructure.cobolDialect.includes("SQL") ? 
                "Micro Focus COBOL with integrated SQL for database access via ODBC/JDBC" :
               codeStructure.cobolDialect.includes("SQL") ? 
                "COBOL implementation with embedded SQL statements for database operations" :
               codeStructure.cobolDialect.includes("Micro Focus") ? 
                "PC and Unix-based platforms with enhanced features" :
               codeStructure.cobolDialect.includes("Gnu") ? 
                "Free open-source implementation with modern extensions" :
               codeStructure.cobolDialect.includes("COBOL II") ? 
                "1980s IBM mainframe dialect, predecessor to Enterprise COBOL" :
               codeStructure.cobolDialect.includes("VS") ? 
                "1970-80s IBM mainframe dialect with limited features" :
               codeStructure.cobolDialect.includes("COBOL/400") ? 
                "IBM AS/400 midrange computers, integrated with DB2/400" :
               codeStructure.cobolDialect.includes("ACUCOBOL") ? 
                "Enhanced portable COBOL with GUI and modern extensions" :
               codeStructure.cobolDialect.includes("Fujitsu") ? 
                "Mainframe and server implementations with Fujitsu extensions" :
               codeStructure.cobolDialect.includes("RM/COBOL") ? 
                "Portable implementation for multiple operating systems" :
               codeStructure.cobolDialect.includes("COBOL-74") ? 
                "Early ANSI standard, limited features compared to COBOL-85" :
               codeStructure.cobolDialect.includes("Object-Oriented") ? 
                "Object-oriented extensions to COBOL with classes and methods" :
               "ANSI COBOL-85 compliant standard implementation"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code Quality Card */}
      <Card className="col-span-6">
        <CardHeader>
          <CardTitle>Code Quality</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <div className="text-neutral-700">Maintainability</div>
              <div className={`font-medium ${getRatingTextColor(codeQuality.maintainability.rating)}`}>
                {codeQuality.maintainability.rating}
              </div>
            </div>
            <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getRatingColor(codeQuality.maintainability.rating)}`} 
                style={{ width: `${codeQuality.maintainability.score}%` }}
              ></div>
            </div>
          </div>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <div className="text-neutral-700">Documentation</div>
              <div className={`font-medium ${getRatingTextColor(codeQuality.documentation.rating)}`}>
                {codeQuality.documentation.rating}
              </div>
            </div>
            <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getRatingColor(codeQuality.documentation.rating)}`} 
                style={{ width: `${codeQuality.documentation.score}%` }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="text-neutral-700">Complexity</div>
              <div className={`font-medium ${getRatingTextColor(codeQuality.complexity.rating)}`}>
                {codeQuality.complexity.rating}
              </div>
            </div>
            <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getRatingColor(codeQuality.complexity.rating === 'Low' ? 'Good' : codeQuality.complexity.rating === 'Medium' ? 'Fair' : 'Poor')}`} 
                style={{ width: `${codeQuality.complexity.score}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
