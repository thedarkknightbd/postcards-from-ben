/* Homepage hero state is editable in the CMS; only configured public destinations are linked. */
(async function loadHomeAdventure() {
  try {
    const response = await fetch('/data/home-adventure.json', {cache: 'no-store'});
    if (!response.ok) return;
    const data = await response.json();
    const status = data.status;
    const current = data.currentAdventure || {};
    const upcoming = data.upcomingAdventure || {};
    const variants = {
      traveling: {
        kicker: 'CURRENT ADVENTURE',
        title: 'Come Along<br><em>for the Journey.</em>',
        description: current.description || "I'm on the road! Follow the latest places, photographs, and stories.",
        button: 'Follow My Current Adventure →',
        url: current.url
      },
      upcoming: {
        kicker: 'THE NEXT ADVENTURE',
        title: 'The Next<br><em>Adventure Awaits.</em>',
        description: upcoming.description || 'A new journey is taking shape. More details are coming soon.',
        button: 'See What’s Coming Next →',
        url: upcoming.url
      },
      between: {
        kicker: 'BETWEEN ADVENTURES',
        title: 'Where to<br><em>Next?</em>',
        description: 'The Long Way Around may be over, but there is still so much of the world to discover. New places are calling, and the next adventure is already on my mind.',
        button: 'Explore What’s Next →',
        url: '/where-to-next/'
      }
    };
    // Never announce an unconfigured trip or navigate to a nonexistent placeholder.
    const chosen = (status === 'traveling' && current.title && current.url) ? variants.traveling :
      (status === 'upcoming' && upcoming.title && upcoming.url) ? variants.upcoming : variants.between;
    const kicker = document.getElementById('home-adventure-kicker');
    const title = document.getElementById('home-adventure-title');
    const description = document.getElementById('home-adventure-description');
    const action = document.getElementById('home-adventure-action');
    if (!kicker || !title || !description || !action) return;
    kicker.textContent = chosen.kicker;
    title.innerHTML = chosen.title;
    description.textContent = chosen.description;
    action.textContent = chosen.button;
    // Internal paths only; avoid sending visitors to arbitrary destinations.
    if (typeof chosen.url === 'string' && chosen.url.startsWith('/') && !chosen.url.startsWith('//')) action.href = chosen.url;
  } catch(err) { console.warn('Using between-adventures homepage default', err); }
})();