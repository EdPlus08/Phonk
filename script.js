const USER = "EdPlus08";
const REPO = "Phonk";

const API = `https://api.github.com/repos/${USER}/${REPO}/contents/audios`;

let allSongs = [];
const waveAnimations = new WeakMap(); // guardar animación por audio

// ---------- Utilidad: formatear tiempo ----------
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

// ---------- Cargar canciones desde GitHub ----------
async function loadSongs() {
    const container = document.getElementById("song-list");
    const countSpan = document.getElementById("song-count");
    container.innerHTML = "Cargando...";

    try {
        const res = await fetch(API);
        const files = await res.json();

        // Solo mp3 / wav
        allSongs = files.filter(file =>
            file.name.toLowerCase().endsWith(".mp3") ||
            file.name.toLowerCase().endsWith(".wav")
        );

        renderSongs(allSongs);

        if (countSpan) {
            countSpan.textContent = `${allSongs.length} tema${allSongs.length === 1 ? "" : "s"}`;
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = "Error al cargar canciones.";
    }
}

// ---------- Pintar lista ----------
function renderSongs(list) {
    const container = document.getElementById("song-list");
    container.innerHTML = "";

    if (!list || list.length === 0) {
        container.innerHTML = "No se encontraron canciones.";
        return;
    }

    list.forEach(file => {
        const card = document.createElement("div");
        card.className = "song-card";

        const name = file.name.replace(/\.[^/.]+$/, ""); // sin .mp3/.wav

        card.innerHTML = `
            <p class="song-title">${name}</p>

            <div class="custom-player">
                <button class="play-btn">▶</button>
                <span class="time-label">0:00 / 0:00</span>
                <div class="wave-container">
                    <canvas class="wave-canvas"></canvas>
                </div>
            </div>

            <audio src="${file.download_url}"></audio>

            <a href="${file.download_url}" download>
                <button>Descargar</button>
            </a>
        `;

        container.appendChild(card);
    });

    setupPlayers();
}

// ---------- Búsqueda ----------
function setupSearch() {
    const searchInput = document.getElementById("search");
    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        const term = searchInput.value.trim().toLowerCase();

        if (term === "") {
            renderSongs(allSongs);
        } else {
            const filtered = allSongs.filter(file =>
                file.name.toLowerCase().includes(term)
            );
            renderSongs(filtered);
        }
    });
}

// ---------- Player custom + ondas ----------
function setupPlayers() {
    const cards = document.querySelectorAll(".song-card");

    cards.forEach(card => {
        const audio = card.querySelector("audio");
        const playBtn = card.querySelector(".play-btn");
        const timeLabel = card.querySelector(".time-label");
        const canvas = card.querySelector(".wave-canvas");
        const waveContainer = card.querySelector(".wave-container");

        if (!audio || !playBtn || !timeLabel || !canvas || !waveContainer) return;

        // Asegurarnos que el canvas encaje en el contenedor
        const resizeCanvas = () => {
            canvas.width = waveContainer.clientWidth;
            canvas.height = waveContainer.clientHeight;
        };
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        // Actualizar duración cuando carga
        audio.addEventListener("loadedmetadata", () => {
            timeLabel.textContent = `0:00 / ${formatTime(audio.duration)}`;
        });

        // Actualizar tiempo actual (texto)
        audio.addEventListener("timeupdate", () => {
            timeLabel.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
        });

        // Clic en el botón play / pause
        playBtn.addEventListener("click", async () => {
            // Pausar otros audios
            document.querySelectorAll(".song-card audio").forEach(a => {
                if (a !== audio) {
                    a.pause();
                    stopWave(a);
                }
            });
            document.querySelectorAll(".play-btn").forEach(btn => {
                if (btn !== playBtn) btn.textContent = "▶";
            });

            if (audio.paused) {
                try {
                    await audio.play();
                    playBtn.textContent = "⏸";
                    startWave(audio, canvas);
                } catch (err) {
                    console.error(err);
                }
            } else {
                audio.pause();
                playBtn.textContent = "▶";
                stopWave(audio);
            }
        });

        // Clic en la onda para adelantar/retroceder
        waveContainer.addEventListener("click", (e) => {
            const rect = waveContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percent = clickX / rect.width;
            if (!isNaN(audio.duration)) {
                audio.currentTime = percent * audio.duration;
            }
        });

        // Cuando termine, paramos animación y reseteamos botón
        audio.addEventListener("ended", () => {
            playBtn.textContent = "▶";
            stopWave(audio);
        });
    });
}

// ---------- Onda "fake" RGB sincronizada con el tiempo ----------
function startWave(audio, canvas) {
    stopWave(audio); // limpiar si había una anterior

    function draw() {
        if (audio.paused || audio.ended) {
            stopWave(audio);
            return;
        }

        const ctx = canvas.getContext("2d");
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        const now = audio.currentTime || 0;
        const duration = audio.duration || 1;
        const progress = now / duration;

        // Color RGB suave basado en tiempo
        const hue = (now * 40) % 360;
        ctx.strokeStyle = `hsl(hue, 80%, 65%)`.replace("hue", hue.toString());
        ctx.lineWidth = 2;

        ctx.beginPath();

        const segments = 80;
        const sliceWidth = width / segments;
        let x = 0;

        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * Math.PI * 2;

            // base de onda + pequeño pulso
            const base = Math.sin(t * 2 + now * 3);
            const pulse = Math.sin(progress * Math.PI * 4 + i * 0.3);

            const amplitude = (base * 0.4 + pulse * 0.2) * (height * 0.35);
            const y = height / 2 + amplitude;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);

            x += sliceWidth;
        }

        ctx.stroke();

        const id = requestAnimationFrame(draw);
        waveAnimations.set(audio, id);
    }

    const id = requestAnimationFrame(draw);
    waveAnimations.set(audio, id);
}

function stopWave(audio) {
    const id = waveAnimations.get(audio);
    if (id) {
        cancelAnimationFrame(id);
        waveAnimations.delete(audio);
    }
}

// ---------- Init ----------
loadSongs();
setupSearch();











