document.addEventListener("DOMContentLoaded", () => {
  const themeBtn = document.getElementById("theme-toggle");
  const body = document.body;

  themeBtn.addEventListener("click", () => {
    body.classList.toggle("dark-theme");
    body.classList.toggle("light-theme");

    if (body.classList.contains("dark-theme")) {
      themeBtn.textContent = "☀️ Light Mode";
    } else {
      themeBtn.textContent = "🌙 Dark Mode";
    }
  });
});
