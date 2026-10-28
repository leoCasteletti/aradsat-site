document.querySelectorAll("[data-ano]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

document.querySelectorAll("#menu .nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    const menu = bootstrap.Collapse.getInstance(document.getElementById("menu"));
    if (menu) menu.hide();
  });
});
