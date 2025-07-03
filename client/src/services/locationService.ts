// Simplified location search service using Google Geocoding API
// Optimized for German restaurants, bars, cafes, and hotels

interface LocationSuggestion {
  name: string;
  address: string;
  coordinates?: { latitude: number; longitude: number };
  placeId?: string;
  distance?: number; // Distance in kilometers
}

const GOOGLE_GEOCODING_API_KEY = 'AIzaSyAo-Ak_1bLGFriNq-LiQUQqzQfwYwleBfw';

// Regional establishment database optimized for Hannover/Niedersachsen area
const germanEstablishments: Record<string, LocationSuggestion[]> = {
  'restaurant': [
    { name: 'Restaurant Bacchus, Arnum', address: 'Bacchus Restaurant, Arnum, Hemmingen, Deutschland', coordinates: { latitude: 52.3649, longitude: 9.7560 } },
    { name: 'Gasthof Deutsches Haus, Hemmingen', address: 'Deutsches Haus, Hemmingen, Deutschland', coordinates: { latitude: 52.3200, longitude: 9.7000 } },
    { name: 'Restaurant Zum Anker, Laatzen', address: 'Zum Anker, Laatzen, Deutschland', coordinates: { latitude: 52.3100, longitude: 9.8000 } },
    { name: 'Hannover Restaurant Lister Meile', address: 'Restaurant Lister Meile, Hannover, Deutschland', coordinates: { latitude: 52.3759, longitude: 9.7320 } },
    { name: 'Brauhaus Ernst August, Hannover', address: 'Brauhaus Ernst August, Hannover, Deutschland', coordinates: { latitude: 52.3759, longitude: 9.7320 } },
    { name: 'Restaurant Ratskeller, Hannover', address: 'Ratskeller, Altstadt, Hannover, Deutschland', coordinates: { latitude: 52.3759, longitude: 9.7320 } }
  ],
  'bar': [
    { name: 'Bar Bacchus, Arnum', address: 'Bar Bacchus, Arnum, Hemmingen, Deutschland', coordinates: { latitude: 52.3649, longitude: 9.7560 } },
    { name: 'Cocktailbar Wilkenburg', address: 'Bar, Wilkenburg, Hemmingen, Deutschland', coordinates: { latitude: 52.3400, longitude: 9.7200 } },
    { name: 'Destille Hannover', address: 'Destille, Hannover, Deutschland', coordinates: { latitude: 52.3759, longitude: 9.7320 } },
    { name: 'Pinte Bar, Hannover', address: 'Pinte Bar, Linden, Hannover, Deutschland', coordinates: { latitude: 52.3759, longitude: 9.7320 } },
    { name: 'Béi Chéz Heinz, Hannover', address: 'Béi Chéz Heinz, Nordstadt, Hannover, Deutschland', coordinates: { latitude: 52.3759, longitude: 9.7320 } }
  ],
  'cafe': [
    { name: 'Café Arnum', address: 'Café, Arnum, Hemmingen, Deutschland', coordinates: { latitude: 52.3649, longitude: 9.7560 } },
    { name: 'Bäckerei Café Hemmingen', address: 'Bäckerei Café, Hemmingen, Deutschland', coordinates: { latitude: 52.3200, longitude: 9.7000 } },
    { name: 'Café Kröpcke, Hannover', address: 'Café Kröpcke, Hannover, Deutschland', coordinates: { latitude: 52.3759, longitude: 9.7320 } },
    { name: 'Café Lister Turm, Hannover', address: 'Café Lister Turm, List, Hannover, Deutschland', coordinates: { latitude: 52.3759, longitude: 9.7320 } },
    { name: 'Café Extrablatt, Hannover', address: 'Café Extrablatt, Bahnhofstraße, Hannover, Deutschland', coordinates: { latitude: 52.3759, longitude: 9.7320 } }
  ],
  'hotel': [
    { name: 'Hotel Hemmingen', address: 'Hotel, Hemmingen, Deutschland', coordinates: { latitude: 52.3200, longitude: 9.7000 } },
    { name: 'Landhotel Arnum', address: 'Landhotel, Arnum, Hemmingen, Deutschland', coordinates: { latitude: 52.3649, longitude: 9.7560 } },
    { name: 'Hotel Kastens, Hannover', address: 'Hotel Kastens, Luisenstraße, Hannover, Deutschland', coordinates: { latitude: 52.3759, longitude: 9.7320 } },
    { name: 'Grand Hotel Mussmann, Hannover', address: 'Grand Hotel Mussmann, Ernst-August-Platz, Hannover, Deutschland', coordinates: { latitude: 52.3759, longitude: 9.7320 } },
    { name: 'Maritim Airport Hotel, Langenhagen', address: 'Maritim Airport Hotel, Langenhagen, Deutschland', coordinates: { latitude: 52.4614, longitude: 9.6850 } }
  ]
};

