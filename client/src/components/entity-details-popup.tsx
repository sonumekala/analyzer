import { X, Database, Table2, FileText, FileCode, MonitorSmartphone, Clock } from 'lucide-react';
import { Entity, Relationship } from '@shared/schema';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface EntityDetailsPopupProps {
  entity: Entity;
  relationships: Relationship[];
  onClose: () => void;
}

export function EntityDetailsPopup({ entity, relationships, onClose }: EntityDetailsPopupProps) {
  // Filter relationships where this entity is source or target
  const entityRelationships = relationships.filter(r => 
    (r.source === entity.id || r.sourceId === entity.id) || 
    (r.target === entity.id || r.targetId === entity.id)
  );

  // Categorize incoming and outgoing relationships
  const incomingRelationships = entityRelationships.filter(r => 
    r.target === entity.id || r.targetId === entity.id
  );
  const outgoingRelationships = entityRelationships.filter(r => 
    r.source === entity.id || r.sourceId === entity.id
  );

  // Get entity icon based on type
  const getEntityIcon = () => {
    switch (entity.type) {
      case 'Program':
      case 'Subprogram':
      case 'Procedure':
      case 'Function':
        return <FileCode className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'Database':
        return <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'Table':
        return <Table2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'File':
        return <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case 'Screen':
        return <MonitorSmartphone className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      default:
        return <FileCode className="w-5 h-5 text-slate-600 dark:text-slate-400" />;
    }
  };

  // Format entity timestamps
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch (e) {
      return "Unknown";
    }
  };

  // Format a relationship for display
  const formatRelationship = (relationship: Relationship, isIncoming: boolean) => {
    const relatedEntityId = isIncoming 
      ? (relationship.source || relationship.sourceId) 
      : (relationship.target || relationship.targetId);
    
    // Find the related entity in the relationships array
    const relatedEntity = relationships.find(r => 
      r.id === relatedEntityId ||
      r.source === relatedEntityId ||
      r.target === relatedEntityId ||
      r.sourceId === relatedEntityId ||
      r.targetId === relatedEntityId
    );

    // Get the entity name using the appropriate fields from the relationship
    const entityName = isIncoming
      ? (relationship.sourceName || `Entity #${relatedEntityId}`)
      : (relationship.targetName || `Entity #${relatedEntityId}`);
    
    // Get entity type similarly from the relationship
    const entityType = isIncoming
      ? (relationship.sourceType || "Unknown") 
      : (relationship.targetType || "Unknown");
    
    return (
      <div key={relationship.id} className="py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={isIncoming ? "default" : "outline"}>
              {relationship.type}
            </Badge>
            <span className="text-sm">{entityName}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {entityType}
          </Badge>
        </div>
      </div>
    );
  };

  // Get badge color based on entity type
  const getTypeBadgeVariant = () => {
    switch (entity.type) {
      case 'Program':
      case 'Subprogram':
      case 'Function':
      case 'Procedure':
        return 'default';
      case 'File':
        return 'secondary';
      case 'Database':
      case 'Table':
        return 'default';
      case 'Screen':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="fixed right-4 top-20 w-80 z-50 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {getEntityIcon()}
            <div>
              <CardTitle className="text-lg">{entity.name}</CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1">
                <Badge variant={getTypeBadgeVariant()}>{entity.type}</Badge>
                {/* Timestamp data is disabled as the Entity type doesn't include standard timestamp fields */}
              </CardDescription>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-full p-1 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      
      <CardContent>
        {entity.description && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-1">Description</h4>
            <p className="text-sm text-muted-foreground">{entity.description}</p>
          </div>
        )}
        
        {/* Entity properties */}
        {entity.properties && Object.keys(entity.properties).length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-1">Properties</h4>
            <div className="rounded-md border p-2">
              {Object.entries(entity.properties).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <span className="text-xs font-medium">{key}</span>
                  <span className="text-xs text-muted-foreground">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Entity operations (if they exist) */}
        {entity.operations && entity.operations.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-1">Operations</h4>
            <div className="flex flex-wrap gap-1">
              {entity.operations.map(op => (
                <Badge key={op} variant="outline">{op}</Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Relationships section */}
        <div>
          <h4 className="text-sm font-medium mb-1">Relationships</h4>
          
          <ScrollArea className="h-48 rounded-md border p-2">
            {entityRelationships.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No relationships found
              </p>
            ) : (
              <>
                {/* Incoming relationships */}
                {incomingRelationships.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-xs font-semibold mb-1 text-muted-foreground">
                      Incoming ({incomingRelationships.length})
                    </h5>
                    {incomingRelationships.map(rel => formatRelationship(rel, true))}
                  </div>
                )}
                
                {incomingRelationships.length > 0 && outgoingRelationships.length > 0 && (
                  <Separator className="my-2" />
                )}
                
                {/* Outgoing relationships */}
                {outgoingRelationships.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold mb-1 text-muted-foreground">
                      Outgoing ({outgoingRelationships.length})
                    </h5>
                    {outgoingRelationships.map(rel => formatRelationship(rel, false))}
                  </div>
                )}
              </>
            )}
          </ScrollArea>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end pt-0">
        <Badge 
          variant="outline" 
          className="text-xs font-normal"
        >
          Entity ID: {entity.id}
        </Badge>
      </CardFooter>
    </Card>
  );
};

export default EntityDetailsPopup;