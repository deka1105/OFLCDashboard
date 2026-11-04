# US County Wage Explorer

**What does your job pay, in your county?** 997 occupations across 3,275 US counties, mapped.

Built on the Department of Labor's prevailing wage data for wage year 2026–27 — the figures
that actually govern H-1B, PERM and other labor certifications. The official tool makes you
pick a state, then a county, then an occupation, then read a table. This one is a map.

**642 MB of government CSVs. A 64 KB web page. No backend, no build step, no server.**

---

## What it does

- **Search 997 occupations** — O*NET titles, not SOC jargon
- **Find your county by ZIP** — type `19104`, get Philadelphia; type `brooklyn`'s county and get Kings
- **All four prevailing wage levels** — entry through senior, plus the average
- **Hourly ⇄ yearly toggle** — converts at 2,080 h/yr, and says so when a figure is converted
- **Rank and career arc** — where your county sits out of 3,136, and how far Level 1 climbs to Level 4
- **Shareable URLs** — `?occ=Software+Developers&zip=19104` restores the exact view

## How it works

```
OFLC_Wages_2026-27/          build_2027.py            2027Live/index.html
  ALC_Export.csv       ──▶   merge, split,      ──▶   fetch one .csv.gz
  Geography.csv              gzip per SOC             per occupation
  xwalk_plus.csv
```

One HTML file. D3 for the map, TopoJSON for the county geometry, everything else hand-rolled.
The wage data lives in Git LFS and is served straight off `media.githubusercontent.com`, so
there is nothing to deploy but four static files.

### The numbers

| | |
|---|---|
| Wage rows | 3,265,175 |
| Occupations / SOC codes | 997 / 848 |
| Counties in the data | 3,275 |
| Raw → shipped | 642 MB → **33.7 MB** (5.3%) |
| Median occupation download | **39 KB** gzipped |
| The page itself | 64 KB, zero dependencies bundled |

Splitting by SOC code means one lookup pulls one file. Gzipping it means that file is 39 KB
instead of 740 KB. `DecompressionStream` inflates it in the browser, with a lazy `pako`
fallback for browsers that lack it.

## Running it

No build step. Serve the folder and open it:

```bash
cd 2027Live && python3 -m http.server 8731
# http://127.0.0.1:8731/index.html
```

Rebuilding the data from the raw OFLC download:

```bash
cd 2027 && python3 build_2027.py
```

That writes `DividedCSV/*.csv.gz`, the occupation index, the ZIP crosswalk and the
fallback overlay. It is deterministic — `mtime=0` and a stable mergesort, so rebuilding
identical input produces byte-identical output.

## Things that were harder than they looked

**Hourly or annual?** OFLC publishes 63 occupations as annual salaries and the rest as
hourly rates, with nothing in the numbers to say which. A radiologist's `$236770.00` and a
developer's `$87.04` were rendering with the same `$` and the same two decimals. The `Label`
column half-answers it, but `High Wage` is a cap flag that sits on both kinds of row. The
magnitudes settle it — no hourly figure reaches $500, no annual one falls below $15,000 —
and the unit turns out to be constant across every row of a SOC code, so it ships as one
letter per occupation in a 997-row index. `build_2027.py` fails the build if a future year
narrows that gap.

**Connecticut has no counties.** It replaced all eight with nine planning regions in 2022,
which is what OFLC now publishes, while the map geometry is 2020 vintage. The whole state
rendered grey for every occupation. Fixed by joining all 169 CT towns across both Census
vintages on their stable ANSI codes and weighting by land area, so each old county is drawn
from the region that covers most of it.

**ZIP codes don't respect county lines.** 30% of ZCTAs touch more than one county, but most
of those are empty slivers. The page keeps counties holding ≥15% of the ZIP's land and names
the others rather than silently picking one. Worth knowing: for 57% of genuinely split ZIPs,
every county is in the same OES wage area, so the choice changes nothing — it only matters
for about 6.6% of all ZIPs, and those are exactly the ones that show the alternatives.

**Missing years.** 1,759 cells carry no 2026–27 wage at all. Where 2025–26 had one, it is
used and tagged with its wage year — never silently. That took Legislators from a completely
blank map to all 3,275 counties.

## Known limits

- **Puerto Rico, Guam and the US Virgin Islands are not drawn.** The county topology covers
  the 50 states and DC only; there is no geometry to colour. Their rows are in the data.
- **Naugatuck Valley Planning Region** doesn't dominate any pre-2022 Connecticut county, so
  the Waterbury-Shelton wage area has no shape on this map.
- Wage figures are informational. For anything that matters, use the
  [official source](https://flag.dol.gov/wage-data/wage-data-downloads).

## Data sources

- **Wages** — [DOL OFLC Wage Data](https://flag.dol.gov/wage-data/wage-data-downloads), wage year 2026–27
- **County geometry** — [us-atlas](https://github.com/topojson/us-atlas) `counties-albers-10m`
- **ZIP → county** — US Census Bureau 2020 ZCTA–County relationship file
- **Connecticut crosswalk** — US Census Bureau Gazetteer, 2020 and 2024 county subdivisions

Not affiliated with or endorsed by the US Department of Labor.

---

Built by [Shubham A. D.](http://sdfolio.com) · [sdfolio.com](http://sdfolio.com)
