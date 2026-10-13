(function () {
  var dialog = document.querySelector(".image-zoom-dialog");
  var fill = document.querySelector(".image-zoom-fill");
  var zoomImg = document.querySelector(".image-zoom-img");
  var closeBtn = document.querySelector(".image-zoom-close");
  var triggers = document.querySelectorAll(".hero-visual .hero-zoom-trigger");
  if (!dialog || !fill || !zoomImg || !closeBtn || !triggers.length) return;
  if (typeof dialog.showModal !== "function") return;

  var lastTrigger = null;

  function openZoom(trigger) {
    var img = trigger.querySelector("img");
    if (!img) return;
    lastTrigger = trigger;
    var src = img.currentSrc || img.src || img.getAttribute("src");
    zoomImg.src = src;
    zoomImg.alt = img.getAttribute("alt") || "";
    dialog.showModal();
    closeBtn.focus();
  }

  triggers.forEach(function (btn) {
    btn.addEventListener("click", function () {
      openZoom(btn);
    });
  });

  closeBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    dialog.close();
  });

  fill.addEventListener("click", function (e) {
    if (e.target === fill) dialog.close();
  });

  zoomImg.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  dialog.addEventListener("close", function () {
    zoomImg.removeAttribute("src");
    zoomImg.alt = "";
    if (lastTrigger) {
      lastTrigger.focus();
      lastTrigger = null;
    }
  });
})();
