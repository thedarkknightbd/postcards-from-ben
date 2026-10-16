/* Homepage and Trips cover images follow the existing R2 Media Manager hero folders. */
(async function () {
 const cards = [...document.querySelectorAll('.redesign-trip-card[href^="/trips/"]')];
 await Promise.all(cards.map(async card => {
  const slug = card.getAttribute('href').split('/').filter(Boolean)[1];
  const thumb = card.querySelector('.redesign-trip-thumb');
  if (!slug || !thumb) return;
  // Kenya's homepage cover is intentionally unassigned until a verified Mara photo is selected.
  // Do not auto-pick an unrelated first image from the R2 hero folder.
  if (slug === 'under-the-mara-sky') return;
  try {
   const response = await fetch('/api/r2?prefix=' + encodeURIComponent('trips/' + slug + '/hero/'));
   if (!response.ok) return;
   const data = await response.json();
   const first = Array.isArray(data.objects) ? data.objects.find(o => o && o.url && /\.(jpe?g|png|webp|avif|heic)(\?|$)/i.test(o.url)) : null;
   if (!first) return;
   const img = new Image();
   img.onload = () => { thumb.style.backgroundImage = 'url(' + JSON.stringify(first.url) + ')'; };
   img.src = first.url;
  } catch (error) { console.warn('Adventure cover unavailable for ' + slug, error); }
 }));
})();
