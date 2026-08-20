"""
Landsat surface temperature, 24 dates per city, straight from Planetary Computer.

WHY LANDSAT AND NOT THE FREE WEATHER API
Measured directly: Open-Meteo resolved 21 distinct cells across 40 km of Dammam.
Landsat resolves 892 x 805 pixels over the same window at 30 m. At 10 km a city
is one or two cells and urban structure is invisible; at 30 m the industrial
corridor separates from the parks. That difference is the whole reason the 3D
map is worth drawing.

WHY 96x96 AND NOT FULL RESOLUTION
Reading through the COG overviews: full window 3.4 s, 96 x 96 window 0.3 s, and
the statistics survive intact (LST 28.8-55.4 full against 29.0-54.0 downsampled,
means 45.8 and 45.9). Ten times faster for a difference that does not survive
being drawn as a hexagon. 9,216 cells per city per date is still fifteen times
what MODIS gave.

TWO FILTERS THAT MATTER
Scenes are rejected unless they cover at least 98% of the city window. A scene
can report 0% cloud and still be useless because the city sits on its edge: the
first attempt here pulled a 0%-cloud scene that covered 6% of the AOI and came
back 13% valid. Then QA_PIXEL masks cloud, dilated cloud and shadow per pixel,
so a partly cloudy scene still contributes its clear ground.

DATES ARE SPREAD, NOT SORTED
Picking the 24 least-cloudy scenes clusters them in the dry season. The year is
split into 24 bins and the clearest scene in each bin wins, so the animation
walks through the seasons instead of jumping around one of them.
"""
import base64
import json
import os
import sys
import time
from datetime import datetime

import numpy as np
import planetary_computer as pc
import rasterio
from pystac_client import Client
from rasterio.warp import transform_bounds
from rasterio.windows import from_bounds
from shapely.geometry import box, shape

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cities import ALL, slug                                    # noqa: E402

# Overridable so a trial extraction cannot overwrite the live payload.
OUT = os.environ.get("LST_OUT", "E:/Website/shibli-portfolio/public/assets/data/lst")
WINDOW = 0.12          # degrees, about 26 km across
GRID = 96
NDATES = 24
START, END = "2024-11-01", "2025-11-30"
NODATA = -32768
COVER_MIN = 0.98

cat = Client.open("https://planetarycomputer.microsoft.com/api/stac/v1",
                  modifier=pc.sign_inplace)


def pick_dates(items, aoi):
    """Clearest fully-covering scene in each of 24 time bins."""
    usable = []
    for it in items:
        try:
            if shape(it.geometry).intersection(aoi).area / aoi.area < COVER_MIN:
                continue
        except Exception:
            continue
        usable.append(it)
    if not usable:
        return []
    t0 = datetime.fromisoformat(START).timestamp()
    t1 = datetime.fromisoformat(END).timestamp()
    bins = {}
    for it in usable:
        ts = datetime.fromisoformat(it.properties["datetime"][:19]).timestamp()
        b = min(NDATES - 1, int((ts - t0) / (t1 - t0) * NDATES))
        cc = it.properties.get("eo:cloud_cover", 100)
        if b not in bins or cc < bins[b].properties.get("eo:cloud_cover", 100):
            bins[b] = it
    return [bins[k] for k in sorted(bins)]


def read_city(lat, lon, item):
    bbox = [lon - WINDOW, lat - WINDOW, lon + WINDOW, lat + WINDOW]
    out = {}
    for asset in ("lwir11", "qa_pixel"):
        with rasterio.open(item.assets[asset].href) as src:
            b = transform_bounds("EPSG:4326", src.crs, *bbox)
            w = from_bounds(*b, transform=src.transform)
            out[asset] = src.read(1, window=w, out_shape=(GRID, GRID),
                                  boundless=True, fill_value=0)
    st, qa = out["lwir11"], out["qa_pixel"]
    # Collection 2 Level 2 surface temperature scaling, Kelvin to Celsius.
    c = st.astype("float32") * 0.00341802 + 149.0 - 273.15
    # QA_PIXEL, Landsat Collection 2 Level 2. Bit 0 fill, 1 dilated cloud,
    # 2 cirrus, 3 cloud, 4 cloud shadow, 5 snow, 6 clear, 7 WATER.
    #
    # WATER (bit 7) is masked because this is a study of city SURFACE
    # temperature and open water is not the city. Sea and lake pixels are
    # thermally damped -- they barely follow the seasonal swing the land does --
    # so a coastal city averaged with its water reads closer to the sea than to
    # itself, and the whole latitude gradient is compressed toward the ocean.
    # Edinburgh (Firth of Forth), Dammam (the Gulf) and Reykjavik (the Atlantic)
    # were all pulling sea into their means before this line included bit 7.
    #
    # CIRRUS (bit 2) is masked for the reason clean_frames.py exists: thin
    # cloud has a perfectly "physical" brightness temperature, so it survives
    # any absolute threshold and had to be caught a whole frame at a time
    # afterwards. Dropping it per pixel is both finer and earlier.
    #
    # SNOW (bit 5) is deliberately NOT masked. Snow is the real surface of a
    # winter city, and removing it would warm every high-latitude mean.
    bad = (((qa >> 1) & 1) | ((qa >> 2) & 1) | ((qa >> 3) & 1)
           | ((qa >> 4) & 1) | ((qa >> 7) & 1)).astype(bool)
    c[(st == 0) | bad] = np.nan
    return c


