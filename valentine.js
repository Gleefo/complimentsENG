// =====================
// CONFIG
// =====================

const SUPABASE_URL = "https://qwynuplavchtpcbjtudz.supabase.co";
const SUPABASE_KEY = "sb_publishable_d_53Q37kQOmvN4Nzj0IptQ_BnP0bGKk";
const CARD_ID = "marlo_valentine_card";




// =====================
// ELEMENTS
// =====================

const canvas = document.getElementById("drawCanvas");
const ctx = canvas.getContext("2d");

const leftZone = document.querySelector(".left-zone");
const rightZone = document.getElementById("rightZone");
const toolsPanel = document.getElementById("toolsPanel");

let tool = "pencil";
let drawing = false;
let frozen = false;
let historyStack = [];

// =====================
// CANVAS SIZE
// =====================

function resizeCanvas(){
  canvas.width = leftZone.clientWidth;
  canvas.height = leftZone.clientHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();


// =====================
// TOOL BUTTONS
// =====================

document.getElementById("tool-pencil").onclick = () => tool = "pencil";
document.getElementById("tool-text").onclick   = () => tool = "text";
document.getElementById("tool-heart").onclick  = () => tool = "heart";


// =====================
// UNIVERSAL DRAW HELPERS
// =====================

function getMousePos(e) {
  return { x: e.offsetX, y: e.offsetY };
}

function getTouchPos(e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.changedTouches[0] || e.touches[0];
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
}

function startDrawing(x, y) {
  saveState();
  if (tool === "pencil") {
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
}

function drawLine(x, y) {
  if (!drawing || tool !== "pencil") return;

  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#ffffff";
  ctx.lineTo(x, y);
  ctx.stroke();
}

function placeElement(x, y) {
  saveState();
  if (tool === "text") {
    const t = prompt("text:");
    if (!t) return;

    ctx.fillStyle = "#fff";
    ctx.font = "18px sans-serif";
    ctx.fillText(t, x, y);
  }

  if (tool === "heart") {
    ctx.font = "22px serif";
    ctx.fillText("❤️", x, y);
  }
}


document.getElementById("tool-undo").onclick = () => {
  if (historyStack.length === 0 || frozen) return;

  const img = new Image();
  img.src = historyStack.pop();

  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
};


// =====================
// MOUSE EVENTS
// =====================

canvas.addEventListener("mousedown", e => {
  if (frozen) return;
  const { x, y } = getMousePos(e);
  startDrawing(x, y);
});

canvas.addEventListener("mousemove", e => {
  if (frozen) return;
  const { x, y } = getMousePos(e);
  drawLine(x, y);
});

canvas.addEventListener("mouseup", () => drawing = false);
canvas.addEventListener("mouseleave", () => drawing = false);

canvas.addEventListener("click", e => {
  if (frozen) return;
  if (tool === "pencil") return;

  const { x, y } = getMousePos(e);
  placeElement(x, y);
});


function saveState() {
  historyStack.push(canvas.toDataURL());
}


// =====================
// TOUCH EVENTS
// =====================

canvas.addEventListener("touchstart", e => {
  if (frozen) return;

  const { x, y } = getTouchPos(e);
  startDrawing(x, y);

  e.preventDefault();
}, { passive: false });

canvas.addEventListener("touchmove", e => {
  if (frozen) return;

  const { x, y } = getTouchPos(e);
  drawLine(x, y);

  e.preventDefault();
}, { passive: false });

canvas.addEventListener("touchend", e => {
  if (frozen) return;

  if (tool === "pencil") {
    drawing = false;
    return;
  }

  const { x, y } = getTouchPos(e);
  placeElement(x, y);
}, { passive: false });


// =====================
// SUPABASE
// =====================

async function saveToServer(imageBase64) {

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/valentine_cards`,
    {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        id: CARD_ID,
        image: imageBase64
      })
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
}

async function loadFromServer(){

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/valentine_cards?id=eq.${CARD_ID}&select=*`,
    {
      headers:{
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY
      }
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  const data = await res.json();
  if (!data.length) return null;

  return data[0];
}


// =====================
// SAVE BUTTON
// =====================

document.getElementById("saveForever").onclick = async () => {

  if (frozen) return;

  try {

    const imgData = canvas.toDataURL();
    await saveToServer(imgData);

    const sound = document.getElementById("valentineSound");
    if (sound) sound.play();

    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });

    const saved = await loadFromServer();
    if (!saved) return;

    showSaved({
      image: saved.image,
      date: new Date(saved.created_at).toLocaleDateString()
    });

  } catch(e) {
    alert("Save failed. Check console.");
  }
};


// =====================
// SHOW SAVED
// =====================

function showSaved(payload){

  frozen = true;

  rightZone.style.display = "flex";
  toolsPanel.style.display = "none";
  document.getElementById("stencil").style.display = "none";

  const img = new Image();

  img.crossOrigin = "anonymous";

  img.onload = () => {
    requestAnimationFrame(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    });
  };

  img.onerror = (e) => {
    console.error("Image failed to load:", e);
  };

  if (payload.image && payload.image.startsWith("data:image")) {
    img.src = payload.image;
  } else {
    console.warn("Invalid image data from Supabase:", payload.image);
  }

  document.getElementById("savedDate").textContent =
    "saved on " + payload.date;
}




// =====================
// AUTO LOAD
// =====================

(async function(){
  const saved = await loadFromServer();
  if (!saved) return;

  showSaved({
    image: saved.image,
    date: new Date(saved.created_at).toLocaleDateString()
  });
})();
