import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Form schema for Neo4j configuration
const neo4jConfigSchema = z.object({
  uri: z.string().min(1, "URI is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type Neo4jConfigFormValues = z.infer<typeof neo4jConfigSchema>;

export default function Neo4jSettings() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isUsingInMemory, setIsUsingInMemory] = useState<boolean>(true);
  const [configDetails, setConfigDetails] = useState<{ uri?: string, username?: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form for Neo4j configuration
  const form = useForm<Neo4jConfigFormValues>({
    resolver: zodResolver(neo4jConfigSchema),
    defaultValues: {
      uri: "",
      username: "",
      password: "",
    },
  });

  // Define type for status response
  interface Neo4jStatusResponse {
    status: 'in-memory' | 'connected' | 'disconnected';
    config?: {
      uri: string;
      username: string;
    };
  }
  
  // Query to get Neo4j connection status
  const { data: statusData, isLoading: isStatusLoading } = useQuery<Neo4jStatusResponse>({
    queryKey: ['/api/neo4j/status'],
    retry: false
  });
  
  // Handle data changes
  useEffect(() => {
    if (statusData) {
      setIsUsingInMemory(statusData.status === 'in-memory');
      setIsConnected(statusData.status === 'connected');
      
      if (statusData.config) {
        setConfigDetails(statusData.config);
        form.setValue('uri', statusData.config.uri);
        form.setValue('username', statusData.config.username);
      }
    } else {
      setIsUsingInMemory(true);
      setIsConnected(false);
    }
  }, [statusData, form]);

  // Mutation to configure Neo4j connection
  const { mutate: configureNeo4j, isPending: isConfiguring } = useMutation({
    mutationFn: async (data: Neo4jConfigFormValues) => {
      return fetch('/api/neo4j/configure', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Connection Successful",
        description: "Successfully connected to Neo4j database.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/neo4j/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error?.response?.data?.message || "Failed to connect to Neo4j. Please check your credentials.",
        variant: "destructive",
      });
    },
  });

  // Mutation to switch to in-memory mode
  const { mutate: switchToInMemory, isPending: isSwitching } = useMutation({
    mutationFn: async () => {
      return fetch('/api/neo4j/use-in-memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Mode Switched",
        description: "Using in-memory graph storage.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/neo4j/status'] });
    },
    onError: () => {
      toast({
        title: "Mode Switch Failed",
        description: "Failed to switch to in-memory mode.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  function onSubmit(data: Neo4jConfigFormValues) {
    configureNeo4j(data);
  }

  // Handle switch to in-memory mode
  function handleSwitchToInMemory() {
    switchToInMemory();
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Neo4j Graph Database
          {isStatusLoading ? (
            <Loader2 className="h-4 w-4 animate-spin ml-2" />
          ) : (
            <Badge variant={isConnected ? "default" : "outline"}>
              {isUsingInMemory ? "In-Memory" : "Connected"}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Configure connection to a Neo4j database for enhanced graph visualization and querying.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {configDetails && !isUsingInMemory && (
          <Alert className="mb-4">
            <AlertTitle>Currently Connected</AlertTitle>
            <AlertDescription>
              Connected to Neo4j at {configDetails.uri} as user {configDetails.username}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="uri"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Neo4j URI</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="neo4j://localhost:7687" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    The URI to your Neo4j database (e.g., neo4j://hostname:7687)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="neo4j" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex gap-4 pt-2">
              <Button 
                type="submit" 
                disabled={isConfiguring || isStatusLoading}
              >
                {isConfiguring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Connect to Neo4j
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleSwitchToInMemory}
                disabled={isSwitching || isUsingInMemory || isStatusLoading}
              >
                {isSwitching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Use In-Memory Storage
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col items-start text-sm text-muted-foreground">
        <p>Using in-memory storage means your graph data won't persist after server restart.</p>
        {isUsingInMemory && (
          <p className="mt-2">
            ℹ️ Currently using in-memory graph storage. Configure a Neo4j connection for persistent storage.
          </p>
        )}
      </CardFooter>
    </Card>
  );
}