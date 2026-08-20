"""Drop whole frames that are cloud rather than land, and recompute every stat.

WHY A SECOND PASS AFTER repair_lst.py
repair_lst masks individual pixels outside a physical -70/+80 C window. That
catches raw fill values but not thin cloud, whose brightness temperature is a
perfectly "physical" -30 C. What survived was not scattered noise but ENTIRE
FRAMES: Abuja 2025-07-22 had a median of -23.6 C, Rome 2025-11-25 -57.6 C,
Bulawayo 2025-01-13 -61.5 C. Those are cloud tops photographed from orbit, and
they dragged city means down and stretched the p2-p98 colour range so far that
ordinary scenes occupied a sliver of it. Abuja ended up with 12% of its pixels
below 0 C, in Nigeria.

WHY THE THRESHOLD IS RELATIVE
An absolute cutoff cannot work. Abuja's bogus -23.6 C overlaps Ulaanbaatar's
entirely genuine -23.9 C in February. Cloud is cold relative to THE CITY'S OWN
seasonal envelope, so the threshold is built from the city's own distribution of
frame medians: reject a frame sitting more than MARGIN below the 25th percentile
of them. The 25th percentile rather than the median so that a city with several
bad frames is not dragged into keeping them.

Verified on all 135 cities: 12 frames across 11 cities, every one obviously
cloud (Dublin in August at -46 C, Chennai in December at 4.7 C), and no
legitimate winter frame flagged anywhere, including Yakutsk, Harbin, Tromso,
Murmansk and Ulaanbaatar.
"""
import base64
import json
import os

import numpy as np

D = os.environ.get("LST_OUT") or os.path.join(
    os.path.dirname(__file__), "..", "..", "public", "assets", "data", "lst")
MARGIN = 25.0


def main():
    idx_path = os.path.join(D, "index.json")
    idx = json.load(open(idx_path, encoding="utf-8"))
    rebuilt, dropped = [], 0

    for city in idx["cities"]:
        p = os.path.join(D, f"{city['slug']}.json")
        d = json.load(open(p, encoding="utf-8"))
        nod = d["nodata"]

        arrs, meds = [], []
        for f in d["frames"]:
            a = np.frombuffer(base64.b64decode(f), dtype="<i2").astype("f4")
            v = a[a != nod] / 10.0
            arrs.append(a)
            meds.append(float(np.median(v)) if v.size else -999.0)
        thr = float(np.percentile(meds, 25)) - MARGIN

        keep = [i for i, m in enumerate(meds) if m >= thr]
        if len(keep) != len(meds):
            for i in range(len(meds)):
                if i not in keep:
                    print(f"  {city['name']:16s} drop {d['dates'][i]}  median {meds[i]:7.1f} C")
            dropped += len(meds) - len(keep)

        if not keep:
            print(f"  {city['name']:16s} DROPPED ENTIRELY")
            continue

        d["dates"] = [d["dates"][i] for i in keep]
        d["frames"] = [d["frames"][i] for i in keep]
        stats = []
        for i in keep:
            v = arrs[i][arrs[i] != nod] / 10.0
            stats.append([round(float(v.mean()), 2), round(float(v.min()), 2),
                          round(float(v.max()), 2), int(v.size)])
        d["stats"] = stats

        means = [s[0] for s in stats]
        d["summary"] = {**city, "dates": len(keep),
                        "mean": round(float(np.mean(means)), 2),
                        "min": round(min(s[1] for s in stats), 2),
                        "max": round(max(s[2] for s in stats), 2),
                        "std": round(float(np.std(means)), 2)}
        json.dump(d, open(p, "w", encoding="utf-8"), separators=(",", ":"))
        rebuilt.append(d["summary"])

    rebuilt.sort(key=lambda c: -c["lat"])
    idx["cities"] = rebuilt
    json.dump(idx, open(idx_path, "w", encoding="utf-8"), separators=(",", ":"))
    print(f"\n{dropped} cloud frames dropped, {len(rebuilt)} cities kept")

    for h, label in (("N", "NORTH"), ("S", "SOUTH")):
        g = [c for c in rebuilt if c["hemisphere"] == h]
        lat = np.array([abs(c["lat"]) for c in g])
        t = np.array([c["mean"] for c in g])
        r = float(np.corrcoef(lat, t)[0, 1])
        s, i = [float(x) for x in np.polyfit(lat, t, 1)]
        print(f"{label:6s} {len(g):2d} cities  T = {s:+.3f}|lat| + {i:.1f}   "
              f"r = {r:+.4f}  R2 = {r*r:.3f}")


if __name__ == "__main__":
    main()
