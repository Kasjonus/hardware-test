var whiteScreen = document.getElementById("whiteScreen");
var whiteTestButton = document.getElementById("whiteTestButton");

whiteTestButton.onclick = () => {
  whiteScreen.style.display = "block";
  document.documentElement.requestFullscreen();
};

whiteScreen.onclick = () => {
  document.exitFullscreen();
  whiteScreen.style.display = "none";
};

document.addEventListener("fullscreenchange", () => {
  !document.fullscreenElement && (whiteScreen.style.display = "none");
});