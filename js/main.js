// "Press start" plays the gate transition, then goes to sign-up (which forwards logged-in users to majors).
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const go = () => { location.href = 'pages/signup.html'; };

function enter(e) {
  e.preventDefault();
  if (reduce) return go();
  document.body.classList.add('entering');
  setTimeout(go, 1200);
}
document.querySelectorAll('[data-start]').forEach((el) => el.addEventListener('click', enter));