"""Build the 2027 (wage year 2026-27) dashboard data from the raw OFLC download.

Reproduces the pipeline behind 2026/DividedCSV and 2026/Prof_w_links*.csv
(originally 2026/NoteBooks/OFLC_Mar06_2026.ipynb). Verified byte-for-byte
against the 2026 output on a 40-SOC sample.

Pipeline:
  ALC_Export  x  Geography  on Area            (inner)
              x  xwalk_plus on SocCode=OES_SOCCODE  (inner)
  drop Label, stable-sort by Area, split by OES_SOCCODE -> DividedCSV/<soc>.csv

Commas in the crosswalk title columns become semicolons, because the dashboard
parses the profession index with a plain row.split(',') and renders ';' back
as ',' at display time.

Usage:  python3 build_2027.py
"""

import os

import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

SRC = os.path.join(ROOT, "OFLC_Wages_2026-27")
DIVIDED_DIR = os.path.join(HERE, "DividedCSV")
URL_BASE = (
    "https://media.githubusercontent.com/media/deka1105/OFLCDashboard"
    "/refs/heads/main/2027/DividedCSV/"
)

SEMICOLON_COLS = ["OES_SOCTITLE", "ONetTitle"]


def semicolon(series):
    """Commas break the dashboard's naive index parser; it maps ';' back to ','."""
    return series.astype(str).str.replace(",", ";", regex=False)


def build_divided_csv():
    alc = pd.read_csv(os.path.join(SRC, "ALC_Export.csv"))
    geo = pd.read_csv(os.path.join(SRC, "Geography.csv"))
    pro = pd.read_csv(os.path.join(SRC, "xwalk_plus.csv"))

    for col in SEMICOLON_COLS:
        pro[col] = semicolon(pro[col])

    merged = (
        alc.merge(geo, on="Area", how="inner")
        .merge(pro, left_on="SocCode", right_on="OES_SOCCODE", how="inner")
        .drop(columns=["Label"])
        .sort_values("Area", kind="mergesort")
    )
    print(f"merged rows: {len(merged):,}")

    os.makedirs(DIVIDED_DIR, exist_ok=True)
    for soc, group in merged.groupby("OES_SOCCODE"):
        group.to_csv(os.path.join(DIVIDED_DIR, f"{soc}.csv"), index=False)
    print(f"wrote {merged['OES_SOCCODE'].nunique()} files to {DIVIDED_DIR}")


def build_profession_index():
    pro = pd.read_csv(os.path.join(SRC, "xwalk_plus.csv"), dtype=str, keep_default_na=False)
    pro.columns = ["SOCCODE", "SOCTITLE", "TruncOnetCode", "OnetCode", "Occupation"]
    pro["filename"] = pro["SOCCODE"] + ".csv"
    pro["url"] = URL_BASE + pro["filename"]

    pro.drop(columns=["url"]).to_csv(
        os.path.join(HERE, "Prof_wO_links.csv"), index=False)
    pro.to_csv(os.path.join(HERE, "Prof_w_links.csv"), index=False)

    semi = pro.copy()
    semi["Occupation"] = semicolon(semi["Occupation"])
    semi.to_csv(os.path.join(HERE, "Prof_w_linksSemicolon.csv"), index=False)

    # What 2027Live/index.html actually fetches. SOCTITLE carries the O*NET
    # title and Category carries the broader SOC title.
    rearranged = pd.DataFrame({
        "SOCCODE": pro["SOCCODE"],
        "SOCTITLE": semicolon(pro["Occupation"]),
        "TruncOnetCode": pro["TruncOnetCode"],
        "OnetCode": pro["OnetCode"],
        "Occupation": semicolon(pro["Occupation"]),
        "filename": pro["filename"],
        "url": pro["url"],
        "Category": semicolon(pro["SOCTITLE"]),
    })
    rearranged.to_csv(
        os.path.join(HERE, "Prof_w_linksRearrangeColumn.csv"), index=False)
    print(f"wrote {len(rearranged)} profession index rows")


if __name__ == "__main__":
    build_divided_csv()
    build_profession_index()
