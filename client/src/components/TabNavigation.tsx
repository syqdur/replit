import React from 'react';
import { Camera, Music, Heart } from 'lucide-react';

interface TabNavigationProps {
  activeTab: 'gallery' | 'music' | 'timeline';
  onTabChange: (tab: 'gallery' | 'music' | 'timeline') => void;
  isDarkMode: boolean;
  galleryEnabled?: boolean;
  musicWishlistEnabled?: boolean;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  isDarkMode,
  galleryEnabled = true,
  musicWishlistEnabled = true
}) => {
  const allTabs = [
    {
      id: 'gallery' as const,
      label: 'Galerie',
      icon: <Camera className="w-5 h-5" />,
      emoji: '📸',
      enabled: galleryEnabled
    },
    {
      id: 'timeline' as const,
      label: 'Timeline',
      icon: <Heart className="w-5 h-5" />,
      emoji: '💕',
      enabled: true // Timeline is always enabled
    },
    {
      id: 'music' as const,
      label: 'Musikwünsche',
      icon: <Music className="w-5 h-5" />,
      emoji: '🎵',
      enabled: musicWishlistEnabled
    }
  ];

  // Filter tabs based on enabled status
  const tabs = allTabs.filter(tab => tab.enabled);

  return (
    <div className={`mx-4 mb-4 p-1 rounded-2xl transition-all duration-500 ${
      isDarkMode 
        ? 'bg-gray-800/40 border border-gray-700/30 backdrop-blur-xl' 
        : 'bg-white/60 border border-gray-200/40 backdrop-blur-xl'
    }`}>
      <div className="flex relative">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-3 px-4 text-sm font-bold transition-all duration-300 relative rounded-xl ${
              activeTab === tab.id
                ? isDarkMode
                  ? 'text-white bg-gray-700/50 shadow-lg'
                  : 'text-gray-900 bg-white/80 shadow-lg'
                : isDarkMode
                  ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg">{tab.emoji}</span>
              <span className="tracking-tight hidden sm:inline">{tab.label}</span>
            </div>
            {activeTab === tab.id && (
              <div className={`absolute inset-0 rounded-xl ring-2 transition-all duration-300 ${
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