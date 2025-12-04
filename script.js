const USER = "EdPlus08";
const REPO = "Phonk";

const API = `https://api.github.com/repos/${USER}/${REPO}/contents/audios`;

let allSongs = []; // aquí guardamos todas las canciones

async function loadSongs() {
    const container = document.getElementById("song-list");
    const countSpan = document.getElementById("song-count");
    container.innerHTML = "Cargando...";

    try {
        const res = await fetch(API);
        const files = await res.json();

        // Guardamos solo mp3 / wav
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

        const name = file.name.replace(/\.[^/.]+$/, ""); // quitamos .mp3/.wav

        card.innerHTML = `
    <p class="song-title">${name}</p>
    <audio controls src="${file.download_url}"></audio>

    <!-- Barra de progreso personalizada -->
    <div class="progress-container">
        <div class="progress-fill"></div>
    </div>

    <a href="${file.download_url}" download>
        <button>Descargar</button>
    </a>
`;


        container.appendChild(card);
    });
        // al final de renderSongs
    setupProgressBars();
}

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

loadSongs();
setupSearch();

function setupProgressBars() {
    const cards = document.querySelectorAll(".song-card");

    cards.forEach(card => {
        const audio = card.querySelector("audio");
        const fill = card.querySelector(".progress-fill");
        const bar = card.querySelector(".progress-container");

        if (!audio || !fill || !bar) return;

        // Actualizar barra mientras avanza la canción
        audio.addEventListener("timeupdate", () => {
            if (!audio.duration) return;
            const percent = (audio.currentTime / audio.duration) * 100;
            fill.style.width = `${percent}%`;
        });

        // Permitir hacer click en la barra para adelantar/retroceder
        bar.addEventListener("click", (e) => {
            const rect = bar.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percent = clickX / rect.width;
            if (!isNaN(audio.duration)) {
                audio.currentTime = percent * audio.duration;
            }
        });
    });
}




