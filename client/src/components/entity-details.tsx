import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { AnalysisReport } from "@shared/schema";

type EntityDetailsProps = {
  analysis?: AnalysisReport;
  isLoading?: boolean;
};

export default function EntityDetails({ analysis, isLoading }: EntityDetailsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Entity Details</CardTitle>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center">
          <p className="text-neutral-500">Loading entity details...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis || !analysis.entities || analysis.entities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Entity Details</CardTitle>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center">
          <p className="text-neutral-500">No entities found or run analysis to see entity details</p>
        </CardContent>
      </Card>
    );
  }

  // Group entities by type for easier navigation
  const groupedEntities = analysis.entities.reduce((acc, entity) => {
    if (!acc[entity.type]) {
      acc[entity.type] = [];
    }
    acc[entity.type].push(entity);
    return acc;
  }, {} as Record<string, typeof analysis.entities>);

  // Get a count of each entity type
  const entityCounts = Object.entries(groupedEntities).map(([type, entities]) => ({
    type,
    count: entities.length
  }));

  // Sort entity types by count (descending)
  entityCounts.sort((a, b) => b.count - a.count);

  return (
    <div className="p-4 max-h-[500px] overflow-y-auto">
      <div className="mb-3 pb-3 border-b">
        <h4 className="text-sm font-medium mb-2">Entity Types</h4>
        <div className="flex flex-wrap gap-2">
          {entityCounts.map(({type, count}) => (
            <div key={type} className="text-xs border rounded-full px-2 py-1 flex items-center gap-1">
              <span>{type}</span>
              <span className="bg-secondary text-secondary-foreground rounded-full px-1.5 py-0.5">{count}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* List all entities by type */}
      <div className="space-y-4">
        {entityCounts.map(({type}) => (
          <div key={type} className="border rounded-md p-3">
            <h3 className="font-medium text-sm mb-2">{type} Entities</h3>
            <div className="space-y-2">
              {groupedEntities[type].map((entity) => (
                <div key={entity.id} className="border-t pt-2">
                  <h4 className="font-medium text-sm">{entity.name}</h4>
                  {entity.description && (
                    <p className="text-xs text-muted-foreground">{entity.description}</p>
                  )}
                  {entity.operations && entity.operations.length > 0 && (
                    <div className="mt-1">
                      <div className="text-xs text-muted-foreground">Operations:</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {entity.operations.map((op, idx) => (
                          <span key={idx} className="text-xs bg-muted px-1.5 py-0.5 rounded">{op}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
