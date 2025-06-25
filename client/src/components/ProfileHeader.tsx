import React, { useState, useEffect } from 'react';
import { Settings, UserPlus, Edit3, Clock, X, Heart, Lock, Unlock } from 'lucide-react';
import { ProfileEditModal } from './ProfileEditModal';
import { loadProfile, updateProfile } from '../services/firebaseService';
import { ProfileData } from '../types';

interface ProfileHeaderProps {
  isDarkMode: boolean;
  isAdmin: boolean;
  userName?: string;
  mediaItems?: any[];
  onToggleAdmin?: (isAdmin: boolean) => void;
  currentUserProfile?: any;
  onOpenUserProfile?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ isDarkMode, isAdmin, userName, mediaItems = [], onToggleAdmin, currentUserProfile, onOpenUserProfile }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [countdown, setCountdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [countdownEnded, setCountdownEnded] = useState(false);

  useEffect(() => {
    const unsubscribe = loadProfile(setProfileData);
    return unsubscribe;
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!profileData?.countdownDate) return;

    const updateCountdown = () => {
      const target = new Date(profileData.countdownDate);
      const now = new Date();
      const difference = target.getTime() - now.getTime();

      if (difference > 0) {
        setCountdown({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
        setCountdownEnded(false);
      } else {
        setCountdown(null);
        setCountdownEnded(true);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [profileData?.countdownDate]);

  const handleSaveProfile = async (newProfileData: {
    profilePicture?: File | string;
    name: string;
    bio: string;
    countdownDate?: string;
    countdownEndMessage?: string;
    countdownMessageDismissed?: boolean;
  }) => {
    if (!userName) return;
    await updateProfile(newProfileData, userName);
  };

  const handleDismissMessage = async () => {
    if (!userName || !profileData) return;
    
    await updateProfile({
      ...profileData,
      countdownMessageDismissed: true
    }, userName);
  };

  return (
    <>
      <div className={`mx-2 sm:mx-4 my-4 sm:my-6 p-4 sm:p-6 rounded-3xl transition-all duration-500 ${
        isDarkMode 
          ? 'bg-gray-800/40 border border-gray-700/30 backdrop-blur-xl shadow-2xl shadow-purple-500/10' 
          : 'bg-white/60 border border-gray-200/40 backdrop-blur-xl shadow-2xl shadow-pink-500/10'
      }`}>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden relative ring-4 transition-all duration-300 animate-pulse ${
                isDarkMode 
                  ? 'ring-gradient-to-r from-purple-600 to-pink-600 ring-purple-500/30' 
                  : 'ring-gradient-to-r from-pink-500 to-purple-500 ring-pink-500/30'
              }`} style={{
                animation: 'pulse 2s ease-in-out infinite, ring-glow 3s ease-in-out infinite'
              }}
            >
              {profileData?.profilePicture ? (
                <img 
                  src={profileData?.profilePicture} 
                  alt={profileData?.name || "Profile"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br flex items-center justify-center text-3xl sm:text-4xl font-bold ${
                  isDarkMode 
                    ? 'from-purple-600 to-pink-600 text-white' 
                    : 'from-pink-500 to-purple-500 text-white'
                }`}>
                  K&M
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className={`text-lg sm:text-xl font-bold tracking-tight transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                kristinundmauro.de
              </h2>
              <div className={`flex gap-6 sm:gap-8 mt-2 sm:mt-3 text-sm font-medium transition-colors duration-300 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <span className="flex flex-col items-center">
                  <span className="font-bold text-lg">∞</span>
                  <span className="text-xs opacity-70">Follower</span>
                </span>
                <span className="flex flex-col items-center">
                  <span className="font-bold text-lg">{mediaItems.length || 0}</span>
                  <span className="text-xs opacity-70">Beiträge</span>
                </span>
              </div>
            </div>
          </div>

          {/* Controls - User Profile and Admin */}
          <div className="flex items-center gap-2">
            {/* User Profile Edit Button - Always visible for visitors */}
            <button
              onClick={() => onOpenUserProfile?.()}
              className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                isDarkMode 
                  ? 'bg-blue-600/50 hover:bg-blue-500/50 backdrop-blur-sm' 
                  : 'bg-blue-500/50 hover:bg-blue-600/50 backdrop-blur-sm'
              }`}
              title="Mein Profil bearbeiten"
            >
              <UserPlus className={`w-4 h-4 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-white'
              }`} />
            </button>
            
            {/* Admin Toggle */}
            <button
              onClick={() => onToggleAdmin?.(!isAdmin)}
              className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                isDarkMode 
                  ? 'bg-gray-700/50 hover:bg-gray-600/50 backdrop-blur-sm' 
                  : 'bg-gray-100/50 hover:bg-gray-200/50 backdrop-blur-sm'
              }`}
              title={isAdmin ? "Admin-Modus verlassen" : "Admin-Modus"}
            >
              {isAdmin ? (
                <Unlock className={`w-4 h-4 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`} />
              ) : (
                <Lock className={`w-4 h-4 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`} />
              )}
            </button>
            
            {/* Admin Site Settings - Only visible in admin mode */}
            {isAdmin && (
              <button
                onClick={() => setShowEditModal(true)}
                className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                  isDarkMode 
                    ? 'bg-gray-700/50 hover:bg-gray-600/50 backdrop-blur-sm' 
                    : 'bg-gray-100/50 hover:bg-gray-200/50 backdrop-blur-sm'
                }`}
                title="Website-Profil bearbeiten"
              >
                <Settings className={`w-4 h-4 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`} />
              </button>
            )}
          </div>
        </div>
       
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className={`font-bold text-lg tracking-tight transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {profileData?.name || 'Kristin & Maurizio 💕'}
            </h3>
          </div>
          <p className={`text-sm transition-colors duration-300 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {profileData?.bio || (
              <>
                Wir sagen JA! ✨<br/>
                12.07.2025 - Der schönste Tag unseres Lebens 💍<br/>
                Teilt eure Lieblingsmomente mit uns! 📸<br/>
                #MaurizioUndKristin #Hochzeit2025 #FürImmer
              </>
            )}
            <br/>
            <span className={`inline-block mt-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25' 
                : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25'
            }`}>
              💻 coded by Mauro
            </span>
          </p>

          {/* Countdown Display - Instagram 2.0 Style */}
          {countdown && (
            <div className={`mt-6 p-8 rounded-3xl transition-all duration-500 relative overflow-hidden ${
              isDarkMode 
                ? 'bg-gray-800/40 border border-gray-700/30 backdrop-blur-xl shadow-2xl shadow-purple-500/10' 
                : 'bg-white/60 border border-gray-200/40 backdrop-blur-xl shadow-2xl shadow-pink-500/10'
            }`}>
              {/* Decorative Background Elements */}
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl ${
                  isDarkMode ? 'bg-pink-500' : 'bg-pink-300'
                }`} style={{ transform: 'translate(50%, -50%)' }}></div>
                <div className={`absolute bottom-0 left-0 w-24 h-24 rounded-full blur-3xl ${
                  isDarkMode ? 'bg-purple-500' : 'bg-purple-300'
                }`} style={{ transform: 'translate(-50%, 50%)' }}></div>
              </div>

              <div className="relative z-10">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 animate-pulse ${
                      isDarkMode 
                        ? 'bg-gradient-to-br from-pink-600/20 to-purple-600/20 border border-pink-500/30' 
                        : 'bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-200/50'
                    }`}>
                      <Heart className={`w-8 h-8 transition-colors duration-300 animate-heartbeat ${
                       isDarkMode ? 'text-pink-400' : 'text-pink-600'
                      }`} 
                      style={{
                        animation: 'heartbeat 3s ease-in-out infinite'
                      }} />
                    </div>
                  </div>
                  <h3 className={`text-2xl font-bold tracking-tight mb-2 transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Bis zu unserem großen Tag
                  </h3>
                  <p className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Jeder Moment zählt ✨
                  </p>
                </div>
                
                {/* Countdown Cards */}
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                  {[
                    { value: countdown.days, label: 'Tage', icon: '📅' },
                    { value: countdown.hours, label: 'Stunden', icon: '⏰' },
                    { value: countdown.minutes, label: 'Minuten', icon: '⏱️' },
                    { value: countdown.seconds, label: 'Sekunden', icon: '⚡' }
                  ].map((item, index) => (
                    <div
                      key={index}
                      className={`relative w-20 h-24 sm:w-24 sm:h-28 rounded-2xl transition-all duration-500 transform hover:scale-105 group flex-shrink-0 ${
                        isDarkMode 
                          ? 'bg-gray-800/60 border border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/80' 
                          : 'bg-white/80 border border-gray-200/60 backdrop-blur-sm hover:bg-white/90 shadow-lg hover:shadow-xl'
                      }`}
                      style={{
                        animation: 'pulse 2s ease-in-out infinite',
                        animationDelay: `${index * 0.2}s`
                      }}
                    >
                      {/* Gradient Border Effect */}
                      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                        isDarkMode ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20' : 'bg-gradient-to-r from-pink-100/50 to-purple-100/50'
                      }`}></div>

                      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-2">
                        {/* Icon */}
                        <div className="text-lg mb-1 transform group-hover:scale-110 transition-transform duration-300">
                          {item.icon}
                        </div>

                        {/* Value */}
                        <div className={`text-lg font-bold mb-1 transition-all duration-300 ${
                          isDarkMode 
                            ? 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400' 
                            : 'text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600'
                        }`}>
                          {item.value.toString().padStart(2, '0')}
                        </div>

                        {/* Label */}
                        <div className={`text-xs uppercase tracking-wide font-medium transition-colors duration-300 leading-tight ${
                          isDarkMode ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-600 group-hover:text-gray-700'
                        }`}>
                          {item.label}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Accent */}
                <div className="mt-6 text-center">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
                    isDarkMode 
                      ? 'bg-gradient-to-r from-pink-600/20 to-purple-600/20 border border-pink-500/30' 
                      : 'bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-200/50'
                  }`}>
                    <span className="text-lg">💕</span>
                    <span className={`text-sm font-medium transition-colors duration-300 ${
                      isDarkMode ? 'text-pink-300' : 'text-pink-700'
                    }`}>
                      Wir können es kaum erwarten!
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Countdown End Message */}
          {countdownEnded && profileData?.countdownEndMessage && !profileData?.countdownMessageDismissed && (
            <div className={`mt-4 p-4 rounded-xl border-2 transition-colors duration-300 animate-pulse relative ${
              isDarkMode ? 'bg-pink-900/30 border-pink-500/50' : 'bg-pink-50 border-pink-300'
            }`}>
              {/* Close Button */}
              <button
                onClick={handleDismissMessage}
                className={`absolute top-2 right-2 p-1 rounded-full transition-colors duration-300 ${
                  isDarkMode 
                    ? 'hover:bg-pink-800/50 text-pink-400 hover:text-pink-300' 
                    : 'hover:bg-pink-200 text-pink-600 hover:text-pink-700'
                }`}
                title="Nachricht schließen"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="text-center pr-6">
                <div className="text-2xl mb-2">🎉</div>
                <p className={`text-lg font-semibold transition-colors duration-300 ${
                  isDarkMode ? 'text-pink-300' : 'text-pink-700'
                }`}>
                  {profileData.countdownEndMessage}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        currentProfileData={{
          profilePicture: profileData?.profilePicture,
          name: profileData?.name || 'Kristin & Maurizio',
          bio: profileData?.bio || 'Wir sagen JA! ✨\n12.07.2025 - Der schönste Tag unseres Lebens 💍\nTeilt eure Lieblingsmomente mit uns! 📸\n#MaurizioUndKristin #Hochzeit2025 #FürImmer',
          countdownDate: profileData?.countdownDate,
          countdownEndMessage: profileData?.countdownEndMessage,
          countdownMessageDismissed: profileData?.countdownMessageDismissed
        }}
        onSave={handleSaveProfile}
        isDarkMode={isDarkMode}
      />
    </>
  );
};