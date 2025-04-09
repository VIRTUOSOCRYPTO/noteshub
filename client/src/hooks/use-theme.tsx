import { createContext, useContext, ReactNode } from 'react';

// Empty theme context since we removed dark mode
type ThemeContextType = {
  // No theme toggles needed
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Simple theme provider with no dark mode functionality
  return (
    <ThemeContext.Provider value={{}}>
      {children}
    </ThemeContext.Provider>
  );
}

// This is kept for compatibility with existing imports but doesn't do anything now
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return {
    // Return empty object for backwards compatibility
  };
}