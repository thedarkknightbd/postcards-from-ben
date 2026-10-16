(() => {
  const form = document.getElementById("postcard-subscribe-form");
  if (!form) return;
  const status = document.getElementById("postcard-subscribe-status");
  const button = form.querySelector("button[type=submit]");
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    button.disabled = true;
    status.textContent = "Sending your confirmation email…";
    const data = new FormData(form);
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          email: String(data.get("email") || "").trim(),
          frequency: data.get("frequency"),
          website: data.get("website")
        })
      });
      const result = await response.json();
      status.textContent = result.message || "Please try again later.";
      if (response.ok) form.reset();
    } catch {
      status.textContent = "Unable to subscribe right now. Please try again later.";
    } finally {
      button.disabled = false;
    }
  });
})();
