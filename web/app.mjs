import { csvCell, filmItem, plainSummary, searchFilms, tvItem } from './model.mjs';

const api = 'https://api.tvmaze.com/';
const storeKey = 'coolcode.screenradar.watchlist.v1';
const get = id => document.getElementById(id);
const status = get('status');
const results = get('results');
const query = get('query');
const details = get('details');
const body = get('detail-body');
let view = 'tv';
let films;
let filmError = false;
let tvResult = [];
let tvQuery = '';
let tvState = 'idle';
let tvMessage = '';
let searchController;
let detailsController;
let saved = readSaved();

function element(tag, text, cls) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
}

function link(text, url) {
  const node = element('a', text);
  node.href = url;
  node.target = '_blank';
  node.rel = 'noopener noreferrer';
  return node;
}

function button(text, action, cls = 'pill') {
  const node = element('button', text, cls);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}

function setStatus(text, error = false) {
  status.textContent = text;
  status.dataset.error = String(error);
}

function readSaved() {
  try {
    const items = JSON.parse(localStorage.getItem(storeKey) || '[]');
    if (!Array.isArray(items)) return new Map();
    // Reconstitute links and labels instead of trusting URLs from persistent data.
    return new Map(items.slice(0, 500).flatMap(item => {
      if (item?.kind === 'TV' && Number.isSafeInteger(item.id) && typeof item.title === 'string') {
        const tv = { key: 'tv:' + item.id, id: item.id, kind: 'TV', title: item.title, year: item.year, genre: item.genre, detail: item.detail, source: 'TVmaze', url: 'https://www.tvmaze.com/shows/' + item.id };
        return [[tv.key, tv]];
      }
      if (item?.kind === 'Film' && /^Q\d+$/.test(item.id) && typeof item.title === 'string') {
        const film = filmItem({ id: item.id, title: item.title, year: item.year, director: item.detail, genre: item.genre });
        return [[film.key, film]];
      }
      return [];
    }));
  } catch {
    return new Map();
  }
}

function saveItem(item, sourceButton) {
  if (saved.has(item.key)) {
    saved.delete(item.key);
  } else {
    if (saved.size >= 500) {
      setStatus('The watchlist holds up to 500 items. Remove one to add another.', true);
      return;
    }
    const { image, ...localItem } = item;
    saved.set(item.key, localItem);
  }
  let persistent = true;
  try {
    localStorage.setItem(storeKey, JSON.stringify([...saved.values()]));
  } catch {
    persistent = false;
  }
  get('count').textContent = saved.size ? '(' + saved.size + ')' : '';
  if (view === 'saved') {
    render();
    (results.querySelector('button') || get('export')).focus();
  } else {
    configureSaveButton(item, sourceButton);
  }
  if (!persistent) setStatus('The browser blocked storage. This watchlist will last until you reload.', true);
}

function configureSaveButton(item, control) {
  const selected = saved.has(item.key);
  control.textContent = selected ? 'Remove' : 'Save';
  control.setAttribute('aria-label', (selected ? 'Remove ' : 'Save ') + item.title + (selected ? ' from watchlist' : ' to watchlist'));
}

function card(item) {
  const outer = element('article', undefined, 'card');
  const cover = element('div', undefined, 'sleeve');
  cover.setAttribute('aria-hidden', 'true');
  const marker = () => element('small', item.year || item.kind);
  if (item.image) {
    const img = element('img');
    img.alt = '';
    img.src = item.image;
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => cover.replaceChildren(marker()), { once: true });
    cover.append(img);
  } else {
    cover.append(marker());
  }
  const info = element('div', undefined, 'card-body');
  info.append(element('h3', item.title), element('p', [item.kind, item.year, item.genre].filter(Boolean).join(' · '), 'details-line'));
  if (item.detail) info.append(element('p', item.detail, 'details-line'));
  const actions = element('div', undefined, 'card-actions');
  if (item.kind === 'TV') actions.append(button('Show details', () => showDetails(item)));
  const save = button('Save', () => saveItem(item, save));
  configureSaveButton(item, save);
  actions.append(save, link(item.source + ' ↗', item.url));
  info.append(actions);
  outer.append(cover, info);
  return outer;
}

function render() {
  let items = [];
  if (view === 'tv') {
    items = tvResult;
    if (tvState === 'idle') setStatus('Enter a show title or open the Canadian film shelf.');
    if (tvState === 'loading') setStatus('Searching TVmaze…');
    if (tvState === 'error') setStatus(tvMessage, true);
    if (tvState === 'done') setStatus(items.length ? items.length + ' TV matches for “' + tvQuery + '”.' : 'No TV matches for “' + tvQuery + '”. Try a shorter title.');
  } else if (view === 'film') {
    items = films ? searchFilms(films, { query: get('film-query').value, era: get('era').value, genre: get('genre').value }) : [];
    if (filmError) setStatus('The film shelf did not load. Reload to try again.', true);
    else if (!films) setStatus('Opening the Canadian film shelf…');
    else setStatus(items.length ? items.length + ' of ' + films.length + ' Canadian films.' : 'No films match these filters.');
  } else {
    items = [...saved.values()].reverse();
    get('export').disabled = !items.length;
    setStatus(items.length ? items.length + (items.length === 1 ? ' title' : ' titles') + ' saved on this device.' : 'Your watchlist is empty. Save a title from TV search or the film shelf.');
  }
  results.replaceChildren(...items.map(card));
}

