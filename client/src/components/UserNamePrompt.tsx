import React, { useState } from 'react';
import { Heart, Camera } from 'lucide-react';

interface UserNamePromptProps {
  onSubmit: (name: string) => void;
  isDarkMode: boolean;
}

export const UserNamePrompt: React.FC<UserNamePromptProps> = ({ onSubmit, isDarkMode }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <div className={`fixed inset-0 flex items-center justify-center p-4 z-50 transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-900' : 'bg-white'
    }`}>
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full overflow-hidden border-4 border-pink-200">
            <img 
              src="https://i.ibb.co/PvXjwss4/profil.jpg" 
              alt="Kristin & Maurizio"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className={`text-2xl font-light mb-2 transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            kristinundmauro.de
          </h1>
          <p className={`text-sm mb-6 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Willkommen zu unserer Hochzeitsgalerie! 💕<br/>
            Teile deine schönsten Momente mit uns.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Wie heißt du?"
              className={`w-full px-4 py-3 border rounded-lg text-center focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              autoFocus
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Weiter
          </button>
        </form>
        
        <div className={`mt-8 flex items-center justify-center gap-2 transition-colors duration-300 ${
          isDarkMode ? 'text-gray-500' : 'text-gray-400'
        }`}>
          <Heart className="w-4 h-4" />
          <span className="text-xs">Kristin & Maurizio • 12.07.2025</span>
          <Heart className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};