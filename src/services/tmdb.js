import axios from 'axios';

// TODO: Replace with your actual TMDB API key
export const TMDB_API_KEY = '2158f4f6657eaaf67d6f140fa9971124';
const BASE_URL = 'https://api.themoviedb.org/3';

const tmdbApi = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: TMDB_API_KEY,
  },
});

export const getTmdbDetails = async (item, type = 'vod') => {
  if (!TMDB_API_KEY || TMDB_API_KEY === 'YOUR_TMDB_API_KEY_HERE') {
    return null; // Skip if no API key
  }

  try {
    const isMovie = type === 'vod';
    const mediaType = isMovie ? 'movie' : 'tv';
    let tmdbId = item.tmdb_id || item.info?.tmdb_id;

    // 1. If we don't have tmdbId, search by name
    if (!tmdbId) {
      const queryName = item.name || item.title;
      if (!queryName) return null;
      
      const searchRes = await tmdbApi.get(`/search/${mediaType}`, {
        params: { query: queryName, language: 'ar-SA' },
      });
      
      if (searchRes.data.results && searchRes.data.results.length > 0) {
        tmdbId = searchRes.data.results[0].id;
      }
    }

    if (!tmdbId) return null;

    // 2. Fetch details (including videos)
    const detailsRes = await tmdbApi.get(`/${mediaType}/${tmdbId}`, {
      params: { append_to_response: 'videos,images', language: 'en-US' }, // fallback to en for better images/videos
    });

    const data = detailsRes.data;
    
    // Extract Youtube trailer
    let trailerKey = null;
    if (data.videos && data.videos.results) {
      const trailer = data.videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer') || 
                      data.videos.results.find(v => v.site === 'YouTube');
      if (trailer) trailerKey = trailer.key;
    }

    // Get backdrop
    const backdropPath = data.backdrop_path || data.belongs_to_collection?.backdrop_path;
    const backdropUrl = backdropPath ? `https://image.tmdb.org/t/p/original${backdropPath}` : null;
    
    return {
      backdropUrl,
      trailerKey,
      tmdbId,
      overview: data.overview || item.overview
    };

  } catch (error) {
    console.error("Error fetching TMDB details:", error);
    return null;
  }
};
