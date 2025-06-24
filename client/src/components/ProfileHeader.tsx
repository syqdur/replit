import React from 'react';
import { Settings, UserPlus } from 'lucide-react';

interface ProfileHeaderProps {
  isDarkMode: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ isDarkMode }) => {
  return (
    <div className={`p-4 border-b transition-colors duration-300 ${
      isDarkMode ? 'border-gray-700' : 'border-gray-100'
    }`}>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
          <img 
            src="https://i.ibb.co/PvXjwss4/profil.jpg" 
            alt="Maurizio & Kristin Test"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <h2 className={`text-xl font-semibold transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            kristinundmauro.de
          </h2>
          <div className={`flex gap-6 mt-2 text-sm transition-colors duration-300 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            <span><strong>∞</strong> Follower</span>
          </div>
        </div>
      </div>
     
      <div className="space-y-2">
        <h3 className={`font-semibold transition-colors duration-300 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Kristin & Maurizio 💕
        </h3>
        <p className={`text-sm transition-colors duration-300 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>
          Wir sagen JA! ✨<br/>
          12.07.2025 - Der schönste Tag unseres Lebens 💍<br/>
          Teilt eure Lieblingsmomente mit uns! 📸<br/>
          #MaurizioUndKristin #Hochzeit2025 #FürImmer<br/>
          <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-semibold transition-colors duration-300 ${
            isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
          }`}>
            💻 coded by Mauro
          </span>
        </p>
      </div>
      
      <div className="flex gap-2 mt-4">
        <button className={`p-1.5 rounded-md transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
        }`}>
          <UserPlus className={`w-4 h-4 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`} />
        </button>
        <button className={`p-1.5 rounded-md transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
        }`}>
          <Settings className={`w-4 h-4 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`} />
        </button>
      </div>
    </div>
  );
};
