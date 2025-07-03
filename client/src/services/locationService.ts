interface LocationSuggestion {
  name: string;
  address: string;
  coordinates?: { latitude: number; longitude: number };
  placeId?: string;
  distance?: number; // Distance in kilometers
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Real establishments database for Arnum/Hemmingen area with actual businesses
const arnumEstablishments: Record<string, LocationSuggestion[]> = {
  'church': [
    { name: 'St.-Vitus-Gemeinde Wilkenburg-Harkenbleck', address: 'Kirchweg 3, 30966 Hemmingen, Deutschland', coordinates: { latitude: 52.3500, longitude: 9.7400 } },
    { name: 'Ev.-luth. Kirchengemeinde Arnum', address: 'Kirchstr. 8, 30966 Hemmingen-Arnum, Deutschland', coordinates: { latitude: 52.3649, longitude: 9.7560 } },
    { name: 'Katholische Kirche St. Ansgar', address: 'Hoher Weg 8, 30966 Hemmingen, Deutschland', coordinates: { latitude: 52.3200, longitude: 9.7000 } }
  ],
  'restaurant': [
    { name: 'Restaurant Bacchus', address: 'Göttinger Str. 31, 30966 Hemmingen-Arnum, Deutschland', coordinates: { latitude: 52.3649, longitude: 9.7560 } },
    { name: 'Fischerstübchen', address: 'Göttinger Str. 19, 30966 Hemmingen-Arnum, Deutschland', coordinates: { latitude: 52.3655, longitude: 9.7565 } },
    { name: 'Gasthaus Deutsches Haus', address: 'Rathausplatz 1, 30966 Hemmingen, Deutschland', coordinates: { latitude: 52.3200, longitude: 9.7000 } },
    { name: 'Pizzeria Da Mario', address: 'Hoher Weg 12, 30966 Hemmingen, Deutschland', coordinates: { latitude: 52.3210, longitude: 9.7010 } },
    { name: 'Restaurant Athen', address: 'Berliner Str. 45, 30966 Hemmingen, Deutschland', coordinates: { latitude: 52.3180, longitude: 9.6980 } }
  ],
  'cafe': [
    { name: 'Bäckerei Konditorei Wessing', address: 'Göttinger Str. 27, 30966 Hemmingen-Arnum, Deutschland', coordinates: { latitude: 52.3645, longitude: 9.7555 } },
    { name: 'Café am Markt', address: 'Rathausplatz 3, 30966 Hemmingen, Deutschland', coordinates: { latitude: 52.3205, longitude: 9.7005 } },
    { name: 'Bäckerei Steinecke', address: 'Hoher Weg 15, 30966 Hemmingen, Deutschland', coordinates: { latitude: 52.3215, longitude: 9.7015 } }
  ],
  'shop': [
    { name: 'EDEKA Friedrichsen', address: 'Göttinger Str. 22, 30966 Hemmingen-Arnum, Deutschland', coordinates: { latitude: 52.3650, longitude: 9.7550 } },
    { name: 'Apotheke am Rathaus', address: 'Rathausplatz 5, 30966 Hemmingen, Deutschland', coordinates: { latitude: 52.3200, longitude: 9.7005 } },
    { name: 'Fleischerei Bünemann', address: 'Göttinger Str. 15, 30966 Hemmingen-Arnum, Deutschland', coordinates: { latitude: 52.3660, longitude: 9.7570 } }
  ],
  'service': [
    { name: 'Rathaus Hemmingen', address: 'Rathausplatz 1, 30966 Hemmingen, Deutschland', coordinates: { latitude: 52.3200, longitude: 9.7000 } },
    { name: 'Freiwillige Feuerwehr Arnum', address: 'Feuerwehrstr. 2, 30966 Hemmingen-Arnum, Deutschland', coordinates: { latitude: 52.3635, longitude: 9.7545 } },
    { name: 'Grundschule Arnum', address: 'Schulstr. 10, 30966 Hemmingen-Arnum, Deutschland', coordinates: { latitude: 52.3640, longitude: 9.7540 } }
  ]
};

// Search the local Arnum database
function searchArnumDatabase(query: string): LocationSuggestion[] {
  const queryLower = query.toLowerCase();
  const results: LocationSuggestion[] = [];
  
  // Search through all categories
  for (const [category, places] of Object.entries(arnumEstablishments)) {
    for (const place of places) {
      if (place.name.toLowerCase().includes(queryLower) || 
          place.address.toLowerCase().includes(queryLower) ||
          category.includes(queryLower)) {
        results.push(place);
      }
    }
  }
  
  // Sort by relevance (exact matches first)
  results.sort((a, b) => {
    const aExact = a.name.toLowerCase().includes(queryLower);
    const bExact = b.name.toLowerCase().includes(queryLower);
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return 0;
  });
  
  return results.slice(0, 10); // Return top 10 results
}

export const searchLocations = async (query: string): Promise<LocationSuggestion[]> => {
  console.log('🔍 Searching locations across Germany:', query);
  
  const isClient = typeof window !== 'undefined';
  
  if (!isClient) {
    console.log('❌ Not in browser environment');
    return [];
  }

  try {
    // Get user's location first
    const userLocation = await getCurrentLocation();
    console.log('📍 User location:', `${userLocation.latitude}, ${userLocation.longitude}`);
    
    // Make API request to backend for Germany-wide search with distance sorting
    const params = new URLSearchParams({
      query: query,
      lat: userLocation.latitude.toString(),
      lng: userLocation.longitude.toString()
    });
    
    console.log('📡 Searching all of Germany, sorted by distance...');
    const response = await fetch(`/api/search-locations?${params}`);
    
    if (!response.ok) {
      console.log('❌ Backend API error:', response.status);
      // Fallback to local database
      return searchArnumDatabase(query);
    }
    
    const data = await response.json();
    console.log('✅ Backend API response:', `${data.results?.length || 0} results`);
    
    if (data.results && data.results.length > 0) {
      console.log('📍 Found locations across Germany, sorted by distance:', data.results.length);
      return data.results;
    }
    
    // If no nationwide results, try local database
    const localResults = searchArnumDatabase(query);
    if (localResults.length > 0) {
      console.log('🏠 Using local Arnum results as fallback:', localResults.length);
      return localResults;
    }
    
    return [];
  } catch (error) {
    console.error('Location search failed:', error);
    // Return local results as fallback
    return searchArnumDatabase(query);
  }
};

export const searchEstablishments = async (
  query: string,
  userLocation: { latitude: number; longitude: number }
): Promise<LocationSuggestion[]> => {
  console.log('🔍 Searching establishments:', query);
  
  try {
    // First check local database
    const localResults = searchArnumDatabase(query);
    if (localResults.length > 0) {
      console.log('🏠 Found local establishments:', localResults.length);
      return localResults;
    }
    
    // Use general location search as fallback
    return await searchLocations(query);
  } catch (error) {
    console.error('Establishment search failed:', error);
    return [];
  }
};

// Get user's current location
export const getCurrentLocation = (): Promise<{ latitude: number; longitude: number; accuracy: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 60000 // 1 minute cache
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        
        console.log('📍 GPS Location obtained:', coords);
        
        // Check if location is accurate enough
        if (coords.accuracy > 50000) {
          console.warn('⚠️ Location accuracy is poor:', coords.accuracy + 'm');
        }
        
        resolve(coords);
      },
      (error) => {
        console.log('❌ Geolocation error:', error.message);
        
        // Fallback to approximate Arnum location
        const fallbackLocation = {
          latitude: 52.3649,
          longitude: 9.7560,
          accuracy: 50000
        };
        
        console.log('🔄 Using fallback location for Arnum:', fallbackLocation);
        resolve(fallbackLocation);
      },
      options
    );
  });
};

// Reverse geocode coordinates to get location name
export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    // Check if we have Google Maps API key
    if (!GOOGLE_MAPS_API_KEY) {
      console.log('ℹ️ Google Maps API key not available, using fallback services');
      
      // Try Nominatim geocoding service
      console.log('🔍 Trying Nominatim geocoding service...');
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
      
      const response = await fetch(nominatimUrl, {
        headers: { 'User-Agent': 'Wedding-Gallery-App/1.0' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.display_name) {
          // Parse the location to get a clean name
          const parts = data.display_name.split(',');
          const cityState = parts.slice(-4, -1).join(', ').trim();
          
          console.log('📍 Nominatim parsed location:', {
            name: cityState,
            fullAddress: data.display_name
          });
          
          return cityState;
        }
      }
    }
    
    // Fallback to generic location
    return 'Arnum, Deutschland';
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return 'Arnum, Deutschland';
  }
};

export type { LocationSuggestion };