import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings as SettingsIcon, Database, BrainCircuit } from "lucide-react";
import Neo4jSettings from "../components/neo4j-settings";

export default function Settings() {
  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight"><SettingsIcon className="h-8 w-8 inline-block mr-2 -mt-1" />Settings</h1>
          <p className="text-lg text-muted-foreground mt-1">
            Configure application settings and external integrations
          </p>
        </div>
      </div>

      <Tabs defaultValue="database" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="database" className="gap-2">
            <Database className="h-4 w-4" /> Database
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <BrainCircuit className="h-4 w-4" /> AI Models
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="database" className="space-y-8">
          <Neo4jSettings />
          
          <Card>
            <CardHeader>
              <CardTitle>Relational Database Settings</CardTitle>
              <CardDescription>
                Configure settings for the relational database used to store file and analysis metadata
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Currently using in-memory storage for file and analysis metadata. 
                These settings will be available in a future update when database persistence is needed.
              </p>
              
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="database-type">Database Type</Label>
                  <Input id="database-type" value="In-Memory" disabled />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" disabled>Configure Database</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="ai" className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>OpenAI Integration</CardTitle>
              <CardDescription>
                Configure your OpenAI API key to use GPT-4o for enhanced COBOL analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="openai-key">OpenAI API Key</Label>
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder="sk-..."
                  />
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-between">
              <p className="text-sm text-muted-foreground">
                Your API key is stored securely and used only for analysis requests
              </p>
              <Button type="submit">Save API Key</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Local AI Models</CardTitle>
              <CardDescription>
                Configure settings for local AI models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                The application currently uses a simulated LLM for demonstration. In a production environment,
                you would be able to configure local AI model settings here.
              </p>
              
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="model-name">Default Model</Label>
                  <Input id="model-name" value="llama3-8b" disabled />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" disabled>Configure Local Models</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}