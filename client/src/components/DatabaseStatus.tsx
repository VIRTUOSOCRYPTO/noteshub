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
        const data = await apiGet<DatabaseStatus>('/api/db-status');
        setStatus(data);
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
