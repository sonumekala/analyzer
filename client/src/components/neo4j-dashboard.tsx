import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, Database, Network, Settings } from "lucide-react";
import { Link } from "wouter";
import Neo4jGraphViewer from "./neo4j-graph-viewer";

interface Neo4jDashboardProps {
  className?: string;
  analysisMode?: 'individual' | 'project' | 'combined';
}

export default function Neo4jDashboard({ className, analysisMode = 'individual' }: Neo4jDashboardProps) {
  const [view, setView] = useState<"graph" | "settings">("graph");
  
  // Get Neo4j connection status
  const { data: statusData, isLoading } = useQuery({
    queryKey: ['/api/neo4j/status'],
    retry: false,
  });
  
  const isUsingInMemory = statusData?.status === 'in-memory';
  const isConnected = statusData?.status === 'connected';
  
  return (
    <div className={className}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            <Database className="h-6 w-6 inline-block mr-2 -mt-1" />
            Neo4j Graph Database
          </h2>
          <p className="text-muted-foreground">
            {analysisMode === 'individual'
              ? 'Interactive visualization of individual COBOL program entity relationships'
              : 'Interactive visualization of project-wide COBOL entity relationships'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Alert className="bg-muted px-4 py-1.5 h-auto">
              <AlertTitle className="text-sm font-medium flex gap-2 items-center">
                Database Status:
                <span className={isUsingInMemory ? "text-amber-500" : "text-green-500"}>
                  {isUsingInMemory ? "In-Memory" : "Neo4j Connected"}
                </span>
              </AlertTitle>
            </Alert>
          )}
          {isUsingInMemory && (
            <Link href="/settings">
              <Button size="sm" variant="outline" className="ml-2">
                <Settings className="h-4 w-4 mr-1" />
                Configure Neo4j
              </Button>
            </Link>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="graph" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="graph" className="flex items-center gap-1">
            <Network className="h-4 w-4" />
            Graph View
          </TabsTrigger>
          <TabsTrigger value="explorer" className="flex items-center gap-1">
            <Database className="h-4 w-4" />
            Entity Explorer
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="graph">
          <Neo4jGraphViewer analysisMode={analysisMode} />
        </TabsContent>
        
        <TabsContent value="explorer">
          <Card>
            <CardHeader>
              <CardTitle>Entity Explorer</CardTitle>
              <CardDescription>
                Browse and search all entities and their relationships
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[500px] flex items-center justify-center">
              <div className="text-center p-8">
                <Database className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">Entity Explorer Coming Soon</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  This feature will allow you to browse and search through all entities and 
                  relationships in a tabular form with advanced filtering capabilities.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}