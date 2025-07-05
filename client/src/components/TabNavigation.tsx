import React from 'react';
import { Lock } from 'lucide-react';

interface TabNavigationProps {
  activeTab: 'gallery' | 'music' | 'timeline' | 'challenges';
  onTabChange: (tab: 'gallery' | 'music' | 'timeline' | 'challenges') => void;
  isDarkMode: boolean;
  galleryEnabled?: boolean;
  musicWishlistEnabled?: boolean;
  challengesEnabled?: boolean;
  isCountdownActive?: boolean;
  tabsLockedUntilCountdown?: boolean;
  adminOverrideTabLock?: boolean;
  isAdmin?: boolean;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  isDarkMode,
  galleryEnabled = true,
  musicWishlistEnabled = true,
  challengesEnabled = true,
  isCountdownActive = false,
  tabsLockedUntilCountdown = false,
  adminOverrideTabLock = false,
  isAdmin = false
}) => {
  // Determine if tabs should be locked based on countdown
  const shouldLockTabs = tabsLockedUntilCountdown && isCountdownActive && !adminOverrideTabLock && !isAdmin;
  
  const allTabs = [
    {
      id: 'gallery' as const,
      label: '📸 Galerie',
      enabled: galleryEnabled,
      locked: shouldLockTabs
    },
    {
      id: 'timeline' as const,
      label: '💕 Timeline',
      enabled: true, // Timeline is always enabled
      locked: false  // Timeline is never locked
    },
    {
      id: 'music' as const,
      label: '🎵 Musikwünsche',
      enabled: musicWishlistEnabled,
      locked: shouldLockTabs
    },
    {
      id: 'challenges' as const,
      label: '🏆 Challenges',
      enabled: challengesEnabled,
      locked: shouldLockTabs
    }
  ];

  // Filter tabs based on enabled status
  const tabs = allTabs.filter(tab => tab.enabled);

  const handleTabClick = (tabId: 'gallery' | 'music' | 'timeline' | 'challenges') => {
    const tab = allTabs.find(t => t.id === tabId);
    if (tab && tab.locked) {
      // Show locked message for locked tabs
      alert('Diese Funktion ist bis zum Ende des Countdowns gesperrt.');
      return;
    }
    onTabChange(tabId);
  };

  return (
    <div className={`mx-4 mb-3 sm:mb-4 p-0.5 sm:p-1 rounded-2xl transition-all duration-500 ${
      isDarkMode 
        ? 'bg-gray-800/40 border border-gray-700/30 backdrop-blur-xl' 
        : 'bg-white/60 border border-gray-200/40 backdrop-blur-xl'
    }`}>
      <div className="flex relative gap-0.5 sm:gap-1">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            disabled={tab.locked}
            className={`flex-1 py-2 sm:py-3 px-1 sm:px-4 text-xs sm:text-sm font-bold transition-all duration-300 relative rounded-xl touch-manipulation ${
              tab.locked
                ? isDarkMode
                  ? 'text-gray-500 bg-gray-800/30 cursor-not-allowed opacity-50'
                  : 'text-gray-400 bg-gray-100/30 cursor-not-allowed opacity-50'
                : activeTab === tab.id
                  ? isDarkMode
                    ? 'text-white bg-gray-700/50 shadow-lg'
                    : 'text-gray-900 bg-white/80 shadow-lg'
                  : isDarkMode
                    ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              {tab.locked && <Lock className="w-3 h-3" />}
              <span className="tracking-tight text-xs sm:text-sm">{tab.label}</span>
            </div>
            {activeTab === tab.id && !tab.locked && (
              <div className={`absolute inset-0 rounded-xl ring-1 sm:ring-2 transition-all duration-300 ${
                isDarkMode 
                  ? 'ring-purple-500/30 bg-gradient-to-r from-purple-600/10 to-pink-600/10' 
                  : 'ring-pink-500/30 bg-gradient-to-r from-pink-500/10 to-purple-500/10'
              }`} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};