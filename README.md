# Screen Radar

<!-- coolcode:guide -->
Search TVmaze or filter the Canadian film shelf, then save titles to this browser’s watchlist and export it as CSV. Source records provide credits and release information; the app does not establish current streaming availability.
<!-- /coolcode:guide -->

Discover television by title using [TVmaze](https://www.tvmaze.com/api), or browse a handpicked shelf of Canadian films. TV records link directly to TVmaze and can show seasons, cast, and alternate titles. Film records are manually curated against [Wikidata structured data](https://www.wikidata.org/wiki/Wikidata:Copyright) (CC0). Coverage is selective and year labels refer to initial or festival releases where known.

Search requests go to TVmaze; its poster CDN supplies TV artwork. TVmaze metadata is used under CC BY-SA and each result links back to its source record. The app makes no claims about where a title is currently streaming.

Watchlist data stays in the current browser and exports as CSV. Clearing site data also clears the watchlist. No accounts or keys are required.

```sh
python3 scripts/build.py
python3 -m http.server --directory dist 8000
```

## Regression checks

Pull requests that change code run logic tests and Chromium checks at this tool’s
Pages subpath, including a real control interaction and 320/390-pixel layouts.
Documentation-only pull requests skip this workflow. Publication waits for the
same checks. Test data stays in a separate job and is never packaged for Pages.

```sh
node --test tests/*.test.mjs
python3 scripts/build.py
python3 -m pip install -r tests/browser-requirements.txt
python3 -m playwright install chromium
python3 tests/browser_smoke.py
```
