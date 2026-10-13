const magazine = document.querySelector('.magazine');
if (magazine) {
 const columns = [...magazine.querySelectorAll('.story-column')];
 const previous = document.querySelector('[data-previous]');
 const next = document.querySelector('[data-next]');
 const position = document.querySelector('[data-position]');
 function update() {
  if (!columns.length) {position.textContent='0 / 0'; previous.disabled=true; next.disabled=true; return;}
  const index = Math.min(columns.length - 1, Math.round(magazine.scrollLeft / columns[0].offsetWidth));
  position.textContent = `${index + 1} / ${columns.length}`;
  previous.disabled = magazine.scrollLeft < 2;
  next.disabled = magazine.scrollLeft >= magazine.scrollWidth - magazine.clientWidth - 2;
 }
 function move(direction) { magazine.scrollTo({left:magazine.scrollLeft+columns[0].offsetWidth*direction,behavior:'instant'}); }
 previous.addEventListener('click', () => move(-1));
 next.addEventListener('click', () => move(1));
 magazine.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);}
 });
 magazine.addEventListener('scroll', update, {passive:true});
 window.addEventListener('resize', update); update();
}
