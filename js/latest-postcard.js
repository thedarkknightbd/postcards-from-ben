/* Latest and previous published journal entries for the homepage. */
(async function loadHomePostcards() {
  const section = document.getElementById('latest-postcard-section');
  if (!section) return;
  try {
    const response = await fetch('/trips/the-long-way-around/trip.json', {cache:'no-store'});
    if (!response.ok) throw new Error('Trip index unavailable');
    const trip = await response.json();
    const entries = await Promise.all((trip.days || []).map(async ref => {
      try {
        const url = new URL(ref.file, response.url);
        const res = await fetch(url.href, {cache:'no-store'});
        if (!res.ok) return null;
        const day = await res.json();
        const journal = typeof day.journal === 'string' ? day.journal.trim() : '';
        const story = typeof day.intro === 'string' ? day.intro.trim() : '';
        // CMS saves actual stories in intro; short itinerary summaries are not published posts.
        const publishedText = journal || (story.length >= 650 ? story : '');
        if (!publishedText && Number(day.dayNumber) !== 8) return null;
        const number = Number(day.dayNumber);
        if (!Number.isInteger(number) || number < 1 || number > 24) return null;
        return {number, title: day.title || 'Day ' + number, date: day.date || '',
          excerpt: (publishedText || 'Today was a day I had been looking forward to for quite some time: finally seeing the Dolomites.').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,177),
          href:'/trips/the-long-way-around/days/day-' + String(number).padStart(2,'0') + '.html'};
      } catch (err) { console.warn('Skipping unreadable postcard', ref.file, err); return null; }
    }));
    const published = entries.filter(Boolean).sort((a,b)=>b.number-a.number);
    if (!published.length) return;
    const latest = published[0];
    const photoLink = document.getElementById('latest-postcard-photo-link');
    const photo = document.getElementById('latest-postcard-photo');
    // The verified Seceda hero is featured for Day 8. Other days have no image until mapped.
    if (photoLink && photo) {
      photoLink.hidden = latest.number !== 8;
      if (latest.number === 8) photoLink.href = latest.href;
      document.querySelector('.latest-postcard-card').classList.toggle('without-photo', latest.number !== 8);
    }
    document.getElementById('latest-postcard-meta').textContent = 'Day ' + latest.number + ' · ' + latest.date;
    document.getElementById('latest-postcard-title').textContent = latest.title;
    document.getElementById('latest-postcard-excerpt').textContent = latest.excerpt + (latest.excerpt.length === 177 ? '…' : '');
    document.getElementById('latest-postcard-link').href = latest.href;
    const previous = published.slice(1);
    const container = document.getElementById('previous-postcards');
    const grid = document.getElementById('previous-postcards-grid');
    if (container && grid && previous.length) {
      previous.forEach(post => {
        const article = document.createElement('article');
        article.className = 'previous-postcard-card';
        const meta = document.createElement('p');
        meta.className = 'latest-postcard-meta';
        meta.textContent = 'Day ' + post.number + ' · ' + post.date;
        const title = document.createElement('h4');
        title.textContent = post.title;
        const link = document.createElement('a');
        link.href = post.href;
        link.textContent = 'Read Postcard →';
        article.append(meta,title,link);
        grid.appendChild(article);
      });
      container.hidden = false;
    }
    section.hidden = false;
  } catch(err) { console.error('Unable to load homepage postcards:', err); }
})();
