import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cpu, FileText, AlertCircle, Code, Database, Activity } from "lucide-react";
import Header from "@/components/header";

export default function Welcome() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Cpu className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to COBOL SME Agent</CardTitle>
            <CardDescription className="mt-2">
              An AI-powered COBOL analysis tool that helps you understand and maintain your legacy COBOL applications
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-medium mb-4">COBOL Analysis Expertise</h3>
                  <p className="text-muted-foreground mb-4">
                    COBOL SME Agent works like a virtual COBOL expert, analyzing your legacy code to provide actionable insights.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    <div className="flex items-start">
                      <div className="mr-2 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Code className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">Code Analysis</h4>
                        <p className="text-xs text-muted-foreground">Detect issues and patterns in your COBOL code</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="mr-2 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Database className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">Database Mapping</h4>
                        <p className="text-xs text-muted-foreground">Identify database interactions and dependencies</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="mr-2 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">Relationship Mapping</h4>
                        <p className="text-xs text-muted-foreground">Visualize program dependencies and call flows</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="mr-2 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">Modernization</h4>
                        <p className="text-xs text-muted-foreground">Get recommendations for code improvement</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button className="mt-8 w-full" onClick={() => setLocation("/dashboard")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>
              
              <div className="relative overflow-hidden rounded-lg border border-border">
                <img 
                  src="/cobol-analysis.png" 
                  alt="COBOL Analysis Screenshot" 
                  className="w-full h-auto object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-3">
                  <p className="text-xs font-medium">
                    Comprehensive analysis of COBOL program structure, entities, and relationships
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 bg-muted p-4 rounded-md">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-muted-foreground mr-2 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium mb-1">COBOL SME Agent uses AI to:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Identify relationships between entities</li>
                    <li>Analyze code quality and maintainability</li>
                    <li>Detect potential issues and vulnerabilities</li>
                    <li>Generate comprehensive documentation</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}