function switchView(next) {
  if (!['tv', 'film', 'saved'].includes(next)) return;
  view = next;
  for (const control of document.querySelectorAll('[data-view]')) {
    const selected = control.dataset.view === view;
    control.setAttribute('aria-pressed', String(selected));
    get(control.dataset.view).hidden = !selected;
  }
  render();
}

async function fetchJSON(path, controller) {
  const response = await fetch(api + path, {
    signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    credentials: 'omit', referrerPolicy: 'no-referrer',
  });
  if (response.status === 429) throw new Error('TVmaze is rate limiting requests. Try again shortly.');
  if (!response.ok) throw new Error('TVmaze returned HTTP ' + response.status + '. Try again shortly.');
  return response.json();
}

async function runSearch() {
  const title = query.value.trim();
  if (!title) {
    query.focus();
    return;
  }
  searchController?.abort();
  const controller = new AbortController();
  searchController = controller;
  tvResult = [];
  tvState = 'loading';
  render();
  try {
    const response = await fetchJSON('search/shows?' + new URLSearchParams({ q: title }), controller);
    if (controller.signal.aborted) return;
    if (!Array.isArray(response)) throw new Error('TVmaze returned an unexpected response.');
    tvResult = response.map(row => tvItem(row.show)).filter(Boolean);
    tvQuery = title;
    tvState = 'done';
  } catch (error) {
    if (controller.signal.aborted) return;
    tvState = 'error';
    tvMessage = error instanceof TypeError || error.name === 'TimeoutError' ? 'TVmaze is unavailable from this browser right now. Try again shortly.' : error.message;
  }
  if (view === 'tv') render();
}

function showMeta(data) {
  const list = element('dl', undefined, 'meta-grid');
  for (const [name, value] of Object.entries(data)) {
    if (value) list.append(element('dt', name), element('dd', value));
  }
  return list;
}

async function showDetails(item) {
  detailsController?.abort();
  const controller = new AbortController();
  detailsController = controller;
  body.replaceChildren(element('h2', item.title));
  body.firstChild.id = 'detail-title';
  body.append(link('Open the TVmaze record ↗', item.url));
  const responseArea = element('div');
  responseArea.setAttribute('aria-live', 'polite');
  responseArea.textContent = 'Loading details…';
  body.append(responseArea);
  details.showModal();

  const settled = await Promise.allSettled([
    fetchJSON('shows/' + item.id + '?embed[]=seasons&embed[]=cast', controller),
    fetchJSON('shows/' + item.id + '/akas', controller),
  ]);
  if (controller.signal.aborted) return;
  const [main, other] = settled.map(row => row.status === 'fulfilled' ? row.value : null);
  if (!main) {
    responseArea.textContent = 'Details are unavailable right now. Open the source record above.';
    return;
  }
  const summary = plainSummary(main.summary);
  const cast = main._embedded?.cast?.slice(0, 12).map(row => [row.person?.name, row.character?.name].filter(Boolean).join(' as ')).filter(Boolean);
  const durations = main._embedded?.seasons?.map(row => row.number == null ? '' : 'Season ' + row.number + (Number.isInteger(row.episodeOrder) ? ' (' + row.episodeOrder + ' episodes)' : '')).filter(Boolean);
  const alt = Array.isArray(other) ? [...new Set(other.map(row => row.name).filter(Boolean))].slice(0, 12) : [];
  const metadata = showMeta({
    'Run': [main.premiered, main.ended].filter(Boolean).join(' – '),
    'Status': main.status, 'Language': main.language, 'TVmaze rating': main.rating?.average,
    'Seasons': durations?.join(', '), 'Cast': cast?.join(', '), 'Alternate titles': alt.join(', '),
  });
  responseArea.replaceChildren();
  if (summary) responseArea.append(element('p', summary));
  responseArea.append(metadata);
}

function exportSaved() {
  const rows = [
    ['Title', 'Type', 'Year', 'Genre', 'Source', 'Source URL'],
    ...[...saved.values()].map(item => [item.title, item.kind, item.year, item.genre, item.source, item.url]),
  ];
  const url = URL.createObjectURL(new Blob([rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' }));
  const download = element('a');
  download.href = url;
  download.download = 'screen-radar-watchlist.csv';
  download.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

for (const control of document.querySelectorAll('[data-view]')) control.addEventListener('click', () => switchView(control.dataset.view));
for (const control of document.querySelectorAll('[data-query]')) control.addEventListener('click', () => {
  query.value = control.dataset.query;
  runSearch();
});
get('tv-form').addEventListener('submit', event => {
  event.preventDefault();
  runSearch();
});
for (const name of ['film-query', 'era', 'genre']) get(name).addEventListener('input', render);
get('export').addEventListener('click', exportSaved);
details.addEventListener('close', () => detailsController?.abort());
get('count').textContent = saved.size ? '(' + saved.size + ')' : '';
window.addEventListener('storage', event => {
  if (event.key === storeKey || event.key === null) {
    saved = readSaved();
    get('count').textContent = saved.size ? '(' + saved.size + ')' : '';
    render();
  }
});
fetch('./films.json', { signal: AbortSignal.timeout(10000) }).then(response => {
  if (!response.ok) throw new Error();
  return response.json();
}).then(records => {
  films = records.map(filmItem);
  for (const genre of [...new Set(films.map(film => film.genre))].sort()) get('genre').append(element('option', genre));
  if (view === 'film') render();
}).catch(() => {
  filmError = true;
  if (view === 'film') render();
});
