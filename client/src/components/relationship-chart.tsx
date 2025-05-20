import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AnalysisReport } from "@shared/schema";
import RelationshipGraph from "./relationship-graph";

type RelationshipChartProps = {
  analysis?: AnalysisReport;
  isLoading?: boolean;
};

export default function RelationshipChart({ analysis, isLoading }: RelationshipChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Entity Relationships</CardTitle>
          <CardDescription>Neo4j-style visualization of COBOL program relationships</CardDescription>
        </CardHeader>
        <CardContent className="h-[500px] flex items-center justify-center">
          <p className="text-neutral-500">Loading relationships...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis || !analysis.entities || analysis.entities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Entity Relationships</CardTitle>
          <CardDescription>Neo4j-style visualization of COBOL program relationships</CardDescription>
        </CardHeader>
        <CardContent className="h-[500px] flex items-center justify-center">
          <p className="text-neutral-500">Run analysis to see entity relationships</p>
        </CardContent>
      </Card>
    );
  }

  // Use the Neo4j-style RelationshipGraph component
  return (
    <RelationshipGraph 
      entities={analysis.entities}
      relationships={analysis.relationships}
      isLoading={isLoading}
    />
  );
}
