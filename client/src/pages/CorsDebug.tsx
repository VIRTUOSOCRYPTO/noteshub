import React, { useState, useEffect } from 'react';
import { API_BASE_URL, apiGet } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

// A special page for debugging CORS issues in production
export default function CorsDebug() {
  const [corsStatus, setCorsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [corsResult, setCorsResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [allEndpoints, setAllEndpoints] = useState<{ 
    name: string;
    url: string;
    status?: string;
    data?: any;
    error?: string;
  }[]>([]);

  // Test all endpoints
  useEffect(() => {
    const endpoints = [
      { name: 'Database Status', url: '/api/db-status' },
      { name: 'DB Check', url: '/api/db-check' },
      { name: 'DB Status Alternative', url: '/api/dbstatus' },
      { name: 'API Status', url: '/api/status' },
      { name: 'API Ping', url: '/api/ping' },
      { name: 'API Test', url: '/api/test' },
      { name: 'CORS Test', url: '/api/cors-test' },
    ];
    
    setAllEndpoints(endpoints);
  }, []);

  // Test a specific endpoint
  const testEndpoint = async (endpoint: string) => {
    try {
      const response = await apiGet(endpoint);
      return { status: 'success', data: response };
    } catch (error) {
      return { status: 'error', error: error instanceof Error ? error.message : String(error) };
    }
  };

  // Test all endpoints and update their status
  const testAllEndpoints = async () => {
    const updatedEndpoints = [...allEndpoints];
    
    for (let i = 0; i < updatedEndpoints.length; i++) {
      const endpoint = updatedEndpoints[i];
      setAllEndpoints(prev => 
        prev.map((ep, idx) => 
          idx === i ? { ...ep, status: 'testing' } : ep
        )
      );
      
      const result = await testEndpoint(endpoint.url);
      
      setAllEndpoints(prev => 
        prev.map((ep, idx) => 
          idx === i ? { ...ep, status: result.status, data: result.data } : ep
        )
      );
    }
  };

  // Run the CORS test
  const runCorsTest = async () => {
    setCorsStatus('loading');
    setErrorMessage('');
    
    try {
      const result = await apiGet('/api/cors-test');
      setCorsResult(result);
      setCorsStatus('success');
    } catch (error) {
      setCorsStatus('error');
      setErrorMessage(error instanceof Error ? error.message : String(error));
      console.error('CORS test failed:', error);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">CORS Debugging Tool</h1>
      
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Environment Information</CardTitle>
            <CardDescription>Details about the current environment and API configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Frontend Origin:</h3>
                <code className="bg-muted p-2 rounded block">{window.location.origin}</code>
              </div>
              
              <div>
                <h3 className="font-semibold">API Base URL:</h3>
                <code className="bg-muted p-2 rounded block">{API_BASE_URL || 'Same origin (no base URL set)'}</code>
              </div>
              
              <div>
                <h3 className="font-semibold">Cross-Origin Request?</h3>
                <p>{API_BASE_URL && !API_BASE_URL.startsWith(window.location.origin) ? 'Yes (CORS needed)' : 'No (Same origin)'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="test-all">
        <TabsList className="mb-4">
          <TabsTrigger value="test-all">Test All Endpoints</TabsTrigger>
          <TabsTrigger value="cors-test">CORS Test Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="test-all">
          <Card>
            <CardHeader>
              <CardTitle>Endpoint Status</CardTitle>
              <CardDescription>Test all endpoints to verify CORS configuration</CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                {allEndpoints.map((endpoint, index) => (
                  <div key={index} className="p-4 border rounded-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{endpoint.name}</h3>
                        <code className="text-sm text-muted-foreground">{endpoint.url}</code>
                      </div>
                      <div>
                        {endpoint.status === 'success' && (
                          <span className="text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs">
                            Success ✓
                          </span>
                        )}
                        {endpoint.status === 'error' && (
                          <span className="text-red-600 bg-red-100 px-2 py-1 rounded-full text-xs">
                            Failed ✗
                          </span>
                        )}
                        {endpoint.status === 'testing' && (
                          <span className="text-blue-600 bg-blue-100 px-2 py-1 rounded-full text-xs animate-pulse">
                            Testing...
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {endpoint.status === 'success' && endpoint.data && (
                      <div className="mt-2 p-2 bg-muted rounded text-xs">
                        <pre className="whitespace-pre-wrap overflow-x-auto">
                          {JSON.stringify(endpoint.data, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {endpoint.status === 'error' && endpoint.error && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-800">
                        Error: {endpoint.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
            
            <CardFooter>
              <Button onClick={testAllEndpoints}>
                Test All Endpoints
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="cors-test">
          <Card>
            <CardHeader>
              <CardTitle>CORS Test</CardTitle>
              <CardDescription>
                Test the CORS configuration specifically with credentials
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={runCorsTest}
                  disabled={corsStatus === 'loading'}
                >
                  {corsStatus === 'loading' ? 'Testing...' : 'Run CORS Test'}
                </Button>
                
                {corsStatus === 'error' && (
                  <div className="p-4 bg-red-50 rounded border border-red-200 text-red-800">
                    <h3 className="font-semibold mb-2">Error</h3>
                    <p>{errorMessage}</p>
                  </div>
                )}
                
                {corsStatus === 'success' && corsResult && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold">CORS Test Results:</h3>
                      <div className="bg-muted p-4 rounded-md overflow-x-auto">
                        <pre className="text-sm">
                          {JSON.stringify(corsResult, null, 2)}
                        </pre>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-semibold">Response Headers:</h3>
                      <div className="bg-muted p-4 rounded-md">
                        {corsResult.cors?.responseHeaders && Object.entries(corsResult.cors.responseHeaders).map(([key, value]) => (
                          <div key={key} className="pb-2">
                            <span className="font-mono text-sm">{key}:</span> <span className="text-sm">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-8 text-sm text-muted-foreground">
        <p>Use this tool to help diagnose CORS issues between frontend and API deployments.</p>
        <p>API Base URL: {API_BASE_URL || 'Same origin'}</p>
      </div>
    </div>
  );
}
