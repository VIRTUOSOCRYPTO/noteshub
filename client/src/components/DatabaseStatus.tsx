import React, { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';

type DatabaseStatus = {
  status: 'ok' | 'warning' | 'error';
  message: string;
  fallback: boolean;
};

export const DatabaseStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkDatabaseStatus = async () => {
      try {
        setIsLoading(true);
        // Try the original endpoint first
        try {
          const data = await apiGet<DatabaseStatus>('/api/db-status');
          setStatus(data);
          return; // If successful, exit early
        } catch (primaryError) {
          console.log('Primary database status endpoint failed, trying alternative...');
          
          // If original endpoint fails, try the alternatives in sequence
          // Array of backup endpoints to try
          const backupEndpoints = [
            '/api/db-check',
            '/api/dbstatus',
            '/api/status',
            '/api/ping',
            '/api/test',
            '/api/notes',
            '/api/users',
          ];
          
          // Try each endpoint in sequence until one works
          for (const endpoint of backupEndpoints) {
            try {
              console.log(`Trying alternative endpoint: ${endpoint}`);
              const data = await apiGet(endpoint);
              console.log(`Successfully connected to ${endpoint}:`, data);
              
              // If we get here, the server is at least responsive
              setStatus({
                status: 'ok',
                message: `Connected via ${endpoint}`,
                fallback: false
              });
              return; // Exit if any endpoint succeeds
            } catch (error) {
              console.log(`Failed to connect to ${endpoint}:`, error);
              // Continue to the next endpoint
            }
          }
          
          // If we reach here, all endpoints failed
          throw new Error('All database status endpoints failed');
        }
      } catch (error) {
        console.error('Failed to check database status:', error);
        setStatus({
          status: 'error',
          message: 'Could not connect to server',
          fallback: true
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Check status immediately and then every 60 seconds
    checkDatabaseStatus();
    const interval = setInterval(checkDatabaseStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center text-xs text-muted-foreground">
        <div className="w-2 h-2 rounded-full bg-gray-300 mr-2 animate-pulse"></div>
        Checking database...
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="flex items-center text-xs">
      {status.status === 'ok' && (
        <>
          <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
          <span className="text-green-700 dark:text-green-400">Database connected</span>
        </>
      )}
      
      {status.status === 'warning' && (
        <>
          <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
          <span className="text-yellow-700 dark:text-yellow-400" title={status.message}>
            Fallback storage active
          </span>
        </>
      )}
      
      {status.status === 'error' && (
        <>
          <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
          <span className="text-red-700 dark:text-red-400" title={status.message}>
            Database connection failed
          </span>
        </>
      )}
    </div>
  );
};
