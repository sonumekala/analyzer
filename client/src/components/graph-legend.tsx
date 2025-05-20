import { useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";

export default function GraphLegend() {
  const [isOpen, setIsOpen] = useState(false);
  
  const entityTypes = [
    { type: "Program", color: "bg-blue-600", description: "COBOL program or main routine" },
    { type: "Database", color: "bg-green-600", description: "Database accessed by programs" },
    { type: "API", color: "bg-purple-600", description: "API or external service endpoint" },
    { type: "File", color: "bg-orange-600", description: "File resource read or written" },
    { type: "Screen", color: "bg-teal-600", description: "UI screen or terminal interface" },
    { type: "Kafka", color: "bg-red-600", description: "Kafka topic or message queue" },
    { type: "Queue", color: "bg-pink-600", description: "Transaction or message queue" },
    { type: "Procedure", color: "bg-indigo-600", description: "Procedure or subroutine" },
    { type: "DataElement", color: "bg-yellow-600", description: "Data element or variable" },
  ];
  
  const relationshipTypes = [
    { type: "Calls", color: "#3b82f6", description: "Program calls or invokes another" },
    { type: "CalledBy", color: "#8b5cf6", description: "Program is called by another" },
    { type: "Reads", color: "#10b981", description: "Reads data from source" },
    { type: "Writes", color: "#ef4444", description: "Writes data to destination" },
    { type: "Contains", color: "#f59e0b", description: "Parent-child relationship" },
    { type: "Uses", color: "#6366f1", description: "Utilizes or depends on" },
    { type: "DependsOn", color: "#ec4899", description: "Requires to function" },
  ];
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1 h-7 text-xs border border-border"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          Legend
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Entity Types</h4>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              {entityTypes.map(({ type, color, description }) => (
                <div key={type} className="flex items-center gap-2">
                  <div className={cn("w-4 h-4 rounded", color)} />
                  <span className="font-medium min-w-[100px]">{type}</span>
                  <span className="text-muted-foreground">{description}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Relationship Types</h4>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              {relationshipTypes.map(({ type, color, description }) => (
                <div key={type} className="flex items-center gap-2">
                  <div className="w-10 flex items-center">
                    <div className="h-[2px] w-full" style={{ backgroundColor: color }} />
                  </div>
                  <span className="font-medium min-w-[100px]">{type}</span>
                  <span className="text-muted-foreground">{description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}