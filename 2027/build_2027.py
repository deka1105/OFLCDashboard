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


def build_profession_index():
    pro = pd.read_csv(os.path.join(SRC, "xwalk_plus.csv"), dtype=str, keep_default_na=False)
    pro.columns = ["SOCCODE", "SOCTITLE", "TruncOnetCode", "OnetCode", "Occupation"]
    pro["filename"] = pro["SOCCODE"] + ".csv.gz"
    pro["url"] = URL_BASE + pro["filename"]

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
    })
    rearranged.to_csv(
        os.path.join(HERE, "Prof_w_linksRearrangeColumn.csv"), index=False)
    print(f"wrote {len(rearranged)} profession index rows")


if __name__ == "__main__":
    build_divided_csv()
    build_profession_index()
