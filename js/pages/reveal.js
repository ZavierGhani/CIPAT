// Reveals the three "What is CIPAT" cards once, when they scroll into view.
(function () {
  var trio = document.querySelector('.trio');
  if (!trio || !('IntersectionObserver' in window)) return;
  trio.classList.add('armed');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { trio.classList.add('in'); io.disconnect(); }
    });
  }, { threshold: 0.1 });
  io.observe(trio);
})();