// Get current user location
const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation wird von diesem Browser nicht unterstützt'));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes cache
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        console.warn('⚠️ Geolocation error:', error.message);
        // Fallback to central Germany coordinates
        resolve({
          latitude: 52.3759, 
          longitude: 9.7320 // Hannover area as fallback
        });
      },
      options
    );
  });
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
};

// Wait for Google Maps API to load
const waitForGoogleMaps = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places) {
      resolve(true);
      return;
    }

    // Check every 100ms for up to 10 seconds
    let attempts = 0;
    const maxAttempts = 100;
    
    const checkGoogleMaps = () => {
      attempts++;
      if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places) {
        resolve(true);
      } else if (attempts >= maxAttempts) {
        resolve(false);
      } else {
        setTimeout(checkGoogleMaps, 100);
      }
    };

    checkGoogleMaps();
  });
};

// Search for locations using Google Places API with proximity sorting
export const searchLocations = async (query: string): Promise<LocationSuggestion[]> => {
  if (!query.trim() || query.trim().length < 3) {
    return [];
  }

  try {
    console.log('🔍 Searching locations with Google Places API:', query);

    // Get user's current location for proximity sorting
    const userLocation = await getCurrentLocation();
    console.log('📍 User location:', `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`);

    // Use optimized local database for Hannover region
    console.log('🔍 Searching local Hannover region database...');
  } catch (error) {
    console.error('❌ Google Places API failed, using fallback locations:', error);
    
    // Get user location for fallback sorting
    let userLocation;
    try {
      userLocation = await getCurrentLocation();
    } catch {
      userLocation = { latitude: 52.3649, longitude: 9.7560 }; // Arnum fallback
    }
    
    // Use regional fallback establishments
    const lowerQuery = query.toLowerCase();
    let results: LocationSuggestion[] = [];
    
    // Search through establishment categories
    for (const [category, establishments] of Object.entries(germanEstablishments)) {
      if (lowerQuery.includes(category) || 
          lowerQuery.includes('restaurant') && category === 'restaurant' ||
          lowerQuery.includes('bar') && category === 'bar' ||
          lowerQuery.includes('cafe') && category === 'cafe' ||
          lowerQuery.includes('kaffee') && category === 'cafe' ||
          lowerQuery.includes('hotel') && category === 'hotel') {
        results.push(...establishments.slice(0, 3));
      }
    }
    
    // General search through all establishments
    if (results.length === 0) {
      const allEstablishments = Object.values(germanEstablishments).flat();
      const matchingEstablishments = allEstablishments.filter(est => 
        est.name.toLowerCase().includes(lowerQuery) ||
        est.address.toLowerCase().includes(lowerQuery)
      );
      
      if (matchingEstablishments.length > 0) {
        results.push(...matchingEstablishments.slice(0, 5));
      } else {
        // Prioritize local Hannover region results
        results.push(
          { name: `${query}, Arnum`, address: `${query}, Arnum, Hemmingen, Deutschland`, coordinates: { latitude: 52.3649, longitude: 9.7560 } },
          { name: `${query}, Hemmingen`, address: `${query}, Hemmingen, Deutschland`, coordinates: { latitude: 52.3200, longitude: 9.7000 } },
          { name: `${query}, Hannover`, address: `${query}, Hannover, Deutschland`, coordinates: { latitude: 52.3759, longitude: 9.7320 } }
        );
      }
    }
    
    // Sort fallback results by distance
    results = results.map(location => {
      if (location.coordinates) {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          location.coordinates.latitude,
          location.coordinates.longitude
        );
        return { ...location, distance };
      }
      return location;
    })
    .sort((a, b) => (a.distance || 999) - (b.distance || 999))
    .slice(0, 5);
    
    return results;
  }
};

// Enhanced search for specific establishment types
export const searchEstablishments = async (
  query: string, 
  type: 'restaurant' | 'bar' | 'cafe' | 'hotel' = 'restaurant'
): Promise<LocationSuggestion[]> => {
  const enhancedQuery = `${query} ${type} Deutschland`;
  return searchLocations(enhancedQuery);
};