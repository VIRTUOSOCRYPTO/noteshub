import { useEffect } from "react";

/**
 * A hook to track unique page visits for the App Explorer achievement
 * 
 * @param pageName The name of the current page being visited
 */
export function usePageVisits(pageName: string) {
  useEffect(() => {
    try {
      // Get the current list of visited pages
      const visitedPagesStr = localStorage.getItem('visitedPages') || '[]';
      const visitedPages = JSON.parse(visitedPagesStr) as string[];
      
      // Add the current page if it's not already in the list
      if (!visitedPages.includes(pageName)) {
        visitedPages.push(pageName);
        localStorage.setItem('visitedPages', JSON.stringify(visitedPages));
      }
    } catch (error) {
      console.error('Error tracking page visit:', error);
    }
  }, [pageName]);

  // Return an empty object to avoid Fast Refresh errors - hooks must be consistent
  return {};
}