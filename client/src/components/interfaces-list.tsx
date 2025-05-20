import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgramInterface } from "@shared/schema";

// Define icon and color mappings for interface types
const interfaceTypeStyles = {
  "API": { icon: "🔌", color: "bg-purple-100 text-purple-800 border-purple-200" },
  "Database": { icon: "💾", color: "bg-green-100 text-green-800 border-green-200" },
  "Screen": { icon: "🖥️", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  "File": { icon: "📄", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  "Kafka": { icon: "📨", color: "bg-red-100 text-red-800 border-red-200" },
  "Queue": { icon: "🔄", color: "bg-orange-100 text-orange-800 border-orange-200" },
  "Program": { icon: "🧠", color: "bg-blue-100 text-blue-800 border-blue-200" },
};

// Define direction colors
const directionColors = {
  "input": "bg-blue-100 text-blue-800 border-blue-200",
  "output": "bg-amber-100 text-amber-800 border-amber-200",
  "both": "bg-purple-100 text-purple-800 border-purple-200",
};

type InterfacesListProps = {
  title: string;
  interfaces: ProgramInterface[];
};

export default function InterfacesList({ title, interfaces = [] }: InterfacesListProps) {
  if (interfaces.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-4">
          <p className="text-neutral-500">No interfaces detected</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {interfaces.map((iface, index) => {
            const typeStyle = interfaceTypeStyles[iface.type] || 
              { icon: "⚙️", color: "bg-gray-100 text-gray-800 border-gray-200" };
            
            const directionColor = directionColors[iface.direction] ||
              "bg-gray-100 text-gray-800 border-gray-200";
              
            return (
              <li key={index} className="flex items-start p-3 border rounded-lg hover:bg-neutral-50">
                <div className="mr-3 text-2xl">{typeStyle.icon}</div>
                <div className="flex-1">
                  <div className="font-medium">{iface.name}</div>
                  <p className="text-sm text-neutral-600 mt-1">{iface.description}</p>
                  <div className="flex space-x-2 mt-2">
                    <Badge variant="outline" className={typeStyle.color}>{iface.type}</Badge>
                    <Badge variant="outline" className={directionColor}>
                      {iface.direction === "input" ? "Input" : 
                       iface.direction === "output" ? "Output" : "Input/Output"}
                    </Badge>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}