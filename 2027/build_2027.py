"""Build the 2027 (wage year 2026-27) dashboard data from the raw OFLC download.

Based on the pipeline behind 2026/DividedCSV and 2026/Prof_w_links*.csv
(originally 2026/NoteBooks/OFLC_Mar06_2026.ipynb), with two changes:

  * titles keep their real commas. The 2026 files replaced them with ';'
    because the dashboard parsed its index with a bare row.split(','); the
    page now uses a quoted-CSV parser, so the substitution is gone.
  * per-occupation files are written gzipped. GitHub serves LFS content
    with no content-encoding, and these files compress to about 5% of
    their size, so shipping .csv.gz cuts each page view from ~770 KB to
    ~42 KB. The page inflates them with DecompressionStream.

Pipeline:
  ALC_Export  x  Geography  on Area                 (inner)
              x  xwalk_plus on SocCode=OES_SOCCODE  (inner)
  drop Label, stable-sort by Area, split by OES_SOCCODE -> DividedCSV/<soc>.csv.gz

Usage:  python3 build_2027.py
"""

import csv
import gzip
import io
import os

import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

SRC = os.path.join(ROOT, "OFLC_Wages_2026-27")
DIVIDED_DIR = os.path.join(HERE, "DividedCSV")
URL_BASE = (
    "https://media.githubusercontent.com/media/deka1105/OFLCDashboard"
    "/refs/heads/Mobile-Version/2027/DividedCSV/"
)


def build_divided_csv():
    alc = pd.read_csv(os.path.join(SRC, "ALC_Export.csv"))
    geo = pd.read_csv(os.path.join(SRC, "Geography.csv"))
    pro = pd.read_csv(os.path.join(SRC, "xwalk_plus.csv"))

    merged = (
        alc.merge(geo, on="Area", how="inner")
        .merge(pro, left_on="SocCode", right_on="OES_SOCCODE", how="inner")
        .drop(columns=["Label"])
        .sort_values("Area", kind="mergesort")
    )
    print(f"merged rows: {len(merged):,}")

    os.makedirs(DIVIDED_DIR, exist_ok=True)

    # Write each file, then read it back and compare. Occasional writes in this
    # batch come back missing, so retry until the file on disk matches.
    groups = dict(tuple(merged.groupby("OES_SOCCODE")))
    unwritten = []
    raw_total = gz_total = 0
    for soc, group in groups.items():
        buf = io.StringIO()
        group.to_csv(buf, index=False)
        raw = buf.getvalue().encode()
        # mtime=0 so rebuilding identical data produces identical bytes
        want = gzip.compress(raw, compresslevel=9, mtime=0)
        raw_total += len(raw)
        gz_total += len(want)

        path = os.path.join(DIVIDED_DIR, f"{soc}.csv.gz")
        for _ in range(4):
            if os.path.exists(path) and open(path, "rb").read() == want:
                break
            with open(path, "wb") as fh:
                fh.write(want)
        else:
            unwritten.append(soc)

    print(f"wrote {len(groups) - len(unwritten)}/{len(groups)} files to {DIVIDED_DIR}")
    print(f"  {raw_total / 1048576:.0f} MB raw -> {gz_total / 1048576:.0f} MB gzipped "
          f"({gz_total / raw_total * 100:.1f}%)")
    if unwritten:
        raise SystemExit(f"FAILED to write: {unwritten}")


def build_zip_county():
    """Write DividedCSV/../zip_county.csv.gz: ZIP -> county FIPS.

    The wage data is keyed by OES area and county name, never by ZIP, so the
    lookup needs an outside crosswalk. Source is the Census Bureau's 2020
    ZCTA-to-county relationship file (public, no key):

      https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/
          tab20_zcta520_county20_natl.txt

    Two things worth knowing about it:

      * It lists every county a ZCTA touches geometrically, so 30% of ZCTAs
        look 'split' -- but most of those are slivers with nobody in them.
        The primary county is the one holding the most land, which matched all
        22 of the hand-checked city ZIPs (Philadelphia, Brooklyn, Cambridge,
        Palo Alto, Austin, New Orleans...). Counties holding at least 15% are
        kept as secondaries so the page can say "also partly in X County"
        rather than pretending the ZIP sits in one place.
      * ZCTAs are the Census approximation of ZIPs and omit PO-box-only ZIPs,
        so a handful of downtown ZIPs (Atlanta 30301, Phoenix 85001) are
        absent. The page says so instead of guessing.

    Land area is a proxy for population and is the weak point here: a ZIP with
    a large rural tail can be assigned to the emptier county. HUD's crosswalk
    carries true residential ratios and would be the upgrade, but it needs a
    registered API key.
    """
    src = os.path.join(HERE, "census", "tab20_zcta520_county20_natl.txt")
    if not os.path.exists(src):
        raise SystemExit(
            f"missing {src}\n  curl -o {src} \\\n"
            "    https://www2.census.gov/geo/docs/maps-data/data/rel2020/"
            "zcta520/tab20_zcta520_county20_natl.txt"
        )

    parts = {}
    with open(src, encoding="utf-8-sig") as fh:
        for rec in csv.DictReader(fh, delimiter="|"):
            zcta = rec["GEOID_ZCTA5_20"]
            if not zcta:
                continue  # county rows with no ZCTA part
            parts.setdefault(zcta, []).append(
                (int(rec["AREALAND_PART"] or 0), rec["GEOID_COUNTY_20"]))

    lines = ["zip,fips,also"]
    split = 0
    for zcta in sorted(parts):
        ranked = sorted(parts[zcta], reverse=True)
        total = sum(area for area, _ in ranked) or 1
        primary = ranked[0][1]
        also = [f for area, f in ranked[1:] if area / total >= 0.15]
        if also:
            split += 1
        lines.append(f"{zcta},{primary}," + " ".join(also))

    body = ("\n".join(lines) + "\n").encode()
    blob = gzip.compress(body, compresslevel=9, mtime=0)
    out = os.path.join(HERE, "zip_county.csv.gz")
    with open(out, "wb") as fh:
        fh.write(blob)
    print(f"wrote {len(lines) - 1:,} ZIPs to {out} "
          f"({len(body) / 1024:.0f} KB raw -> {len(blob) / 1024:.0f} KB gzipped); "
          f"{split:,} span more than one county")


