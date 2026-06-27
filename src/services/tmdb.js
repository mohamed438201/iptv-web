import axios from 'axios';

// Replace with your actual TMDB API key in .env file
export const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
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

    // 2. Fetch details (including videos, credits, ratings)
    const detailsRes = await tmdbApi.get(`/${mediaType}/${tmdbId}`, {
      params: { append_to_response: 'videos,images,credits,release_dates,content_ratings', language: 'en-US' }, // fallback to en for better images/videos
    });

    const data = detailsRes.data;
    
    // Extract Youtube trailer
    let trailerKey = null;
    if (data.videos && data.videos.results) {
      const trailer = data.videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer') || 
                      data.videos.results.find(v => v.site === 'YouTube');
      if (trailer) trailerKey = trailer.key;
    }

    // Get backdrop and poster
    const backdropPath = data.backdrop_path || data.belongs_to_collection?.backdrop_path;
    const backdropUrl = backdropPath ? `https://image.tmdb.org/t/p/original${backdropPath}` : null;
    
    // Extract year
    const releaseDate = data.release_date || data.first_air_date;
    const year = releaseDate ? releaseDate.substring(0, 4) : null;
    
    // Extract rating
    const rating = data.vote_average ? data.vote_average.toFixed(1) : null;

    // Extract Cast, Director, Writer
    let cast = null;
    let director = null;
    let writer = null;
    if (data.credits) {
      if (data.credits.cast) {
        cast = data.credits.cast.slice(0, 4).map(c => c.name).join(', ');
      }
      if (data.credits.crew) {
        const dir = data.credits.crew.find(c => c.job === 'Director');
        if (dir) director = dir.name;
        
        const writ = data.credits.crew.find(c => c.department === 'Writing' || c.job === 'Writer' || c.job === 'Screenplay');
        if (writ) writer = writ.name;
      }
    }

    // Extract Age Rating
    let ageRating = null;
    if (isMovie && data.release_dates?.results) {
      const usRelease = data.release_dates.results.find(r => r.iso_3166_1 === 'US');
      if (usRelease && usRelease.release_dates.length > 0) {
        ageRating = usRelease.release_dates[0].certification;
      }
    } else if (!isMovie && data.content_ratings?.results) {
      const usRating = data.content_ratings.results.find(r => r.iso_3166_1 === 'US');
      if (usRating) {
        ageRating = usRating.rating;
      }
    }

    return {
      backdropUrl,
      poster_path: data.poster_path,
      trailerKey,
      tmdbId,
      year,
      rating,
      cast,
      director,
      writer,
      ageRating: ageRating || '16+',
      overview: data.overview || item.overview
    };

  } catch (error) {
    console.error("Error fetching TMDB details:", error);
    return null;
  }
};
