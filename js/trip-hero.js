(() => {
  const image = document.getElementById("trip-poster");
  if (!image) return;

  const prefix = "trips/the-long-way-around/hero/";

  function optimizedUrl(source) {
    return `/cdn-cgi/image/format=auto,width=1800,quality=84/${source}`;
  }

  fetch(`/api/r2?prefix=${encodeURIComponent(prefix)}`)
    .then(response => {
      if (!response.ok) throw new Error(`Hero media request failed: ${response.status}`);
      return response.json();
    })
    .then(data => {
      const first = Array.isArray(data.objects) ? data.objects[0] : null;
      if (!first || !first.url) return;

      image.onerror = () => {
        image.onerror = null;
        image.src = first.url;
      };

      image.src = optimizedUrl(first.url);
    })
    .catch(error => {
      console.warn("Trip hero media unavailable:", error);
    });
})();
