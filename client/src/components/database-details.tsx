import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Database = {
  name: string;
  type: string;
  operations: ("read" | "update" | "delete" | "insert")[];
  tables: string[];
};

type DatabaseDetailsProps = {
  databases: Database[];
};

export default function DatabaseDetails({ databases = [] }: DatabaseDetailsProps) {
  if (databases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Database Operations</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-4">
          <p className="text-neutral-500">No database operations detected</p>
        </CardContent>
      </Card>
    );
  }
  
  // Define operation colors
  const operationColors = {
    "read": "bg-blue-100 text-blue-800 border-blue-200",
    "update": "bg-amber-100 text-amber-800 border-amber-200",
    "delete": "bg-red-100 text-red-800 border-red-200",
    "insert": "bg-green-100 text-green-800 border-green-200",
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Database Operations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {databases.map((db, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium">{db.name}</h3>
                  <p className="text-sm text-neutral-600">{db.type} Database</p>
                </div>
                <div className="flex space-x-2">
                  {db.operations.map((op) => (
                    <Badge key={op} variant="outline" className={operationColors[op]}>
                      {op.charAt(0).toUpperCase() + op.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Tables Accessed:</h4>
                <div className="flex flex-wrap gap-2">
                  {db.tables.map((table) => (
                    <Badge key={table} variant="outline" className="bg-gray-100">
                      {table}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}