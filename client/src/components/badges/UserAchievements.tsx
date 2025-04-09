import { AchievementBadge } from "./AchievementBadge";
import { Upload, Download, Star, BookOpen, Award, Trophy, LibrarySquare, Map, Eye } from "lucide-react";
import { useState } from "react";
import { User } from "@shared/schema";
import { useStats, type UserStats } from "@/hooks/use-stats";

// Define achievement types
type Achievement = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  variant: "default" | "bronze" | "silver" | "gold" | "diamond";
  condition: (stats: UserStats) => boolean;
  progress?: (stats: UserStats) => { current: number; total: number };
};

export function UserAchievements({ user }: { user: any }) {
  // Use our custom hook to get combined API and local stats
  const { stats, isLoading } = useStats();
  
  // Default stats with the day count (always accurate even when API fails)
  const defaultStats: UserStats = {
    uploadCount: 0,
    downloadCount: 0,
    viewCount: 0,
    daysSinceJoined: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
    uniqueSubjectsCount: 0,
    pagesVisited: 0
  };

  // Define all possible achievements
  const achievements: Achievement[] = [
    {
      id: "uploader-bronze",
      label: "Note Contributor",
      description: "Upload your first note",
      icon: <Upload className="h-5 w-5" />,
      variant: "bronze",
      condition: (stats) => stats.uploadCount >= 1,
      progress: (stats) => ({ current: stats.uploadCount, total: 1 })
    },
    {
      id: "uploader-silver",
      label: "Active Contributor",
      description: "Upload 5 notes",
      icon: <Upload className="h-5 w-5" />,
      variant: "silver",
      condition: (stats) => stats.uploadCount >= 5,
      progress: (stats) => ({ current: stats.uploadCount, total: 5 })
    },
    {
      id: "uploader-gold",
      label: "Super Contributor",
      description: "Upload 10 notes",
      icon: <Upload className="h-5 w-5" />,
      variant: "gold",
      condition: (stats) => stats.uploadCount >= 10,
      progress: (stats) => ({ current: stats.uploadCount, total: 10 })
    },
    {
      id: "downloader-bronze",
      label: "Resource Seeker",
      description: "Download your first note",
      icon: <Download className="h-5 w-5" />,
      variant: "bronze",
      condition: (stats) => stats.downloadCount >= 1,
      progress: (stats) => ({ current: stats.downloadCount, total: 1 })
    },
    {
      id: "downloader-silver",
      label: "Knowledge Hunter",
      description: "Download 10 notes",
      icon: <Download className="h-5 w-5" />,
      variant: "silver",
      condition: (stats) => stats.downloadCount >= 10,
      progress: (stats) => ({ current: stats.downloadCount, total: 10 })
    },
    {
      id: "tenure-bronze",
      label: "Community Member",
      description: "Member for 7 days",
      icon: <Star className="h-5 w-5" />,
      variant: "bronze",
      condition: (stats) => stats.daysSinceJoined >= 7,
      progress: (stats) => ({ 
        current: Math.min(stats.daysSinceJoined, 7), 
        total: 7 
      })
    },
    {
      id: "tenure-silver",
      label: "Loyal Member",
      description: "Member for 30 days",
      icon: <Star className="h-5 w-5" />,
      variant: "silver",
      condition: (stats) => stats.daysSinceJoined >= 30,
      progress: (stats) => ({ 
        current: Math.min(stats.daysSinceJoined, 30), 
        total: 30 
      })
    },
    {
      id: "tenure-gold",
      label: "Dedicated Member",
      description: "Member for 90 days",
      icon: <Trophy className="h-5 w-5" />,
      variant: "gold",
      condition: (stats) => stats.daysSinceJoined >= 90,
      progress: (stats) => ({ 
        current: Math.min(stats.daysSinceJoined, 90), 
        total: 90 
      })
    },

    // Subject variety achievements
    {
      id: "subjects-bronze",
      label: "Subject Starter",
      description: "View notes from 3 different subjects",
      icon: <LibrarySquare className="h-5 w-5" />,
      variant: "bronze",
      condition: (stats) => (stats.uniqueSubjectsCount || 0) >= 3,
      progress: (stats) => ({ 
        current: Math.min((stats.uniqueSubjectsCount || 0), 3), 
        total: 3 
      })
    },
    {
      id: "subjects-silver",
      label: "Subject Explorer",
      description: "View notes from 8 different subjects",
      icon: <LibrarySquare className="h-5 w-5" />,
      variant: "silver",
      condition: (stats) => (stats.uniqueSubjectsCount || 0) >= 8,
      progress: (stats) => ({ 
        current: Math.min((stats.uniqueSubjectsCount || 0), 8), 
        total: 8 
      })
    },
    // App exploration achievements
    {
      id: "explorer-bronze",
      label: "App Explorer",
      description: "Visit 3 different pages in the app",
      icon: <Map className="h-5 w-5" />,
      variant: "bronze",
      condition: (stats) => (stats.pagesVisited || 0) >= 3,
      progress: (stats) => ({ 
        current: Math.min((stats.pagesVisited || 0), 3), 
        total: 3 
      })
    },
    {
      id: "explorer-silver",
      label: "Power User",
      description: "Visit all pages in the app",
      icon: <Map className="h-5 w-5" />,
      variant: "silver",
      condition: (stats) => (stats.pagesVisited || 0) >= 5,
      progress: (stats) => ({ 
        current: Math.min((stats.pagesVisited || 0), 5), 
        total: 5 
      })
    },
    // View count achievements
    {
      id: "viewer-bronze",
      label: "Curious Mind",
      description: "View your first note",
      icon: <Eye className="h-5 w-5" />,
      variant: "bronze",
      condition: (stats) => stats.viewCount >= 1,
      progress: (stats) => ({ current: stats.viewCount, total: 1 })
    },
    {
      id: "viewer-silver",
      label: "Avid Reader",
      description: "View 20 notes",
      icon: <Eye className="h-5 w-5" />,
      variant: "silver",
      condition: (stats) => stats.viewCount >= 20,
      progress: (stats) => ({ current: Math.min(stats.viewCount, 20), total: 20 })
    },
  ];

  // Filter achievements to only show earned ones or those in progress
  const unlockedAchievements = achievements.filter(achievement => 
    achievement.condition(stats || defaultStats)
  );
  
  const inProgressAchievements = achievements.filter(achievement => 
    !achievement.condition(stats || defaultStats)
  );

  return (
    <div className="space-y-6">
      {unlockedAchievements.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Award className="h-5 w-5 mr-2 text-primary" />
            Earned Achievements
          </h3>
          <div className="flex flex-wrap gap-3">
            {unlockedAchievements.map(achievement => (
              <AchievementBadge
                key={achievement.id}
                icon={achievement.icon}
                label={achievement.label}
                description={achievement.description}
                variant={achievement.variant}
              />
            ))}
          </div>
        </div>
      )}
      
      {inProgressAchievements.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-primary" />
            Achievements in Progress
          </h3>
          <div className="flex flex-wrap gap-3">
            {inProgressAchievements.slice(0, 3).map(achievement => (
              <AchievementBadge
                key={achievement.id}
                icon={achievement.icon}
                label={achievement.label}
                description={achievement.description}
                progress={achievement.progress ? achievement.progress(stats || defaultStats) : undefined}
                variant="default"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}