def encode(a):
    """int16 tenths of a degree, base64. A third of the bytes of JSON numbers."""
    q = np.where(np.isfinite(a), np.round(a * 10), NODATA).astype("<i2")
    return base64.b64encode(q.tobytes()).decode("ascii")


def main():
    os.makedirs(OUT, exist_ok=True)
    only = sys.argv[1] if len(sys.argv) > 1 else None
    index = []

    for n, (name, country, lat, lon, hemi) in enumerate(ALL, 1):
        s = slug(name)
        if only and s != only:
            continue
        path = os.path.join(OUT, f"{s}.json")
        if os.path.exists(path) and not only:
            try:
                index.append(json.load(open(path, encoding="utf-8"))["summary"])
                print(f"  {n:2d}/{len(ALL)} {name:16s} cached")
                continue
            except Exception:
                pass

        t0 = time.time()
        bbox = [lon - WINDOW, lat - WINDOW, lon + WINDOW, lat + WINDOW]
        aoi = box(*bbox)
        try:
            items = list(cat.search(collections=["landsat-c2-l2"], bbox=bbox,
                                    datetime=f"{START}/{END}", limit=500).items())
        except Exception as e:
            print(f"  {n:2d}/{len(ALL)} {name:16s} SEARCH FAILED {e}")
            continue

        picked = pick_dates(items, aoi)
        frames, dates, stats = [], [], []
        for it in picked:
            try:
                c = read_city(lat, lon, it)
            except Exception:
                continue
            v = c[np.isfinite(c)]
            if v.size < GRID * GRID * 0.25:      # mostly cloud, not worth a frame
                continue
            frames.append(encode(c))
            dates.append(it.properties["datetime"][:10])
            stats.append([round(float(v.mean()), 2), round(float(v.min()), 2),
                          round(float(v.max()), 2), int(v.size)])

        if not frames:
            print(f"  {n:2d}/{len(ALL)} {name:16s} NO USABLE SCENES")
            continue

        means = [s[0] for s in stats]
        summary = {
            "slug": s, "name": name, "country": country, "lat": lat, "lon": lon,
            "hemisphere": hemi, "dates": len(dates),
            "mean": round(float(np.mean(means)), 2),
            "min": round(min(x[1] for x in stats), 2),
            "max": round(max(x[2] for x in stats), 2),
            "std": round(float(np.std(means)), 2),
        }
        json.dump({"summary": summary, "grid": GRID, "window": WINDOW,
                   "nodata": NODATA, "dates": dates, "stats": stats,
                   "frames": frames},
                  open(path, "w", encoding="utf-8"), separators=(",", ":"))
        index.append(summary)
        print(f"  {n:2d}/{len(ALL)} {name:16s} {len(dates):2d} dates  "
              f"mean {summary['mean']:6.2f}  {time.time()-t0:5.1f}s  "
              f"{os.path.getsize(path)/1e3:5.0f} KB")

    if not only:
        index.sort(key=lambda x: -x["lat"])
        json.dump({"cities": index, "grid": GRID, "window": WINDOW,
                   "source": "Landsat 8/9 Collection 2 Level 2, band ST_B10, 30 m",
                   "period": [START, END]},
                  open(os.path.join(OUT, "index.json"), "w", encoding="utf-8"),
                  separators=(",", ":"))
        print(f"\nindexed {len(index)} cities "
              f"({sum(1 for c in index if c['hemisphere']=='N')} N / "
              f"{sum(1 for c in index if c['hemisphere']=='S')} S)")


if __name__ == "__main__":
    main()
