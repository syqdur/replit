import React, { useState, useEffect } from 'react';
import { 
  Camera, Check, CheckCircle2, Circle, Users, Heart, Star, Coffee, Music, MapPin, Clock, Trophy, 
  Gift, Sparkles, Crown, Laugh, Cake, Church, PartyPopper, Flower, Wine, Sun, Moon, 
  Zap, Mic, Glasses, Footprints, Gamepad2, Smile, Fingerprint, Target,
  Medal, Award, TrendingUp, UserCheck, RotateCcw, Crown as Crown2,
  // Beautiful icons
  Gem, Diamond, Shirt, Building, Baby, Utensils, 
  Handshake, Palette, Volume2, ChefHat, Disc3, Play, Shuffle
} from 'lucide-react';
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
  // Ceremony Challenges
  {
    id: 'bridal-shoes',
    title: 'Die Brautschuhe',
    description: 'Mache ein Foto von den eleganten Brautschuhen',
    icon: Gem,
    category: 'ceremony',
    difficulty: 'easy'
  },
  {
    id: 'ring-exchange',
    title: 'Ringaustausch',
    description: 'Halte den magischen Moment des Ringaustauschs fest',
    icon: Diamond,
    category: 'ceremony',
    difficulty: 'medium'
  },
  {
    id: 'wedding-dress',
    title: 'Das Brautkleid',
    description: 'Fotografiere das wunderschöne Brautkleid im Detail',
    icon: Crown,
    category: 'ceremony',
    difficulty: 'easy'
  },
  {
    id: 'ceremony-venue',
    title: 'Trauungsort',
    description: 'Mache ein Foto der gesamten Zeremonie-Location',
    icon: Church,
    category: 'ceremony',
    difficulty: 'easy'
  },
  {
    id: 'walking-aisle',
    title: 'Gang zum Altar',
    description: 'Fotografiere den Moment des Einzugs der Braut',
    icon: Footprints,
    category: 'ceremony',
    difficulty: 'medium'
  },
  {
    id: 'wedding-flowers',
    title: 'Brautstrauß',
    description: 'Ein Detailfoto des Brautstraußes',
    icon: Flower,
    category: 'ceremony',
    difficulty: 'easy'
  },

  // Reception Challenges
  {
    id: 'first-dance',
    title: 'Erster Tanz',
    description: 'Fotografiere den romantischen ersten Tanz des Brautpaars',
    icon: Music,
    category: 'reception',
    difficulty: 'medium'
  },
  {
    id: 'wedding-cake',
    title: 'Hochzeitstorte',
    description: 'Mache ein Foto beim feierlichen Anschneiden der Torte',
    icon: Cake,
    category: 'reception',
    difficulty: 'easy'
  },
  {
    id: 'dancing-guests',
    title: 'Tanzende Gäste',
    description: 'Fotografiere die ausgelassenen Gäste beim Tanzen',
    icon: PartyPopper,
    category: 'reception',
    difficulty: 'easy'
  },
  {
    id: 'toast-speech',
    title: 'Hochzeitsrede',
    description: 'Halte eine emotionale Rede oder einen Toast fest',
    icon: Volume2,
    category: 'reception',
    difficulty: 'medium'
  },
  {
    id: 'dinner-table',
    title: 'Festtafel',
    description: 'Fotografiere die wunderschön gedeckte Hochzeitstafel',
    icon: Utensils,
    category: 'reception',
    difficulty: 'easy'
  },
  {
    id: 'band-performance',
    title: 'Live-Musik',
    description: 'Mache ein Foto der Band oder des DJs während der Show',
    icon: Disc3,
    category: 'reception',
    difficulty: 'medium'
  },

  // Group Challenges
  {
    id: 'group-selfie',
    title: 'Mega-Gruppen-Selfie',
    description: 'Mache ein Selfie mit mindestens 8 Gästen',
    icon: Camera,
    category: 'group',
    difficulty: 'medium'
  },
  {
    id: 'family-photo',
    title: 'Großes Familienfoto',
    description: 'Versammle beide Familien für ein gemeinsames Foto',
    icon: Users,
    category: 'group',
    difficulty: 'medium'
  },
  {
    id: 'bridesmaids',
    title: 'Brautjungfern-Squad',
    description: 'Ein Foto aller Brautjungfern zusammen',
    icon: Crown2,
    category: 'group',
    difficulty: 'easy'
  },
  {
    id: 'groomsmen',
    title: 'Trauzeugen-Team',
    description: 'Fotografiere alle Trauzeugen in einer coolen Pose',
    icon: Handshake,
    category: 'group',
    difficulty: 'easy'
  },
  {
    id: 'kids-table',
    title: 'Kindertisch-Chaos',
    description: 'Mache ein lustiges Foto vom Kindertisch',
    icon: Baby,
    category: 'group',
    difficulty: 'easy'
  },

  // Fun Challenges
  {
    id: 'candid-laugh',
    title: 'Herzhaftes Lachen',
    description: 'Fange jemanden beim herzhaften Lachen ein',
    icon: Laugh,
    category: 'fun',
    difficulty: 'medium'
  },
  {
    id: 'photobomb',
    title: 'Photobomb-Meister',
    description: 'Erstelle ein lustiges Photobomb-Foto',
    icon: Zap,
    category: 'fun',
    difficulty: 'hard'
  },
  {
    id: 'weird-dance',
    title: 'Verrückter Tanz',
    description: 'Fotografiere jemanden bei einem lustigen Tanzschritt',
    icon: Shuffle,
    category: 'fun',
    difficulty: 'medium'
  },
  {
    id: 'food-art',
    title: 'Kulinarische Kunst',
    description: 'Mache ein künstlerisches Foto vom Hochzeitsessen',
    icon: ChefHat,
    category: 'fun',
    difficulty: 'medium'
  },
  {
    id: 'mirror-selfie',
    title: 'Spiegel-Selfie',
    description: 'Nutze einen Spiegel für ein kreatives Selfie',
    icon: Palette,
    category: 'fun',
    difficulty: 'hard'
  },

  // Romantic Challenges
  {
    id: 'couple-silhouette',
    title: 'Romantische Silhouette',
    description: 'Erstelle eine romantische Silhouette des Brautpaars',
    icon: Moon,
    category: 'romantic',
    difficulty: 'hard'
  },
  {
    id: 'sunset-couple',
    title: 'Sonnenuntergangs-Romantik',
    description: 'Fotografiere das Paar bei Sonnenuntergang',
    icon: Sun,
    category: 'romantic',
    difficulty: 'medium'
  },
  {
    id: 'kiss-moment',
    title: 'Der perfekte Kuss',
    description: 'Halte einen romantischen Kuss-Moment fest',
    icon: Heart,
    category: 'romantic',
    difficulty: 'medium'
  },
  {
    id: 'holding-hands',
    title: 'Händchen halten',
    description: 'Ein Detail-Foto der sich haltenden Hände',
    icon: Handshake,
    category: 'romantic',
    difficulty: 'easy'
  },
  {
    id: 'love-letters',
    title: 'Liebesbotschaft',
    description: 'Fotografiere ein Liebesgedicht oder eine süße Nachricht',
    icon: Gift,
    category: 'romantic',
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
  const [showLeaderboard, setShowLeaderboard] = useState(false);

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

  // Admin function to reactivate a challenge for a user
  const handleReactivateChallenge = async (challengeId: string, userName: string, deviceId: string) => {
    if (!isAdmin) return;
    
    const existingCompletion = completions.find(
      c => c.challengeId === challengeId && c.userName === userName && c.deviceId === deviceId
    );
    
    if (existingCompletion) {
      await deleteDoc(doc(db, 'challengeCompletions', existingCompletion.id));
    }
  };

  // Get leaderboard data
  const getLeaderboardData = () => {
    const userStats: { [key: string]: { name: string; completions: number; points: number; deviceId: string } } = {};
    
    completions.forEach(completion => {
      const challenge = challenges.find(c => c.id === completion.challengeId);
      if (!challenge) return;
      
      const userKey = `${completion.userName}-${completion.deviceId}`;
      if (!userStats[userKey]) {
        userStats[userKey] = {
          name: completion.userName,
          completions: 0,
          points: 0,
          deviceId: completion.deviceId
        };
      }
      
      userStats[userKey].completions++;
      
      // Point system based on difficulty
      const points = challenge.difficulty === 'easy' ? 1 : challenge.difficulty === 'medium' ? 2 : 3;
      userStats[userKey].points += points;
    });
    
    return Object.values(userStats).sort((a, b) => b.points - a.points);
  };

  const filteredChallenges = selectedCategory === 'all' 
    ? challenges 
    : challenges.filter(challenge => challenge.category === selectedCategory);

  const categories = ['all', ...Array.from(new Set(challenges.map(c => c.category)))];

  const completionPercentage = Math.round((getCompletedChallenges().length / challenges.length) * 100);
  
  const leaderboardData = getLeaderboardData();

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
            <div className="text-right flex flex-col items-end gap-3">
              <div className={`text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent`}>
                {completionPercentage}%
              </div>
              <div className={`flex items-center gap-2 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                <Trophy className="w-4 h-4" />
                <span className="text-sm font-medium">Fortschritt</span>
              </div>
              
              {/* Leaderboard Button */}
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  showLeaderboard
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
                    : isDarkMode
                      ? 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/20'
                      : 'bg-white/60 text-gray-700 hover:bg-white/80 border border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Medal className="w-4 h-4" />
                  <span>Bestenliste</span>
                </div>
              </button>
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

      {/* Leaderboard Section */}
      {showLeaderboard && (
        <div className={`p-6 rounded-3xl backdrop-blur-xl border transition-all duration-500 ${
          isDarkMode 
            ? 'bg-gradient-to-br from-yellow-900/40 via-orange-900/30 to-red-900/30 border-yellow-500/20 shadow-2xl shadow-yellow-500/20' 
            : 'bg-gradient-to-br from-yellow-50/90 via-orange-50/80 to-red-50/80 border-yellow-200/60 shadow-2xl shadow-yellow-500/15'
        }`}>
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 p-2 rounded-2xl transition-all duration-300 shadow-lg ${
              isDarkMode ? 'bg-gradient-to-br from-yellow-600/40 to-orange-600/40 backdrop-blur-sm' : 'bg-gradient-to-br from-yellow-100/80 to-orange-100/80 backdrop-blur-sm'
            }`}>
              <Trophy className={`w-full h-full transition-all duration-300 ${
                isDarkMode ? 'text-yellow-300' : 'text-yellow-600'
              }`} />
            </div>
            <div>
              <h4 className="text-xl font-bold bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
                🏆 Bestenliste
              </h4>
              <p className={`text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-white/80' : 'text-gray-700'
              }`}>
                Punkte: Einfach=1, Mittel=2, Schwer=3
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {leaderboardData.length > 0 ? (
              leaderboardData.slice(0, 10).map((user, index) => (
                <div
                  key={`${user.name}-${user.deviceId}`}
                  className={`flex items-center justify-between p-4 rounded-2xl backdrop-blur-sm transition-all duration-300 ${
                    index === 0
                      ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 ring-2 ring-yellow-500/30'
                      : index === 1
                        ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 ring-2 ring-gray-400/30'
                        : index === 2
                          ? 'bg-gradient-to-r from-amber-600/20 to-yellow-600/20 ring-2 ring-amber-500/30'
                          : isDarkMode
                            ? 'bg-white/5 border border-white/10'
                            : 'bg-white/60 border border-white/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                        : index === 1
                          ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                          : index === 2
                            ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white'
                            : isDarkMode
                              ? 'bg-white/20 text-white'
                              : 'bg-gray-200 text-gray-700'
                    }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </div>
                    <div>
                      <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {user.name}
                      </div>
                      <div className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-gray-600'}`}>
                        {user.completions} Challenges
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${
                      index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-500' : isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {user.points}
                    </div>
                    <div className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-gray-500'}`}>
                      Punkte
                    </div>
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Here admins could reset user progress if needed
                        }}
                        className={`mt-1 px-2 py-1 text-xs rounded-lg transition-colors ${
                          isDarkMode ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className={`text-center py-8 ${isDarkMode ? 'text-white/60' : 'text-gray-500'}`}>
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Noch keine Teilnehmer</p>
                <p className="text-sm mt-1">Seid die ersten, die Challenges abschließen!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Challenges Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredChallenges.map((challenge) => {
          const Icon = challenge.icon;
          const isCompleted = isChallengeCompleted(challenge.id);
          const completionCount = getChallengeCompletionCount(challenge.id);

          return (
            <div
              key={challenge.id}
              className={`group relative p-6 rounded-3xl backdrop-blur-xl transition-all duration-500 ${isAdmin || !isCompleted ? 'hover:scale-[1.03] cursor-pointer' : 'cursor-default'} shadow-2xl min-h-[280px] flex flex-col ${
                isDarkMode 
                  ? 'bg-white/10 border border-white/20 hover:bg-white/15 shadow-black/20' 
                  : 'bg-white/70 border border-white/40 hover:bg-white/85 shadow-gray-500/10'
              } ${isCompleted ? 'ring-3 ring-green-400/60 shadow-green-400/20' : ''}`}
              onClick={() => {
                if (isAdmin) {
                  handleToggleChallenge(challenge.id);
                } else if (!isCompleted) {
                  // Guest confirmation for marking challenge as completed
                  const confirmed = window.confirm(
                    `Möchtest du die Challenge "${challenge.title}" als abgeschlossen markieren?\n\nDu kannst sie später nicht selbst wieder rückgängig machen.`
                  );
                  if (confirmed) {
                    handleToggleChallenge(challenge.id);
                  }
                }
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`relative p-4 rounded-2xl bg-gradient-to-br ${categoryColors[challenge.category]} shadow-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6 text-white drop-shadow-sm" />
                  <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <div className="flex items-center gap-3">
                  {completionCount > 0 && (
                    <span className={`text-xs px-3 py-1.5 rounded-full backdrop-blur-md border font-medium ${
                      isDarkMode 
                        ? 'bg-white/15 border-white/20 text-white/80' 
                        : 'bg-white/50 border-white/60 text-gray-700'
                    }`}>
                      {completionCount}x
                    </span>
                  )}
                  {isCompleted ? (
                    <div className="relative">
                      <CheckCircle2 className="w-7 h-7 text-green-400 drop-shadow-md" />
                      <div className="absolute inset-0 rounded-full bg-green-400/20 animate-pulse"></div>
                    </div>
                  ) : (
                    <Circle className={`w-7 h-7 transition-colors duration-300 ${
                      isDarkMode ? 'text-white/40 group-hover:text-white/60' : 'text-gray-400 group-hover:text-gray-600'
                    }`} />
                  )}
                </div>
              </div>

              <div className="flex-1">
                <h4 className={`font-semibold mb-3 text-base leading-tight break-words ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {challenge.title}
                </h4>

                <p className={`text-sm mb-4 leading-relaxed break-words ${
                  isDarkMode ? 'text-white/70' : 'text-gray-600'
                }`}>
                  {challenge.description}
                </p>
              </div>

              <div className="flex items-center justify-between mt-auto gap-2">
                <span className={`text-xs px-2 py-1 rounded-full backdrop-blur-md border font-medium transition-all duration-300 truncate max-w-[120px] ${
                  isDarkMode 
                    ? 'bg-white/10 border-white/20 text-white/80 group-hover:bg-white/15' 
                    : 'bg-white/40 border-white/50 text-gray-700 group-hover:bg-white/60'
                }`}>
                  {categoryNames[challenge.category]}
                </span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full backdrop-blur-md border transition-all duration-300 truncate max-w-[80px] ${
                  challenge.difficulty === 'easy' 
                    ? 'bg-green-500/20 border-green-400/30 text-green-400' 
                    : challenge.difficulty === 'medium'
                    ? 'bg-yellow-500/20 border-yellow-400/30 text-yellow-400'
                    : 'bg-red-500/20 border-red-400/30 text-red-400'
                }`}>
                  {difficultyNames[challenge.difficulty]}
                </span>
              </div>

              {/* Admin Controls */}
              {isAdmin && isCompleted && (
                <div className="mt-5 pt-5 border-t border-white/20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReactivateChallenge(challenge.id, currentUser, currentDeviceId);
                    }}
                    className={`w-full px-4 py-3 text-sm rounded-2xl backdrop-blur-md border transition-all duration-300 flex items-center justify-center gap-3 font-medium ${
                      isDarkMode 
                        ? 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border-orange-400/40 hover:scale-105 shadow-lg' 
                        : 'bg-orange-100/80 text-orange-700 hover:bg-orange-200/80 border-orange-300/50 hover:scale-105 shadow-lg'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reaktivieren</span>
                  </button>
                </div>
              )}

              {/* Show who completed this challenge */}
              {isAdmin && completionCount > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className={`text-xs ${isDarkMode ? 'text-white/60' : 'text-gray-500'}`}>
                    Abgeschlossen von:
                  </div>
                  <div className="mt-1 space-y-1">
                    {completions
                      .filter(c => c.challengeId === challenge.id)
                      .slice(0, 3)
                      .map((completion, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className={`text-xs ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}>
                            {completion.userName}
                          </span>
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReactivateChallenge(challenge.id, completion.userName, completion.deviceId);
                              }}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                isDarkMode 
                                  ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' 
                                  : 'bg-red-100 text-red-600 hover:bg-red-200'
                              }`}
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    {completionCount > 3 && (
                      <div className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-gray-400'}`}>
                        +{completionCount - 3} weitere
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredChallenges.length === 0 && (
        <div className={`text-center py-16 rounded-3xl backdrop-blur-xl border shadow-2xl ${
          isDarkMode 
            ? 'bg-white/10 border-white/20 shadow-black/20' 
            : 'bg-white/70 border-white/40 shadow-gray-500/10'
        }`}>
          <div className="relative mb-6">
            <Camera className={`w-20 h-20 mx-auto ${
              isDarkMode ? 'text-purple-400' : 'text-purple-500'
            }`} />
            <div className="absolute inset-0 rounded-full bg-purple-500/10 animate-pulse"></div>
          </div>
          <p className={`text-xl font-semibold ${
            isDarkMode ? 'text-white/90' : 'text-gray-800'
          }`}>
            Keine Challenges in dieser Kategorie
          </p>
        </div>
      )}
    </div>
  );
};