// Show / Hide button for password fields.
document.querySelectorAll('.pw').forEach(function (box) {
  var input = box.querySelector('input');
  var btn = box.querySelector('.pw-btn');
  btn.addEventListener('click', function () {
    var show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.textContent = show ? 'Hide' : 'Show';
    btn.setAttribute('aria-pressed', show);
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
});