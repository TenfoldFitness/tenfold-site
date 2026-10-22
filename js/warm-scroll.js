/* Warm color drift: --warm goes from 0 (top of the page) to 1 (bottom) as you scroll.
   css/styles.css blends the backdrop colors with it. Respects reduced-motion via the stylesheet. */
(function () {
  var queued = false;
  function update() {
    queued = false;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    document.documentElement.style.setProperty('--warm', Math.min(1, Math.max(0, window.scrollY / max)).toFixed(3));
  }
  window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  window.addEventListener('load', update);
  update();
})();