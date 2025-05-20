import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { getOrCreateAnalysis } from "@/lib/cobol-service";
import { AIConfig } from "@shared/schema";

import RelationshipGraph from "./relationship-graph";
import DataElementsTable from "./data-elements-table";
import InterfacesList from "./interfaces-list";
import DatabaseDetails from "./database-details";
import RefactoringSuggestions from "./refactoring-suggestions";

type ProgramSpecificationProps = {
  fileId?: number;
  aiConfig: AIConfig;
};

export default function ProgramSpecification({ fileId, aiConfig }: ProgramSpecificationProps) {
  const [activeLevel, setActiveLevel] = useState<string>("level1");
  
  const { data: analysis, isLoading } = useQuery({
    queryKey: [`/api/files/${fileId}/analysis`],
    queryFn: async () => {
      if (!fileId) return null;
      return getOrCreateAnalysis(fileId, aiConfig);
    },
    enabled: !!fileId,
  });
  
  if (!fileId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Program Specification</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-neutral-500">Select a COBOL program to view its specification</p>
        </CardContent>
      </Card>
    );
  }
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Program Specification</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-neutral-500">Analyzing program...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Program Specification</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-neutral-500">Failed to load program analysis</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Program Specification</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeLevel} onValueChange={setActiveLevel}>
          <TabsList className="mb-4">
            <TabsTrigger value="level1">Flow & Data</TabsTrigger>
            <TabsTrigger value="refactoring">Refactoring Suggestions</TabsTrigger>
            <TabsTrigger value="level2">Analysis (Coming Soon)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="level1">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Calling Chain</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-600 mb-4">
                    This diagram shows the program's calling chain from source interfaces 
                    (like API, screen) to destination interfaces (like database, messaging).
                  </p>
                  
                  {analysis.callingChain ? (
                    <RelationshipGraph 
                      mode="callingChain"
                      entities={analysis.entities}
                      relationships={analysis.relationships}
                      flowEntities={analysis.callingChain.flow}
                    />
                  ) : (
                    <div className="text-center py-4 text-neutral-500">
                      No calling chain data available
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DataElementsTable 
                  inputElements={analysis.inputDataElements} 
                  outputElements={analysis.outputDataElements}
                />
                
                <div className="space-y-6">
                  <InterfacesList 
                    title="Source Interfaces"
                    interfaces={analysis.callingChain?.sourceInterfaces || []}
                  />
                  
                  <InterfacesList 
                    title="Destination Interfaces"
                    interfaces={analysis.callingChain?.destinationInterfaces || []}
                  />
                </div>
              </div>
              
              <DatabaseDetails databases={analysis.databases || []} />
            </div>
          </TabsContent>
          
          <TabsContent value="refactoring">
            <div className="space-y-6">
              <RefactoringSuggestions 
                suggestions={analysis.refactoringSuggestions} 
                isLoading={isLoading} 
              />
            </div>
          </TabsContent>
          
          <TabsContent value="level2">
            <div className="py-12 text-center">
              <h3 className="text-lg font-medium text-neutral-700">Detailed Analysis Coming Soon</h3>
              <p className="text-neutral-500 mt-2">
                More detailed code structure insights and metrics will be available in a future update
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}