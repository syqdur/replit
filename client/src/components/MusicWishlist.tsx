import React, { useState, useEffect } from 'react';
import { Music, Search, X, Plus, Trash2, ExternalLink, AlertCircle, RefreshCw, Check } from 'lucide-react';
import { 
  searchTracks, 
  addTrackToPlaylist, 
  removeTrackFromPlaylist,
  getSelectedPlaylist,
  getPlaylistTracks,
  isSpotifyConnected,
  getCurrentUser,
  subscribeToPlaylistUpdates,
  getCurrentSnapshotId,
  getPendingOperationsCount
} from '../services/spotifyService';
import { SpotifyTrack } from '../types';
import { getUserName, getDeviceId } from '../utils/deviceId';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface MusicWishlistProps {
  isDarkMode: boolean;
  isAdmin?: boolean;
}

interface SongOwnership {
  id: string;
  trackId: string;
  spotifyTrackUri: string;
  addedByUser: string;
  addedByDeviceId: string;
  addedAt: string;
  playlistId: string;
}

export const MusicWishlist: React.FC<MusicWishlistProps> = ({ isDarkMode, isAdmin: adminProp = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSpotifyAvailable, setIsSpotifyAvailable] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<{ id: string; name: string; playlistId: string } | null>(null);
  const [isAddingTrack, setIsAddingTrack] = useState<string | null>(null);
  const [isRemovingTrack, setIsRemovingTrack] = useState<string | null>(null);
  const [showAddSuccess, setShowAddSuccess] = useState(false);
  const [songOwnerships, setSongOwnerships] = useState<SongOwnership[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'live' | 'syncing' | 'error'>('connecting');
  const [unsubscribeSnapshot, setUnsubscribeSnapshot] = useState<(() => void) | null>(null);

  useEffect(() => {
    setIsAdmin(adminProp);
  }, [adminProp]);

  useEffect(() => {
    const checkSpotify = async () => {
      try {
        setIsLoading(true);
        setSyncStatus('connecting');

        const connected = await isSpotifyConnected();
        setIsSpotifyAvailable(connected);

        if (connected) {
          const playlist = await getSelectedPlaylist();
          if (playlist) {
            setSelectedPlaylist(playlist);
            
            const cleanup = subscribeToPlaylistUpdates(playlist.playlistId, (tracks) => {
              setPlaylistTracks(tracks);
              setSyncStatus('live');
            });

            setUnsubscribeSnapshot(() => cleanup);
            await loadSongOwnerships();
          }
        }
      } catch (error) {
        console.error('Failed to check Spotify:', error);
        setError('Failed to load Spotify data');
      } finally {
        setIsLoading(false);
      }
    };

    checkSpotify();

    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  useEffect(() => {
    if (!searchQuery.trim() || !isSpotifyAvailable) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setError(null);

      try {
        const results = await searchTracks(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setError('Failed to search tracks');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, isSpotifyAvailable]);

  const loadSongOwnerships = async () => {
    if (!selectedPlaylist) return;

    try {
      const q = query(
        collection(db, 'songOwnerships'),
        where('playlistId', '==', selectedPlaylist.playlistId)
      );
      const querySnapshot = await getDocs(q);
      const ownerships: SongOwnership[] = [];

      querySnapshot.forEach((doc) => {
        ownerships.push({ id: doc.id, ...doc.data() } as SongOwnership);
      });

      setSongOwnerships(ownerships);
    } catch (error) {
      console.error('Failed to load song ownerships:', error);
    }
  };

  const trackSongOwnership = async (trackId: string, spotifyTrackUri: string) => {
    if (!selectedPlaylist) return;

    const currentUserName = getUserName();
    const currentDeviceId = getDeviceId();

    if (!currentUserName) return;

    try {
      const ownership: Omit<SongOwnership, 'id'> = {
        trackId,
        spotifyTrackUri,
        addedByUser: currentUserName,
        addedByDeviceId: currentDeviceId,
        addedAt: new Date().toISOString(),
        playlistId: selectedPlaylist.playlistId
      };

      await addDoc(collection(db, 'songOwnerships'), ownership);
      setSongOwnerships(prev => [...prev, { ...ownership, id: Date.now().toString() }]);
    } catch (error) {
      console.error('Failed to track song ownership:', error);
    }
  };

  const removeSongOwnership = async (trackId: string) => {
    try {
      const ownership = songOwnerships.find(o => o.trackId === trackId);
      if (ownership) {
        await deleteDoc(doc(db, 'songOwnerships', ownership.id));
        setSongOwnerships(prev => prev.filter(o => o.id !== ownership.id));
      }
    } catch (error) {
      console.error('Failed to remove song ownership:', error);
    }
  };

  const handleAddTrack = async (track: SpotifyTrack) => {
    if (isAddingTrack) return;

    setIsAddingTrack(track.id);
    setError(null);
    setSyncStatus('syncing');

    try {
      await addTrackToPlaylist(track.uri);
      await trackSongOwnership(track.id, track.uri);

      setShowAddSuccess(true);
      setTimeout(() => setShowAddSuccess(false), 2000);

      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      console.error('Failed to add track:', error);

      if (error.requiresReauth || (error.status === 403 && error.message?.includes('Insufficient'))) {
        setError('Spotify permissions insufficient. Please disconnect and reconnect to grant full access.');
      } else {
        setError('Failed to add track to playlist: ' + (error.message || 'Unknown error'));
      }

      setSyncStatus('error');
      setTimeout(() => setSyncStatus('live'), 3000);
    } finally {
      setIsAddingTrack(null);
    }
  };

  const handleRemoveTrack = async (track: any) => {
    if (isRemovingTrack) return;

    if (!confirm(`Remove "${track.track.name}" from the playlist?`)) {
      return;
    }

    setIsRemovingTrack(track.track.id);
    setError(null);
    setSyncStatus('syncing');

    try {
      await removeTrackFromPlaylist(track.track.uri);
      await removeSongOwnership(track.track.id);
    } catch (error: any) {
      console.error('Failed to remove track:', error);
      setError('Failed to remove track from playlist: ' + (error.message || 'Unknown error'));
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('live'), 3000);
    } finally {
      setIsRemovingTrack(null);
    }
  };

  const canDeleteTrack = (track: any) => {
    if (isAdmin) {
      return true;
    }

    const currentUserName = getUserName();
    const currentDeviceId = getDeviceId();

    if (!currentUserName) {
      return false;
    }

    const ownership = songOwnerships.find(o => o.trackId === track.track.id);
    if (!ownership) {
      return false;
    }

    return ownership.addedByUser === currentUserName && ownership.addedByDeviceId === currentDeviceId;
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isSpotifyAvailable) {
    return (
      <div className={`mx-4 my-6 p-8 rounded-3xl transition-all duration-500 relative overflow-hidden ${
        isDarkMode 
          ? 'bg-gradient-to-br from-green-900/40 via-emerald-900/30 to-teal-900/30 border border-green-500/20 backdrop-blur-xl shadow-2xl shadow-green-500/20' 
          : 'bg-gradient-to-br from-green-50/90 via-emerald-50/80 to-teal-50/80 border border-green-200/60 backdrop-blur-xl shadow-2xl shadow-green-500/15'
      }`}>
        <div className="absolute inset-0 opacity-25">
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl ${
            isDarkMode ? 'bg-gradient-to-br from-green-500 to-emerald-500' : 'bg-gradient-to-br from-green-300 to-emerald-300'
          }`} style={{ transform: 'translate(50%, -50%)' }}></div>
          <div className={`absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl ${
            isDarkMode ? 'bg-gradient-to-br from-teal-500 to-cyan-500' : 'bg-gradient-to-br from-teal-300 to-cyan-300'
          }`} style={{ transform: 'translate(-50%, 50%)' }}></div>
        </div>
        
        <div className="relative z-10 text-center py-8">
          <div className={`w-20 h-20 mx-auto mb-6 p-4 rounded-2xl transition-all duration-300 ${
            isDarkMode ? 'bg-green-500/20' : 'bg-green-500/10'
          }`}>
            <Music className={`w-full h-full ${
              isDarkMode ? 'text-green-400' : 'text-green-600'
            }`} />
          </div>
          
          <h3 className={`text-2xl font-bold mb-4 bg-gradient-to-br from-green-500 to-emerald-600 bg-clip-text text-transparent`}>
            Spotify nicht verbunden
          </h3>
          
          <p className={`text-sm max-w-md mx-auto leading-relaxed transition-colors duration-300 ${
            isDarkMode ? 'text-white/70' : 'text-gray-600'
          }`}>
            Ein Administrator muss zuerst ein Spotify-Konto verbinden und eine Playlist auswählen, bevor Musikwünsche möglich sind.
          </p>
        </div>
      </div>
    );
  }

  if (!selectedPlaylist) {
    return (
      <div className={`mx-4 my-6 p-8 rounded-3xl transition-all duration-500 relative overflow-hidden ${
        isDarkMode 
          ? 'bg-gradient-to-br from-green-900/40 via-emerald-900/30 to-teal-900/30 border border-green-500/20 backdrop-blur-xl shadow-2xl shadow-green-500/20' 
          : 'bg-gradient-to-br from-green-50/90 via-emerald-50/80 to-teal-50/80 border border-green-200/60 backdrop-blur-xl shadow-2xl shadow-green-500/15'
      }`}>
        <div className="absolute inset-0 opacity-25">
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl ${
            isDarkMode ? 'bg-gradient-to-br from-green-500 to-emerald-500' : 'bg-gradient-to-br from-green-300 to-emerald-300'
          }`} style={{ transform: 'translate(50%, -50%)' }}></div>
          <div className={`absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl ${
            isDarkMode ? 'bg-gradient-to-br from-teal-500 to-cyan-500' : 'bg-gradient-to-br from-teal-300 to-cyan-300'
          }`} style={{ transform: 'translate(-50%, 50%)' }}></div>
        </div>
        
        <div className="relative z-10 text-center py-8">
          <div className={`w-20 h-20 mx-auto mb-6 p-4 rounded-2xl transition-all duration-300 ${
            isDarkMode ? 'bg-green-500/20' : 'bg-green-500/10'
          }`}>
            <Music className={`w-full h-full ${
              isDarkMode ? 'text-green-400' : 'text-green-600'
            }`} />
          </div>
          
          <h3 className={`text-2xl font-bold mb-4 bg-gradient-to-br from-green-500 to-emerald-600 bg-clip-text text-transparent`}>
            Keine Playlist ausgewählt
          </h3>
          
          <p className={`text-sm max-w-md mx-auto leading-relaxed transition-colors duration-300 ${
            isDarkMode ? 'text-white/70' : 'text-gray-600'
          }`}>
            Ein Administrator muss zuerst eine Playlist für Musikwünsche auswählen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 my-6 space-y-6">
      {/* Header with Spotify Green Theme */}
      <div className={`p-6 rounded-3xl transition-all duration-500 relative overflow-hidden ${
        isDarkMode 
          ? 'bg-gradient-to-br from-green-900/40 via-emerald-900/30 to-teal-900/30 border border-green-500/20 backdrop-blur-xl shadow-2xl shadow-green-500/20' 
          : 'bg-gradient-to-br from-green-50/90 via-emerald-50/80 to-teal-50/80 border border-green-200/60 backdrop-blur-xl shadow-2xl shadow-green-500/15'
      }`}>
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-25">
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl ${
            isDarkMode ? 'bg-gradient-to-br from-green-500 to-emerald-500' : 'bg-gradient-to-br from-green-300 to-emerald-300'
          }`} style={{ transform: 'translate(50%, -50%)' }}></div>
          <div className={`absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl ${
            isDarkMode ? 'bg-gradient-to-br from-teal-500 to-cyan-500' : 'bg-gradient-to-br from-teal-300 to-cyan-300'
          }`} style={{ transform: 'translate(-50%, 50%)' }}></div>
          <div className={`absolute top-1/2 left-1/2 w-16 h-16 rounded-full blur-xl ${
            isDarkMode ? 'bg-gradient-to-br from-lime-500 to-green-500' : 'bg-gradient-to-br from-lime-300 to-green-300'
          }`} style={{ transform: 'translate(-50%, -50%)' }}></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 p-3 rounded-2xl transition-all duration-300 shadow-lg ${
                isDarkMode ? 'bg-gradient-to-br from-green-600/40 to-emerald-600/40 backdrop-blur-sm' : 'bg-gradient-to-br from-green-100/80 to-emerald-100/80 backdrop-blur-sm'
              }`}>
                <svg
                  viewBox="0 0 24 24"
                  className={`w-full h-full transition-all duration-300 transform hover:scale-110 ${
                    isDarkMode ? 'fill-green-300' : 'fill-green-600'
                  }`}
                  style={{
                    animation: 'subtleFloat 6s ease-in-out infinite'
                  }}
                >
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 14.424c-.2.32-.623.42-.943.223-2.587-1.581-5.845-1.94-9.68-1.063-.414.094-.83-.156-.924-.57-.094-.414.156-.83.57-.924 4.195-.96 7.744-.546 10.633 1.223.32.2.42.623.223.943zm1.35-3.005c-.25.4-.781.525-1.181.275-2.96-1.82-7.473-2.349-10.98-1.285-.518.157-1.066-.132-1.223-.65-.157-.518.132-1.066.65-1.223 4.009-1.22 9.068-.643 12.459 1.477.4.25.525.781.275 1.181zm.116-3.129c-3.547-2.106-9.395-2.301-12.78-1.273-.622.189-1.278-.164-1.467-.786-.189-.622.164-1.278.786-1.467 3.876-1.178 10.44-.964 14.564 1.473.513.304.681 1.026.377 1.539-.304.513-1.026.681-1.539.377z"/>
                </svg>
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                  isDarkMode ? 'text-green-300' : 'text-green-600'
                }`}>Wedding Playlist</p>
                <h3 className={`text-2xl font-bold bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 bg-clip-text text-transparent`}>
                  {selectedPlaylist.name}
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <p className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-white/80' : 'text-gray-700'
                  }`}>
                    {playlistTracks.length} Songs • Live Requests
                  </p>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 backdrop-blur-sm ${
                    syncStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                    syncStatus === 'syncing' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                    syncStatus === 'live' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                    'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      syncStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                      syncStatus === 'syncing' ? 'bg-blue-400 animate-pulse' :
                      syncStatus === 'live' ? 'bg-green-400' :
                      'bg-red-400'
                    }`}></div>
                    <span>
                      {syncStatus === 'connecting' ? 'Verbinde...' :
                       syncStatus === 'syncing' ? 'Sync...' :
                       syncStatus === 'live' ? 'Live' :
                       'Fehler'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <a
              href={`https://open.spotify.com/playlist/${selectedPlaylist.playlistId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-3 rounded-2xl transition-all duration-300 hover:scale-110 shadow-lg ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white' 
                  : 'bg-gradient-to-br from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
              }`}
              title="In Spotify öffnen"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>

          {/* Search Section with Instagram 2.0 Style */}
          <div className={`relative p-6 rounded-2xl transition-all duration-500 backdrop-blur-sm ${
            isDarkMode 
              ? 'bg-white/5 border border-white/10' 
              : 'bg-white/50 border border-white/30'
          }`}>
            <div className="relative">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                isDarkMode ? 'text-green-300/60' : 'text-green-500/60'
              }`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for your favorite songs..."
                className={`w-full pl-12 pr-12 py-4 rounded-xl transition-all duration-300 focus:ring-2 focus:ring-green-500/50 outline-none backdrop-blur-sm ${
                  isDarkMode 
                    ? 'bg-white/10 text-white placeholder-white/50 border border-white/20 focus:bg-white/15' 
                    : 'bg-white/70 text-gray-900 placeholder-gray-500 border border-white/30 focus:bg-white/90'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-4 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full transition-all duration-300 hover:scale-110 ${
                    isDarkMode ? 'hover:bg-white/20' : 'hover:bg-gray-200/50'
                  }`}
                >
                  <X className={`w-4 h-4 ${
                    isDarkMode ? 'text-white/70' : 'text-gray-500'
                  }`} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Message with Instagram 2.0 Style */}
      {showAddSuccess && (
        <div className={`p-4 rounded-2xl backdrop-blur-sm transition-all duration-500 ${
          isDarkMode 
            ? 'bg-green-500/20 border border-green-400/30 text-green-300' 
            : 'bg-green-100/80 border border-green-300/50 text-green-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              isDarkMode ? 'bg-green-400/20' : 'bg-green-500/20'
            }`}>
              <Check className="w-4 h-4" />
            </div>
            <span className="font-medium">Song erfolgreich hinzugefügt!</span>
          </div>
        </div>
      )}

      {/* Error Message with Instagram 2.0 Style */}
      {error && (
        <div className={`p-4 rounded-2xl backdrop-blur-sm transition-all duration-500 ${
          isDarkMode 
            ? 'bg-red-500/20 border border-red-400/30 text-red-300' 
            : 'bg-red-100/80 border border-red-300/50 text-red-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              isDarkMode ? 'bg-red-400/20' : 'bg-red-500/20'
            }`}>
              <AlertCircle className="w-4 h-4" />
            </div>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Search Results with Instagram 2.0 Style */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          {searchResults.map((track) => (
            <div key={track.id} className={`p-4 rounded-2xl backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] ${
              isDarkMode 
                ? 'bg-white/5 border border-white/10 hover:bg-white/10' 
                : 'bg-white/60 border border-white/30 hover:bg-white/80'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={track.album.images[0]?.url}
                    alt={track.album.name}
                    className="w-14 h-14 rounded-xl shadow-lg"
                  />
                  <div>
                    <h4 className={`font-semibold mb-1 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {track.name}
                    </h4>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-white/70' : 'text-gray-600'
                    }`}>
                      {track.artists.map(artist => artist.name).join(', ')}
                    </p>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-white/50' : 'text-gray-500'
                    }`}>
                      {track.album.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleAddTrack(track)}
                  disabled={isAddingTrack === track.id}
                  className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 shadow-lg disabled:opacity-50 ${
                    isDarkMode 
                      ? 'bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white' 
                      : 'bg-gradient-to-br from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                  }`}
                >
                  {isAddingTrack === track.id ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Playlist Tracks with Instagram 2.0 Style */}
      <div className="space-y-3">
        {playlistTracks.map((item) => (
          <div key={item.track.id} className={`p-4 rounded-2xl backdrop-blur-sm transition-all duration-300 hover:scale-[1.01] ${
            isDarkMode 
              ? 'bg-white/5 border border-white/10 hover:bg-white/10' 
              : 'bg-white/60 border border-white/30 hover:bg-white/80'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={item.track.album.images[0]?.url}
                  alt={item.track.album.name}
                  className="w-14 h-14 rounded-xl shadow-lg"
                />
                <div>
                  <h4 className={`font-semibold mb-1 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {item.track.name}
                  </h4>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-white/70' : 'text-gray-600'
                  }`}>
                    {item.track.artists.map((artist: any) => artist.name).join(', ')}
                  </p>
                  <p className={`text-xs ${
                    isDarkMode ? 'text-white/50' : 'text-gray-500'
                  }`}>
                    {formatDuration(item.track.duration_ms)}
                  </p>
                </div>
              </div>
              {canDeleteTrack(item) && (
                <button
                  onClick={() => handleRemoveTrack(item)}
                  disabled={isRemovingTrack === item.track.id}
                  className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 shadow-lg disabled:opacity-50 ${
                    isDarkMode 
                      ? 'bg-gradient-to-br from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white' 
                      : 'bg-gradient-to-br from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white'
                  }`}
                >
                  {isRemovingTrack === item.track.id ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {playlistTracks.length === 0 && !isLoading && (
        <div className={`text-center py-12 rounded-2xl backdrop-blur-sm ${
          isDarkMode 
            ? 'bg-white/5 border border-white/10' 
            : 'bg-white/60 border border-white/30'
        }`}>
          <Music className={`w-16 h-16 mx-auto mb-4 ${
            isDarkMode ? 'text-green-400' : 'text-green-500'
          }`} />
          <p className={`text-lg font-medium ${
            isDarkMode ? 'text-white/80' : 'text-gray-700'
          }`}>
            Noch keine Songs in der Playlist
          </p>
          <p className={`text-sm mt-2 ${
            isDarkMode ? 'text-white/60' : 'text-gray-500'
          }`}>
            Suche nach Songs und füge sie zur Playlist hinzu
          </p>
        </div>
      )}
    </div>
  );
};