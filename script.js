const USER = "EdPlus08";
const REPO = "Phonk";

const API = `https://api.github.com/repos/${USER}/${REPO}/contents/audios`;

let allSongs = [];
let waveAnimations = new WeakMap(); // para guardar animación por audio

// Cargar canciones desde GitHub
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

// Pintar lista
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
            <div class="player-wrapper">
                <audio controls src="${file.download_url}"></audio>
                <canvas class="wave-overlay"></canvas>
            </div>
            <a href="${file.download_url}" download>
                <button>Descargar</button>
            </a>
        `;

        container.appendChild(card);
    });

    setupVisualWaves();
}

// Búsqueda en vivo
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

// Configurar ondas para cada audio
function setupVisualWaves() {
    const wrappers = document.querySelectorAll(".player-wrapper");

    wrappers.forEach(wrapper => {
        const audio = wrapper.querySelector("audio");
        const canvas = wrapper.querySelector(".wave-overlay");
        if (!audio || !canvas) return;

        // Ajustar canvas al tamaño del audio
        const resizeCanvas = () => {
            canvas.width = wrapper.clientWidth;
            canvas.height = wrapper.clientHeight;
        };
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        // limpiar animaciones previas si había
        stopWave(audio);

        // Eventos
        audio.addEventListener("play", () => {
            // parar otras ondas
            document.querySelectorAll(".player-wrapper audio").forEach(a => {
                if (a !== audio) stopWave(a);
            });
            startWave(audio, canvas);
        });

        audio.addEventListener("pause", () => {
            stopWave(audio);
        });

        audio.addEventListener("ended", () => {
            stopWave(audio);
        });
    });
}

// Iniciar animación de onda "fake" RGB sincronizada con el tiempo
function startWave(audio, canvas) {
    stopWave(audio); // por si acaso

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

        // Color RGB suave basado en el tiempo
        const hue = (now * 40) % 360;
        ctx.strokeStyle = `hsl(${hue}, 80%, 65%)`;
        ctx.lineWidth = 2;

        ctx.beginPath();

        const segments = 80;
        const sliceWidth = width / segments;
        let x = 0;

        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * Math.PI * 2;

            // base de onda
            let base = Math.sin(t * 2 + now * 3);

            // un poquito de pulso con el progreso
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

// Parar la animación de una onda
function stopWave(audio) {
    const id = waveAnimations.get(audio);
    if (id) {
        cancelAnimationFrame(id);
        waveAnimations.delete(audio);
    }
}

// Init
loadSongs();
setupSearch();










