export function safeURL(value, host) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === host && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export function plainSummary(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/<\/?(?:p|br|div)\b[^>]*>/gi, ' ').replace(/<[^>]+>/g, '')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (full, raw) => {
      const token = raw.toLowerCase();
      if (token[0] !== '#') return entities[token] ?? full;
      const point = token[1] === 'x' ? Number.parseInt(token.slice(2), 16) : Number(token.slice(1));
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : full;
    }).replace(/\s+/g, ' ').trim();
}

export function tvItem(show) {
  if (!show || !Number.isSafeInteger(show.id) || !show.name) return null;
  const host = 'www.tvmaze.com';
  return {
    key: 'tv:' + show.id, id: show.id, title: show.name, kind: 'TV',
    year: Number(show.premiered?.slice(0, 4)) || '',
    genre: Array.isArray(show.genres) ? show.genres.join(', ') : '',
    detail: show.network?.name || show.webChannel?.name || show.type || '',
    image: safeURL(show.image?.medium, 'static.tvmaze.com'),
    source: 'TVmaze', url: safeURL(show.url, host) || 'https://www.tvmaze.com/shows/' + show.id,
  };
}

export function filmItem(film) {
  return {
    key: 'film:' + film.id, id: film.id, kind: 'Film', title: film.title,
    year: film.year, genre: film.genre, detail: film.director,
    source: 'Wikidata', url: 'https://www.wikidata.org/wiki/' + film.id,
  };
}

export function searchFilms(films, {query = '', era = '', genre = ''} = {}) {
  const normalize = text => text.toLocaleLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  return films.filter(film => {
    const haystack = normalize([film.title, film.detail, film.genre].join(' '));
    const terms = normalize(query.trim()).split(/\s+/);
    return terms.every(term => haystack.includes(term))
      && (!era || Math.floor(film.year / 10) * 10 === Number.parseInt(era, 10))
      && (!genre || film.genre === genre);
  }).sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
}

export function csvCell(value) {
  let text = String(value ?? '');
  // A watchlist title can originate outside CoolCode. Prevent formulas in spreadsheets.
  if (/^[\s\uFEFF]*[=+@-]|^[\r\n\t]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
