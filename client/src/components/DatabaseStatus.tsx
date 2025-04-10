import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, HelpCircle, Database } from 'lucide-react';

type DatabaseStatusResponse = {
  status: 'ok' | 'warning' | 'error';
  message: string;
  fallback: boolean;
  error?: string;
};

export function DatabaseStatus() {
  const { data, error, isLoading } = useQuery<DatabaseStatusResponse>({
    queryKey: ['/api/db-status'],
    refetchInterval: 30000, // Check every 30 seconds
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div className="flex items-center text-gray-400">
        <Database className="h-4 w-4 mr-1 animate-pulse" />
        <span className="text-xs">Checking...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center text-red-500">
        <AlertCircle className="h-4 w-4 mr-1" />
        <span className="text-xs">DB Error</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center text-gray-400">
        <HelpCircle className="h-4 w-4 mr-1" />
        <span className="text-xs">Unknown</span>
      </div>
    );
  }

  if (data.status === 'ok') {
    return (
      <div className="flex items-center text-green-500">
        <CheckCircle className="h-4 w-4 mr-1" />
        <span className="text-xs">DB Online</span>
      </div>
    );
  }

  if (data.status === 'warning') {
    return (
      <div className="flex items-center text-amber-500">
        <AlertCircle className="h-4 w-4 mr-1" />
        <span className="text-xs">DB Fallback</span>
      </div>
    );
  }

  // Error state
  return (
    <div className="flex items-center text-red-500">
      <AlertCircle className="h-4 w-4 mr-1" />
      <span className="text-xs">DB Error</span>
    </div>
  );
}
