"""Score a colour ramp on the three things this dashboard actually needs.

A scene occupies only ~30% of the ramp, so it is not enough for the ends to
differ -- every 30% window has to differ from itself. That is a measurable
property, so measure it rather than eyeballing swatches.

  1. L* rises monotonically      -> hotter always reads as brighter
  2. min dE over any 5% step     -> no dead zone where a whole city goes flat
  3. distance from the grey axis -> nothing reads as white or missing data
"""
import numpy as np

def srgb_to_lab(rgb):
    c = np.asarray(rgb, float) / 255.0
    c = np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
    m = np.array([[.4124,.3576,.1805],[.2126,.7152,.0722],[.0193,.1192,.9505]])
    xyz = c @ m.T / np.array([.95047, 1.0, 1.08883])
    f = np.where(xyz > .008856, np.cbrt(xyz), 7.787 * xyz + 16/116)
    return np.stack([116*f[...,1]-16, 500*(f[...,0]-f[...,1]), 200*(f[...,1]-f[...,2])], -1)

def sample(stops, n=101):
    ts = np.linspace(0, 1, n)
    ps = np.array([s[0] for s in stops]); cs = np.array([s[1] for s in stops], float)
    return np.stack([np.interp(ts, ps, cs[:, i]) for i in range(3)], -1)

def score(name, stops):
    rgbv = sample(stops); lab = srgb_to_lab(rgbv)
    L, C = lab[:,0], np.hypot(lab[:,1], lab[:,2])
    dL = np.diff(L)
    step = 5
    dE = [np.linalg.norm(lab[i+step]-lab[i]) for i in range(0, 101-step)]
    print(f"\n{name}")
    print(f"  L* {L.min():5.1f} -> {L.max():5.1f}   monotonic: "
          f"{'yes' if (dL >= -0.6).all() else f'NO ({(dL < -0.6).sum()} reversals, worst {dL.min():.1f})'}")
    print(f"  dE per 5% window:  min {min(dE):5.1f}  median {np.median(dE):5.1f}   "
          f"windows under 10: {sum(1 for d in dE if d < 10)}")
    lo = int(np.argmin(dE)) 
    print(f"  flattest at t={lo/100:.2f}-{(lo+step)/100:.2f}  "
          f"rgb {tuple(rgbv[lo].round().astype(int))} -> {tuple(rgbv[lo+step].round().astype(int))}")
    pale = [(i/100, C[i], L[i]) for i in range(101) if C[i] < 22 and L[i] > 60]
    print(f"  near-grey/pale samples (C<22 and L>60): {len(pale)}"
          + (f"  first at t={pale[0][0]:.2f}" if pale else ""))
    return min(dE), (dL >= -0.6).all(), len(pale)

CURRENT = [(0,[27,42,107]),(.22,[47,107,176]),(.44,[99,184,212]),
           (.62,[166,178,168]),(.78,[201,168,106]),(1,[232,145,47])]

CAND = [(0,[19,31,77]),(.16,[29,74,142]),(.32,[38,131,176]),(.48,[88,174,194]),
        (.62,[139,178,150]),(.76,[190,166,88]),(.88,[224,140,52]),(1,[247,196,46])]

CAND2 = [(0,[16,26,71]),(.14,[26,68,138]),(.28,[33,118,172]),(.42,[64,163,190]),
         (.56,[110,180,164]),(.70,[168,180,110]),(.84,[219,150,55]),(1,[250,201,52])]

for n, s in (("current  indigo/blue/ice/sand/gold", CURRENT),
             ("cand A   8 stops, spread cool half", CAND),
             ("cand B   8 stops, teal turn", CAND2)):
    score(n, s)