def soc_wage_units():
    """Map each SOC code to 'H' (hourly rate) or 'A' (annual salary).

    OFLC publishes some occupations only as annual salaries -- every
    Postsecondary Teachers code, the pilots, a handful of physician codes --
    and the numbers alone give no clue which, so the dashboard has to be told.

    ALC_Export's Label column marks the clear cases ('Annual Wage'), but it is
    not sufficient on its own: 'High Wage' flags a wage above the OES cap and
    sits on both hourly and annual rows (4,606 hourly, 31 annual in 2026-27).
    Magnitude settles it. No hourly figure in the file reaches $500 and no
    annual one falls below $15,000, so the two ranges cannot be confused; the
    assertion below fails the build if a future year narrows that gap. The unit
    is constant across every row of a SOC code, so one letter per code is
    enough and the per-occupation data files stay untouched.
    """
    alc = pd.read_csv(os.path.join(SRC, "ALC_Export.csv"),
                      dtype=str, keep_default_na=False)
    wage_cols = ["Level1", "Level2", "Level3", "Level4", "Average"]
    nums = alc[wage_cols].apply(pd.to_numeric, errors="coerce")

    flat = nums.stack()
    straddling = flat[(flat >= 500) & (flat < 15000)]
    if not straddling.empty:
        raise SystemExit(
            "hourly and annual wage ranges now overlap "
            f"({len(straddling)} values in $500-$15,000); the unit rule below "
            "is no longer safe -- check ALC_Export.csv before rebuilding"
        )

    annual_row = (alc["Label"] == "Annual Wage") | (nums.max(axis=1) >= 1000)
    # Label and magnitude must agree wherever Label is definitive.
    disagree = ((alc["Label"] == "Annual Wage") & (nums.max(axis=1) < 1000)).sum()
    if disagree:
        raise SystemExit(f"{disagree} rows labelled 'Annual Wage' hold hourly-sized values")

    # A row whose wage columns are all blank says nothing either way; ignore it
    # when checking that a SOC code reports one unit throughout.
    has_wage = nums.notna().any(axis=1)
    spread = annual_row[has_wage].groupby(alc.loc[has_wage, "SocCode"]).nunique()
    mixed = spread[spread > 1].index.tolist()
    if mixed:
        raise SystemExit(f"SOC codes reporting both units: {mixed}")

    units = annual_row.groupby(alc["SocCode"]).max().map({True: "A", False: "H"})
    print(f"wage units: {(units == 'H').sum()} hourly, {(units == 'A').sum()} annual "
          f"SOC codes")
    return units


def build_profession_index():
    pro = pd.read_csv(os.path.join(SRC, "xwalk_plus.csv"), dtype=str, keep_default_na=False)
    pro.columns = ["SOCCODE", "SOCTITLE", "TruncOnetCode", "OnetCode", "Occupation"]
    pro["filename"] = pro["SOCCODE"] + ".csv.gz"
    pro["url"] = URL_BASE + pro["filename"]
    # 'H' or 'A'. The page prints "/hr" or "/yr" from this instead of guessing.
    pro["Unit"] = pro["SOCCODE"].map(soc_wage_units()).fillna("H")

    pro.drop(columns=["url"]).to_csv(
        os.path.join(HERE, "Prof_wO_links.csv"), index=False)
    pro.to_csv(os.path.join(HERE, "Prof_w_links.csv"), index=False)

    # What 2027Live/index.html fetches. SOCTITLE carries the O*NET title and
    # Category the broader SOC title; pandas quotes any field holding a comma.
    rearranged = pd.DataFrame({
        "SOCCODE": pro["SOCCODE"],
        "SOCTITLE": pro["Occupation"],
        "TruncOnetCode": pro["TruncOnetCode"],
        "OnetCode": pro["OnetCode"],
        "Occupation": pro["Occupation"],
        "filename": pro["filename"],
        "url": pro["url"],
        "Category": pro["SOCTITLE"],
        "Unit": pro["Unit"],
    })
    rearranged.to_csv(
        os.path.join(HERE, "Prof_w_linksRearrangeColumn.csv"), index=False)
    print(f"wrote {len(rearranged)} profession index rows")


if __name__ == "__main__":
    build_divided_csv()
    build_profession_index()
    build_zip_county()
