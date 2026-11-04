# Share copy — US County Wage Explorer

Pick a lane. Each one stands alone. Replace `LINK` with the live URL before posting.

---

## The hook (use this if you only read one line)

> 642 MB of government wage data. A 64 KB web page. No backend.

---

## LinkedIn

> The Department of Labor publishes the prevailing wage for every occupation in every US
> county. It's the data behind every H-1B and PERM filing. It ships as 642 MB of CSVs.
>
> I turned it into a map.
>
> Type your ZIP. Type your job. See what it pays where you live, where it pays most, and how
> far the gap goes from entry level to senior.
>
> A few things I learned building it:
>
> → The median occupation pays **2.74× more** in its best county than its worst. For 299 of
> the 847 occupations, the gap is over 3×.
>
> → Connecticut abolished its counties in 2022. Nine planning regions replaced eight
> counties, and most map data hasn't caught up — the whole state renders blank in a lot of
> tools. Fixing it meant joining all 169 Connecticut towns across two Census vintages.
>
> → 63 occupations are published as annual salaries and the rest as hourly rates, with
> nothing in the data to flag which. $236,770 and $87.04 look identical with a dollar sign
> in front of them.
>
> The whole thing is one HTML file. No backend, no build step, no server. 642 MB compresses
> to 34 MB, and a single lookup pulls 39 KB.
>
> LINK

---

## X / Twitter

**Single post**

> The DOL publishes what every job pays in every US county.
>
> It ships as 642 MB of CSVs.
>
> I made it a map. One HTML file, no backend, 39 KB per lookup.
>
> LINK

**Thread**

> 1/ The US government publishes the prevailing wage for 997 occupations in all 3,275
> counties. It's the data behind every H-1B filing.
>
> It ships as 642 MB of CSVs that nobody can read.

> 2/ So I made it a map. Type a ZIP, type a job, see what it pays.
>
> One HTML file. No backend. No build step. 64 KB.

> 3/ The compression trick: split by occupation, gzip each file. 642 MB → 34 MB. A single
> lookup pulls 39 KB instead of 740 KB, inflated in the browser with DecompressionStream.

> 4/ Fun fact that fell out of the data: the median occupation pays **2.74×** more in its
> best county than its worst.
>
> Athletes: 20.85×. Prosthodontists: identical in all 3,275 counties.

> 5/ The bug I'm proudest of catching: 63 occupations are published as *annual* salaries,
> the rest hourly, and nothing in the data says which.
>
> $236,770 and $87.04 render identically if you don't know.

> 6/ And Connecticut abolished its counties in 2022. Nine planning regions replaced eight
> counties. Most map data still has the old ones, so CT renders blank.
>
> Fixed by joining 169 CT towns across two Census vintages.

> 7/ Free, no signup, nothing to install.
>
> LINK

---

## Reddit (r/dataisbeautiful, r/webdev, r/immigration)

**Title:** I mapped what every occupation pays in every US county (997 jobs, 3,275 counties, DOL prevailing wage data)

> The Department of Labor publishes prevailing wage data for every occupation in every US
> county — the figures that govern H-1B and PERM filings. It's public, and it's 642 MB of
> CSVs with a county-by-county dropdown interface.
>
> I rebuilt it as a map you can search by ZIP code.
>
> **Technical bits, since this sub asks:** it's a single 64 KB HTML file with no backend and
> no build step. D3 for the map, the rest hand-rolled. The 642 MB is split by SOC code and
> gzipped to 34 MB total, served off GitHub LFS — one lookup pulls about 39 KB and inflates
> in the browser.
>
> **Some things in the data that surprised me:**
>
> - The median occupation pays 2.74× more in its best county than its worst
> - 299 of 847 occupations have a spread over 3×
> - From Level 1 to Level 4 (entry to senior), the median occupation gains 1.60×; the top
>   gains 9.32×
> - One occupation pays exactly the same in all 3,275 counties
>
> Data is DOL OFLC, wage year 2026–27. Informational only — use the official source for
> anything real.
>
> LINK

---

## Hacker News

**Title:** Show HN: Every US county's prevailing wage for 997 occupations, in one HTML file

> The DOL publishes prevailing wage determinations for every occupation in every US county.
> 642 MB of CSVs, 3.2M rows, behind a dropdown-driven table.
>
> I rebuilt it as a searchable map in a single 64 KB HTML file — no backend, no build step,
> no framework. Data is split by SOC code, gzipped to 34 MB total, and served off GitHub
> LFS; a lookup pulls ~39 KB and inflates with DecompressionStream.
>
> Three things that made it more interesting than expected:
>
> 1. 63 of 848 occupations are published as annual salaries rather than hourly rates, and
>    nothing in the numbers distinguishes them. The `Label` column is ambiguous — `High Wage`
>    is a cap flag that appears on both. What settles it is that the ranges never overlap
>    (no hourly figure above $500, no annual below $15,000) and the unit is constant within
>    a SOC code.
>
> 2. Connecticut replaced its eight counties with nine planning regions in 2022. OFLC
>    publishes the new ones; most county geometry is still 2020 vintage, so the state renders
>    blank. I built the crosswalk by joining all 169 CT towns across both Census Gazetteer
>    vintages on ANSI codes, weighted by land area.
>
> 3. 30% of ZCTAs touch more than one county, but for 57% of those every county sits in the
>    same wage area, so the ambiguity is moot. It only changes the answer for ~6.6% of ZIPs,
>    and the page names the alternatives there instead of guessing.
>
> Source and build script in the repo. Informational only — the official source is
> flag.dol.gov.
>
> LINK

---

## One-liners

- 642 MB of government wage data. A 64 KB web page. No backend.
- What does your job pay in your county? Now it's a map.
- The median US occupation pays 2.74× more in its best county than its worst.
- Every job, every county, what it pays. One HTML file.
- Connecticut abolished its counties in 2022. Most maps still haven't noticed.

## Alt text for the screenshot

> A dark interactive map of US counties shaded by wage, with a search box reading "Software
> Developers" and a side panel showing Santa Clara, CA at $106.59 per hour, ranked 1 of 3,136
> counties.
