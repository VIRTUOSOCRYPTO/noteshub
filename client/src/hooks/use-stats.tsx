import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export type UserStats = {
  uploadCount: number;
  downloadCount: number;
  viewCount: number;
  daysSinceJoined: number;
  uniqueSubjectsCount: number;
  pagesVisited: number;
};

/**
 * Hook to get user stats including locally tracked achievements
 */
export function useStats() {
  // Set up a query to fetch stats from the API
  const { data: apiStats, isLoading, error } = useQuery<UserStats>({
    queryKey: ['/api/user/stats'],
    queryFn: async () => {
      const response = await fetch('/api/user/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      return await response.json() as UserStats;
    },
  });
  
  // Combine API stats with locally tracked stats
  const getAugmentedStats = (): UserStats => {
    // Start with the API stats or defaults
    const baseStats: UserStats = apiStats || {
      uploadCount: 0,
      downloadCount: 0,
      viewCount: 0,
      daysSinceJoined: 0,
      uniqueSubjectsCount: 0,
      pagesVisited: 0
    };
    
    try {
      // Get unique subjects viewed
      const viewedSubjectsStr = localStorage.getItem('viewedSubjects') || '[]';
      const viewedSubjects = JSON.parse(viewedSubjectsStr) as string[];
      
      // Get unique pages visited
      const visitedPagesStr = localStorage.getItem('visitedPages') || '[]';
      const visitedPages = JSON.parse(visitedPagesStr) as string[];
      
      // Return augmented stats
      return {
        ...baseStats,
        uniqueSubjectsCount: Math.max(baseStats.uniqueSubjectsCount, viewedSubjects.length),
        pagesVisited: Math.max(baseStats.pagesVisited, visitedPages.length)
      };
    } catch (error) {
      console.error('Error reading local stats:', error);
      return baseStats;
    }
  };
  
  // Get the final stats by combining API and local data
  const stats = getAugmentedStats();
  
  return {
    stats,
    isLoading,
    error
  };
}