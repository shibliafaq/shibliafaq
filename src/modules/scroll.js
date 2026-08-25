import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * A phone's URL bar sliding away fires a resize, and a resize refreshes every
 * ScrollTrigger — recomputing the pin and its 9,400px spacer in the middle of
 * the gesture that caused it. In the Experience pin that lands as a jump, and
 * the walk's ramp table is rebuilt from a stage height that is about to change
 * back. The viewport did not really change; the chrome moved.
 */
ScrollTrigger.config({ ignoreMobileResize: true });

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let lenis = null;

/**
 * Lenis owns the scroll position and ScrollTrigger reads from it. They have to
 * be wired together explicitly or every pinned section lags a frame behind.
 */
/* PHONES SCROLL NATIVELY.

   Lenis runs its own rAF loop, writes a transform every frame and drives
   ScrollTrigger.update from it. On a desktop that buys smoothing worth
   having. On a phone the platform already scrolls smoothly, so the whole
   apparatus is duplicated work on the one device that cannot afford it —
   and it is work that lands on every frame of exactly the fast flick that
   was killing the tab.

   Deliberately NOT folded into `reducedMotion`. That flag is read by ten
   modules and means "this reader asked for less movement"; a phone has asked
   for nothing. Only the smoothing decision is shared. */
export const flatScroll = window.matchMedia('(max-width: 900px)').matches;

export function initScroll() {
  if (reducedMotion || flatScroll) {
    // No smoothing, but ScrollTrigger still drives reveals at their end state.
    ScrollTrigger.refresh();
    return null;
  }

  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    /* Touch has to go through Lenis too, or ScrollTrigger never hears about it.
       Measured on an emulated phone: with this off, `lenis.scroll` sat at 0
       while `window.scrollY` was 13,814. Lenis emits its `scroll` event from
       its own animation loop, and that loop only runs for input it owns — so
       with touch left to the browser, `lenis.on('scroll', ScrollTrigger.update)`
       never fired, every ScrollTrigger's progress stayed frozen at 0, and the
       Experience pin never engaged. The pin-spacer was still 9,985px tall, so
       the stage simply scrolled away and left ten thousand pixels of black
       section behind it. That is the "everything goes black" report, and the
       same cause froze the walk: progress 0 means distance 0 means he never
       takes a step. Emitting one `scroll` by hand snapped the pin back to
       top:0 and progress to its correct 0.222. */
    syncTouch: true,
    touchMultiplier: 1.6,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Anchor links have to go through Lenis, not native scrolling.
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -74, duration: 1.4 });
    });
  });

  return lenis;
}

export function stopScroll() { lenis?.stop(); }
export function startScroll() { lenis?.start(); }

export { gsap, ScrollTrigger, lenis };
