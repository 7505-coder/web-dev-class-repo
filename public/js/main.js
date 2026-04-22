document.querySelectorAll(".alert").forEach((alert) => {
  setTimeout(() => {
    alert.style.transition = "opacity 250ms ease, transform 250ms ease";
    alert.style.opacity = "0";
    alert.style.transform = "translateY(-8px)";
  }, 4500);
});
