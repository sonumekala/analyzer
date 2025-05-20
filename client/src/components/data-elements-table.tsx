import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataElement } from "@shared/schema";

type DataElementsTableProps = {
  inputElements?: DataElement[];
  outputElements?: DataElement[];
};

export default function DataElementsTable({ 
  inputElements = [], 
  outputElements = [] 
}: DataElementsTableProps) {
  const hasInput = inputElements && inputElements.length > 0;
  const hasOutput = outputElements && outputElements.length > 0;
  
  if (!hasInput && !hasOutput) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Elements</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-4">
          <p className="text-neutral-500">No data elements detected</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Elements</CardTitle>
      </CardHeader>
      <CardContent>
        {hasInput && (
          <div className="mb-6">
            <h3 className="text-md font-medium mb-3 flex items-center">
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 mr-2">Input</Badge>
              Input Data Elements
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-neutral-100">
                    <th className="p-2 text-left font-medium text-sm">Name</th>
                    <th className="p-2 text-left font-medium text-sm">Type</th>
                    <th className="p-2 text-left font-medium text-sm">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {inputElements.map((element, index) => (
                    <tr key={index} className="border-b border-neutral-200">
                      <td className="p-2 font-mono text-sm">{element.name}</td>
                      <td className="p-2 text-sm">{element.type}</td>
                      <td className="p-2 text-sm">{element.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {hasOutput && (
          <div>
            <h3 className="text-md font-medium mb-3 flex items-center">
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 mr-2">Output</Badge>
              Output Data Elements
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-neutral-100">
                    <th className="p-2 text-left font-medium text-sm">Name</th>
                    <th className="p-2 text-left font-medium text-sm">Type</th>
                    <th className="p-2 text-left font-medium text-sm">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {outputElements.map((element, index) => (
                    <tr key={index} className="border-b border-neutral-200">
                      <td className="p-2 font-mono text-sm">{element.name}</td>
                      <td className="p-2 text-sm">{element.type}</td>
                      <td className="p-2 text-sm">{element.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}