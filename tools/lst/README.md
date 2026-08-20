# Landsat surface temperature pipeline

Regenerates `public/assets/data/lst/` for `lst-twin.html`. Kept in the repo
rather than the scratchpad because without it the 57 MB of city data cannot be
rebuilt, only re-downloaded by hand.

```bash
pip install pystac-client planetary-computer rasterio numpy
python tools/lst/extract_lst.py     # ~50-60 s per uncached city
python tools/lst/repair_lst.py      # mask fill values, recompute every stat
```

`extract_lst.py` caches: cities already written are skipped, so an interrupted
run resumes. Source is the Microsoft Planetary Computer STAC, which needs **no
credentials**.

## The two traps, both of which ship looking merely surprising

**ST_B10's valid DN range starts at 293, not 1.** Sub-293 fill scales to about
-122 C. One frame gave Kinshasa a mean of 12.0 C and flattened the whole
Southern Hemisphere regression to R2 0.076. Fourteen more cities needed the
same repair when the set expanded -- worst was Manila at 7.8 -> 32.6 C. Humid
tropical cities suffer most, being the most often part-cloudy. This is what
`repair_lst.py` exists for, and it runs on the already-downloaded files, so it
costs seconds rather than an hour.

**A zero-cloud scene is not a complete scene.** One scene reporting 0% cloud
covered 6% of the AOI, yielding 13% valid pixels. `COVER_MIN = 0.98`.

## ramp_check.py

Scores a colour ramp on the three properties the dashboard needs: L* rising
monotonically so hotter always reads brighter, minimum dE across a 5% step so no
window goes flat, and distance from the grey axis so nothing reads as missing
data. Three ramps were rejected by eye before this existed; the third had 22
near-grey samples starting at t=0.50, which is exactly where most cells sit.

The endpoints are rarely the binding constraint. A single scene occupies only
about a third of the scale, so **every third of the scale has to differ from
itself** -- see `robustRange` in `src/lst-twin.js` for the other half of that
problem.
