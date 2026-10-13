const toc = document.querySelector('.toc');
if (toc) {
  toc.addEventListener('click', event => {
    if (event.target.closest('a')) toc.open = false;
  });
  document.addEventListener('click', event => {
    if (!toc.contains(event.target)) toc.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toc.open) {
      toc.open = false;
      toc.querySelector('summary').focus();
    }
  });
  const links = [...toc.querySelectorAll('a')];
  const headings = links.map(link => document.getElementById(decodeURIComponent(link.hash.slice(1))));
  let pending = false;
  function updateCurrent() {
    let current = 0;
    headings.forEach((heading, index) => {
      if (heading.getBoundingClientRect().top <= 120) current = index;
    });
    links.forEach((link, index) => {
      if (index === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    pending = false;
  }
  addEventListener('scroll', () => {
    if (!pending) { pending = true; requestAnimationFrame(updateCurrent); }
  }, { passive: true });
  updateCurrent();
}
