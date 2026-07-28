/**
 * Toggles the sliding overlay between sign-in and sign-up state. Both
 * forms and the overlay already exist in the DOM (see login.html /
 * register.html) — this just adds/removes one class, and CSS
 * transitions handle the actual slide.
 */

document.addEventListener('DOMContentLoaded', () => {

  const container = document.getElementById('auth-flip-container');
  if (!container) return;

  const showSignup = document.getElementById('show-signup');
  const showSignin = document.getElementById('show-signin');

  if (showSignup) {
    showSignup.addEventListener('click', () => {
      container.classList.add('right-active');
    });
  }

  if (showSignin) {
    showSignin.addEventListener('click', () => {
      container.classList.remove('right-active');
    });
  }

});