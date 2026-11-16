# Screen Radar

Discover television by title using [TVmaze](https://www.tvmaze.com/api), or browse a handpicked shelf of Canadian films. TV records link directly to TVmaze and can show seasons, cast, and alternate titles. Film records are manually curated against [Wikidata structured data](https://www.wikidata.org/wiki/Wikidata:Copyright) (CC0). Coverage is selective and year labels refer to initial or festival releases where known.

Search requests go to TVmaze; its poster CDN supplies TV artwork. TVmaze metadata is used under CC BY-SA and each result links back to its source record. The app makes no claims about where a title is currently streaming.

Watchlist data stays in the current browser and exports as CSV. Clearing site data also clears the watchlist. No accounts or keys are required.

```sh
python3 scripts/build.py
python3 -m http.server --directory dist 8000
```
