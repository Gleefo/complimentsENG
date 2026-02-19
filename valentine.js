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
// MOUSE SUPPORT
// =====================

canvas.addEventListener("mousedown", e => {
  if (frozen) return;

  if (tool === "pencil"){
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
  }
});

canvas.addEventListener("mousemove", e => {
  if (!drawing || frozen) return;

  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#ffffff";
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
});

canvas.addEventListener("mouseup", () => drawing = false);
canvas.addEventListener("mouseleave", () => drawing = false);

canvas.addEventListener("click", e => {
  if (frozen) return;

  if (tool === "text"){
    const t = prompt("text:");
    if (!t) return;

    ctx.fillStyle = "#fff";
    ctx.font = "18px sans-serif";
    ctx.fillText(t, e.offsetX, e.offsetY);
  }

  if (tool === "heart"){
    ctx.font = "22px serif";
    ctx.fillText("❤️", e.offsetX, e.offsetY);
  }
});


// =====================
// TOUCH SUPPORT
// =====================

canvas.addEventListener("touchstart", e => {
  if (frozen) return;

  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  if (tool === "pencil") {
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  e.preventDefault();
});

canvas.addEventListener("touchmove", e => {
  if (!drawing || frozen) return;

  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#ffffff";
  ctx.lineTo(x, y);
  ctx.stroke();

  e.preventDefault();
});

canvas.addEventListener("touchend", e => {
  if (frozen) return;

  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  if (tool === "pencil") {
    drawing = false;
    return;
  }

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
});


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

    // 🎵 звук
    const sound = document.getElementById("valentineSound");
    if (sound) sound.play();

    // 🎆 фейерверк
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
  img.onload = () => {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
  };
  img.src = payload.image;

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
