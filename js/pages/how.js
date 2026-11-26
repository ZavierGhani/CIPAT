// "Your journey" section: the logo reacts to the step the visitor touches.
(function () {
  var how = document.querySelector('#how .how');
  if (!how) return;
  var mark = how.querySelector('.mark');
  var list = how.querySelector('.path');
  var items = how.querySelectorAll('.path li');

  function set(n) {
    mark.setAttribute('data-step', n);
    items.forEach(function (li, i) { li.classList.toggle('on', n === i + 1); });
  }
  items.forEach(function (li, i) {
    li.addEventListener('pointerenter', function () { set(i + 1); });
    li.addEventListener('click', function () { set(i + 1); });
  });
  // Only reset for a mouse. On touch screens the last tapped step stays active.
  list.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') set(0); });
  set(0);
})();