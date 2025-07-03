import React, { useState, useEffect } from 'react';
import { Camera, Check, CheckCircle2, Circle, Users, Heart, Star, Coffee, Music, MapPin, Clock, Trophy } from 'lucide-react';
import { collection, doc, setDoc, getDocs, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUserName, getDeviceId } from '../utils/deviceId';

interface PhotoChallengesProps {
  isDarkMode: boolean;
  isAdmin?: boolean;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'ceremony' | 'reception' | 'fun' | 'group' | 'romantic';
  difficulty: 'easy' | 'medium' | 'hard';
}

interface ChallengeCompletion {
  id: string;
  challengeId: string;
  userName: string;
  deviceId: string;
  completedAt: string;
}

const defaultChallenges: Challenge[] = [
  {
    id: 'bridal-shoes',
    title: 'Die Brautschuhe',
    description: 'Mache ein Foto von den Brautschuhen',
    icon: Star,
    category: 'ceremony',
    difficulty: 'easy'
  },
  {
    id: 'ring-exchange',
    title: 'Ringaustausch',
    description: 'Halte den Moment des Ringaustauschs fest',
    icon: Heart,
    category: 'ceremony',
    difficulty: 'medium'
  },
  {
    id: 'group-selfie',
    title: 'Gruppen-Selfie',
    description: 'Mache ein Selfie mit mindestens 5 Gästen',
    icon: Users,
    category: 'group',
    difficulty: 'easy'
  },
  {
    id: 'first-dance',
    title: 'Erster Tanz',
    description: 'Fotografiere den ersten Tanz des Brautpaars',
    icon: Music,
    category: 'reception',
    difficulty: 'medium'
  },
  {
    id: 'wedding-cake',
    title: 'Hochzeitstorte',
    description: 'Mache ein Foto beim Anschneiden der Torte',
    icon: Coffee,
    category: 'reception',
    difficulty: 'easy'
  },
  {
    id: 'venue-overview',
    title: 'Location-Überblick',
    description: 'Fotografiere die gesamte Hochzeitslocation',
    icon: MapPin,
    category: 'ceremony',
    difficulty: 'easy'
  },
  {
    id: 'candid-moment',
    title: 'Spontaner Moment',
    description: 'Fange einen ungeplanten, emotionalen Moment ein',
    icon: Clock,
    category: 'fun',
    difficulty: 'hard'
  },
  {
    id: 'couple-portrait',
    title: 'Paar-Portrait',
    description: 'Mache ein romantisches Foto des Brautpaars',
    icon: Heart,
    category: 'romantic',
    difficulty: 'medium'
  },
  {
    id: 'dancing-guests',
    title: 'Tanzende Gäste',
    description: 'Fotografiere die Gäste beim Tanzen',
    icon: Music,
    category: 'reception',
    difficulty: 'easy'
  },
  {
    id: 'family-photo',
    title: 'Familienfoto',
    description: 'Mache ein Foto mit beiden Familien',
    icon: Users,
    category: 'group',
    difficulty: 'medium'
  }
];

const categoryColors = {
  ceremony: 'from-purple-500 to-pink-500',
  reception: 'from-blue-500 to-cyan-500',
  fun: 'from-yellow-500 to-orange-500',
  group: 'from-green-500 to-emerald-500',
  romantic: 'from-red-500 to-rose-500'
};

const categoryNames = {
  ceremony: 'Zeremonie',
  reception: 'Feier',
  fun: 'Spaß',
  group: 'Gruppe',
  romantic: 'Romantik'
};

const difficultyColors = {
  easy: 'text-green-500',
  medium: 'text-yellow-500',
  hard: 'text-red-500'
};

const difficultyNames = {
  easy: 'Einfach',
  medium: 'Mittel',
  hard: 'Schwer'
};

