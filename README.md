# Screen Radar

<!-- coolcode:guide -->
Search TVmaze, filter the Canadian film shelf, or choose **Actors by birthplace** to find people born near a town and open their notable credits, then save titles to this browser’s watchlist and export it as CSV. Source records provide credits and release information; the app does not establish current streaming availability.
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

## Actors by birthplace

Choose **Actors by birthplace**, find a town or enter coordinates, then **Find actors**. Wikidata provides people with an actor occupation (including subclasses such as film, television, stage and voice acting) whose recorded birthplace coordinate is within 1–100 km. Up to 100 birthplace statements are returned. Distances are from the recorded place coordinate, often a town centre—not a birth address or current home. Multiple recorded birthplaces remain labelled. Missing records are coverage gaps, not evidence nobody was born there.

**Show notable credits** looks up the actor's Wikidata ID through the existing CoolCode TMDb gateway and displays a bounded selection of cast credits ranked by number of TMDb votes. Save movies or series into the same browser watchlist and CSV export. Birthplace searches send coordinates to Wikidata; town lookup uses English Wikipedia. Credits send only the public actor ID through the server, which holds the TMDb credential. There are no credentials in this repository. The standard TVmaze search and film shelf remain available if TMDb is unavailable.

This product uses the TMDB API but is not endorsed or certified by TMDB. TMDb logo is supplied for API attribution. Credits and images are attributed to TMDb; viewing availability is not inferred.

Edit `web/actors-config.json` to add preset towns or change the public API base. Arbitrary coordinates and town searches require no code changes. No new scheduled collector or API key is required. Source interfaces: [Wikidata Query Service manual](https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual), [Wikipedia coordinates API](https://www.mediawiki.org/wiki/API:Geosearch), [TMDb find](https://developer.themoviedb.org/reference/find-by-id) and [combined credits](https://developer.themoviedb.org/reference/person-combined-credits).
