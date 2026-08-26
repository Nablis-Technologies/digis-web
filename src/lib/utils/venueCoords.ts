export interface VenueCoords {
  lat: number;
  lng: number;
  address: string;
}

export const VENUE_COORDS: Record<string, VenueCoords> = {
  'Millennium Hall': { lat: 9.0084, lng: 38.7682, address: 'Bole, Addis Ababa, Ethiopia' },
  'Sheraton Addis': { lat: 9.0237, lng: 38.7635, address: 'Taitu Street, Addis Ababa, Ethiopia' },
  'Hyatt Regency': { lat: 9.0095, lng: 38.7616, address: 'Meskel Square, Addis Ababa, Ethiopia' },
  'Addis Fine Art Gallery': { lat: 9.0058, lng: 38.7723, address: 'Bole Road, Addis Ababa, Ethiopia' },
  'Hager Fikir Theatre': { lat: 9.0353, lng: 38.7505, address: 'Piassa, Addis Ababa, Ethiopia' },
  'National Museum, Addis': { lat: 9.0379, lng: 38.7619, address: 'King George VI St, Addis Ababa, Ethiopia' },
};

const DEFAULT: VenueCoords = { lat: 9.0307, lng: 38.7407, address: 'Addis Ababa, Ethiopia' };

export function getVenueCoords(venue: string): VenueCoords {
  // Match by checking if any key is contained in venue string (handles "Millennium Hall, Addis Ababa")
  for (const key of Object.keys(VENUE_COORDS)) {
    if (venue.toLowerCase().includes(key.toLowerCase())) return VENUE_COORDS[key];
  }
  return DEFAULT;
}