export const PhotoChallenges: React.FC<PhotoChallengesProps> = ({ isDarkMode, isAdmin = false }) => {
  const [challenges] = useState<Challenge[]>(defaultChallenges);
  const [completions, setCompletions] = useState<ChallengeCompletion[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentUser] = useState(getUserName() || '');
  const [currentDeviceId] = useState(getDeviceId() || '');

  // Load completions from Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'challengeCompletions'),
      (snapshot) => {
        const completionData: ChallengeCompletion[] = [];
        snapshot.forEach((doc) => {
          completionData.push({ id: doc.id, ...doc.data() } as ChallengeCompletion);
        });
        setCompletions(completionData);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleToggleChallenge = async (challengeId: string) => {
    const existingCompletion = completions.find(
      c => c.challengeId === challengeId && c.userName === currentUser && c.deviceId === currentDeviceId
    );

    if (existingCompletion) {
      // Remove completion
      await deleteDoc(doc(db, 'challengeCompletions', existingCompletion.id));
    } else {
      // Add completion
      const newCompletion: Omit<ChallengeCompletion, 'id'> = {
        challengeId,
        userName: currentUser,
        deviceId: currentDeviceId,
        completedAt: new Date().toISOString()
      };
      
      await setDoc(doc(collection(db, 'challengeCompletions')), newCompletion);
    }
  };

  const isChallengeCompleted = (challengeId: string) => {
    return completions.some(
      c => c.challengeId === challengeId && c.userName === currentUser && c.deviceId === currentDeviceId
    );
  };

  const getChallengeCompletionCount = (challengeId: string) => {
    return completions.filter(c => c.challengeId === challengeId).length;
  };

  const getCompletedChallenges = () => {
    return challenges.filter(challenge => isChallengeCompleted(challenge.id));
  };

  const filteredChallenges = selectedCategory === 'all' 
    ? challenges 
    : challenges.filter(challenge => challenge.category === selectedCategory);

  const categories = ['all', ...Array.from(new Set(challenges.map(c => c.category)))];

  const completionPercentage = Math.round((getCompletedChallenges().length / challenges.length) * 100);

  return (
    <div className="mx-4 my-6 space-y-6">
      {/* Header */}
      <div className={`p-6 rounded-3xl transition-all duration-500 relative overflow-hidden ${
        isDarkMode 
          ? 'bg-gradient-to-br from-purple-900/40 via-pink-900/30 to-rose-900/30 border border-purple-500/20 backdrop-blur-xl shadow-2xl shadow-purple-500/20' 
          : 'bg-gradient-to-br from-purple-50/90 via-pink-50/80 to-rose-50/80 border border-purple-200/60 backdrop-blur-xl shadow-2xl shadow-purple-500/15'
      }`}>
        <div className="absolute inset-0 opacity-25">
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl ${
            isDarkMode ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-gradient-to-br from-purple-300 to-pink-300'
          }`} style={{ transform: 'translate(50%, -50%)' }}></div>
          <div className={`absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl ${
            isDarkMode ? 'bg-gradient-to-br from-rose-500 to-red-500' : 'bg-gradient-to-br from-rose-300 to-red-300'
          }`} style={{ transform: 'translate(-50%, 50%)' }}></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 p-3 rounded-2xl transition-all duration-300 shadow-lg ${
                isDarkMode ? 'bg-gradient-to-br from-purple-600/40 to-pink-600/40 backdrop-blur-sm' : 'bg-gradient-to-br from-purple-100/80 to-pink-100/80 backdrop-blur-sm'
              }`}>
                <Camera className={`w-full h-full transition-all duration-300 ${
                  isDarkMode ? 'text-purple-300' : 'text-purple-600'
                }`} />
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 bg-clip-text text-transparent">
                  Foto-Challenges
                </h3>
                <p className={`text-sm transition-colors duration-300 ${
                  isDarkMode ? 'text-white/80' : 'text-gray-700'
                }`}>
                  {getCompletedChallenges().length} von {challenges.length} abgeschlossen
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent`}>
                {completionPercentage}%
              </div>
              <div className={`flex items-center gap-2 mt-2 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                <Trophy className="w-4 h-4" />
                <span className="text-sm font-medium">Fortschritt</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className={`w-full h-3 rounded-full overflow-hidden ${
            isDarkMode ? 'bg-white/10' : 'bg-gray-200/50'
          }`}>
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 whitespace-nowrap ${
              selectedCategory === category
                ? isDarkMode
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : isDarkMode
                  ? 'bg-white/10 text-white/70 hover:bg-white/20'
                  : 'bg-white/60 text-gray-700 hover:bg-white/80'
            }`}
          >
            {category === 'all' ? 'Alle' : categoryNames[category as keyof typeof categoryNames]}
          </button>
        ))}
      </div>

      {/* Challenges Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredChallenges.map((challenge) => {
          const Icon = challenge.icon;
          const isCompleted = isChallengeCompleted(challenge.id);
          const completionCount = getChallengeCompletionCount(challenge.id);

          return (
            <div
              key={challenge.id}
              className={`p-4 rounded-2xl backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] cursor-pointer ${
                isDarkMode 
                  ? 'bg-white/5 border border-white/10 hover:bg-white/10' 
                  : 'bg-white/60 border border-white/30 hover:bg-white/80'
              } ${isCompleted ? 'ring-2 ring-green-500/50' : ''}`}
              onClick={() => handleToggleChallenge(challenge.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${categoryColors[challenge.category]}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  {completionCount > 0 && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      isDarkMode ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {completionCount}x
                    </span>
                  )}
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <Circle className={`w-6 h-6 ${isDarkMode ? 'text-white/30' : 'text-gray-400'}`} />
                  )}
                </div>
              </div>

              <h4 className={`font-semibold mb-2 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {challenge.title}
              </h4>

              <p className={`text-sm mb-3 ${
                isDarkMode ? 'text-white/70' : 'text-gray-600'
              }`}>
                {challenge.description}
              </p>

              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  isDarkMode ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-600'
                }`}>
                  {categoryNames[challenge.category]}
                </span>
                <span className={`text-xs font-medium ${difficultyColors[challenge.difficulty]}`}>
                  {difficultyNames[challenge.difficulty]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredChallenges.length === 0 && (
        <div className={`text-center py-12 rounded-2xl backdrop-blur-sm ${
          isDarkMode 
            ? 'bg-white/5 border border-white/10' 
            : 'bg-white/60 border border-white/30'
        }`}>
          <Camera className={`w-16 h-16 mx-auto mb-4 ${
            isDarkMode ? 'text-purple-400' : 'text-purple-500'
          }`} />
          <p className={`text-lg font-medium ${
            isDarkMode ? 'text-white/80' : 'text-gray-700'
          }`}>
            Keine Challenges in dieser Kategorie
          </p>
        </div>
      )}
    </div>
  );
};