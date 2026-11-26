const AppError = require('../utils/AppError');

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';
const MAX_POSTERS = 6;

const LANGUAGE_PRIORITY = {
  vi: 0,
  en: 1,
};

const BACKDROP_LANGUAGE_PRIORITY = {
  vi: 1,
  en: 2,
};

const getLanguageRank = (iso) => {
  if (!iso) return 2;
  return LANGUAGE_PRIORITY[iso] ?? 3;
};

// ảnh nền ngang ưu tiên ảnh sạch không chữ (null) hoặc tiếng Việt, rồi tới tiếng Anh
const getBackdropLanguageRank = (iso) => {
  if (!iso) return 0;
  return BACKDROP_LANGUAGE_PRIORITY[iso] ?? 3;
};

// gọi TMDB API bằng Bearer token hoặc api_key dự phòng
const tmdbFetch = async (endpoint, queryParams = {}) => {
  const readToken = (process.env.TMDB_READ_TOKEN || '').trim();
  const apiKey = (process.env.TMDB_API_KEY || '').trim();

  if (!readToken && !apiKey) {
    throw new AppError('Chưa cấu hình khóa truy cập TMDB trên máy chủ.', 503);
  }

  const url = new URL(`${TMDB_API_BASE}${endpoint}`);
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== null && String(value) !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const headers = { Accept: 'application/json' };
  if (readToken) {
    headers.Authorization = `Bearer ${readToken}`;
  } else {
    url.searchParams.set('api_key', apiKey);
  }

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    throw new AppError(
      `Không thể kết nối TMDB (HTTP ${response.status}).`,
      response.status >= 500 ? 502 : 400
    );
  }

  return response.json();
};

// tìm kiếm phim trên TMDB ưu tiên ngôn ngữ tiếng Việt
const searchTmdbMovies = async (query) => {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) return [];

  const data = await tmdbFetch('/search/movie', {
    query: cleanQuery,
    language: 'vi-VN',
    include_adult: 'false',
  });

  return Array.isArray(data?.results) ? data.results : [];
};

// lọc và sắp xếp danh sách ảnh TMDB theo độ ưu tiên ngôn ngữ và điểm đánh giá
const pickUniqueTmdbImages = (rawItems, rankFn, imageBase, limit) => {
  const sorted = Array.isArray(rawItems) ? [...rawItems] : [];
  sorted.sort((a, b) => {
    const rankDiff = rankFn(a.iso_639_1) - rankFn(b.iso_639_1);
    if (rankDiff !== 0) return rankDiff;
    const voteDiff = (Number(b.vote_average) || 0) - (Number(a.vote_average) || 0);
    if (voteDiff !== 0) return voteDiff;
    return (Number(b.vote_count) || 0) - (Number(a.vote_count) || 0);
  });

  const uniqueUrls = [];
  const seen = new Set();
  for (const item of sorted) {
    if (!item?.file_path) continue;
    const fullUrl = `${imageBase}${item.file_path}`;
    if (!seen.has(fullUrl)) {
      seen.add(fullUrl);
      uniqueUrls.push(fullUrl);
      if (uniqueUrls.length >= limit) break;
    }
  }
  return uniqueUrls;
};

// lấy cả bộ poster dọc (w500) và backdrop ngang (w1280) trong 1 lần gọi TMDB
const getTmdbMovieImages = async (tmdbId, limit = MAX_POSTERS) => {
  const safeLimit = Math.max(1, Math.min(MAX_POSTERS, Number(limit) || MAX_POSTERS));
  const data = await tmdbFetch(`/movie/${tmdbId}/images`, {
    include_image_language: 'vi,en,null',
  });

  // chỉ giữ các ảnh backdrop đúng tỷ lệ nằm ngang, ưu tiên ảnh độ phân giải HD+ (>= 1280px)
  const landscapeBackdrops = (Array.isArray(data?.backdrops) ? data.backdrops : []).filter(
    (item) => !item?.width || !item?.height || item.width > item.height
  );
  const hdBackdrops = landscapeBackdrops.filter((item) => (Number(item?.width) || 0) >= 1280);
  const selectedBackdrops = hdBackdrops.length > 0 ? hdBackdrops : landscapeBackdrops;

  return {
    posters: pickUniqueTmdbImages(data?.posters, getLanguageRank, TMDB_IMAGE_BASE, safeLimit),
    backdrops: pickUniqueTmdbImages(
      selectedBackdrops,
      getBackdropLanguageRank,
      TMDB_BACKDROP_BASE,
      safeLimit
    ),
  };
};

// lấy danh sách URL poster từ TMDB, ưu tiên poster tiếng Việt lên đầu
const getTmdbMoviePosters = async (tmdbId, limit = MAX_POSTERS) => {
  const { posters } = await getTmdbMovieImages(tmdbId, limit);
  return posters;
};

const prependDefaultPath = (list, path, imageBase, limit) => {
  if (!path) return list;
  const fullUrl = `${imageBase}${path}`;
  if (!list.includes(fullUrl) && list.length < limit) {
    return [fullUrl, ...list];
  }
  return list;
};

const buildTmdbMediaResult = ({
  tmdbId,
  title,
  originalTitle,
  posterPath,
  backdropPath,
  posters,
  backdrops,
  limit,
}) => {
  const finalPosters = prependDefaultPath(posters, posterPath, TMDB_IMAGE_BASE, limit);
  const finalBackdrops = prependDefaultPath(backdrops, backdropPath, TMDB_BACKDROP_BASE, limit);

  return {
    tmdbId,
    title: title || '',
    originalTitle: originalTitle || '',
    posterUrl: finalPosters[0] || '',
    posterUrls: finalPosters.slice(1, limit),
    candidates: finalPosters,
    backdropUrl: finalBackdrops[0] || '',
    backdropCandidates: finalBackdrops,
  };
};

// lấy bộ poster và backdrop tiếng Việt cho 1 phim theo tên tìm kiếm
const fetchPostersByTitle = async (title, limit = MAX_POSTERS) => {
  const results = await searchTmdbMovies(title);
  if (results.length === 0) return null;

  const match = results[0];
  const { posters, backdrops } = await getTmdbMovieImages(match.id, limit);

  return buildTmdbMediaResult({
    tmdbId: match.id,
    title: match.title || title,
    originalTitle: match.original_title,
    posterPath: match.poster_path,
    backdropPath: match.backdrop_path,
    posters,
    backdrops,
    limit,
  });
};

// lấy bộ poster và backdrop tiếng Việt trực tiếp theo TMDB ID
const fetchPostersById = async (tmdbId, limit = MAX_POSTERS) => {
  const numericId = Number(tmdbId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new AppError('TMDB ID không hợp lệ.', 400);
  }

  const [detail, media] = await Promise.all([
    tmdbFetch(`/movie/${numericId}`, { language: 'vi-VN' }),
    getTmdbMovieImages(numericId, limit),
  ]);

  return buildTmdbMediaResult({
    tmdbId: numericId,
    title: detail?.title,
    originalTitle: detail?.original_title,
    posterPath: detail?.poster_path,
    backdropPath: detail?.backdrop_path,
    posters: media.posters,
    backdrops: media.backdrops,
    limit,
  });
};

module.exports = {
  TMDB_IMAGE_BASE,
  TMDB_BACKDROP_BASE,
  searchTmdbMovies,
  getTmdbMovieImages,
  getTmdbMoviePosters,
  fetchPostersByTitle,
  fetchPostersById,
};
