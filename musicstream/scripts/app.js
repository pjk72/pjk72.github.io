// Variabili globali per Preferiti e Audio
let favorites = JSON.parse(localStorage.getItem('music_favs') || '[]');
window.currentAudio = null;
window.currentPlayBtn = null;

window.playPreview = function (btn, url) {
    if (window.currentAudio) {
        window.currentAudio.pause();
        if (window.currentPlayBtn) {
            window.currentPlayBtn.innerHTML = '▶ Ascolta';
        }
        if (window.currentAudio.src === url) {
            window.currentAudio = null;
            window.currentPlayBtn = null;
            return;
        }
    }
    window.currentAudio = new Audio(url);
    window.currentPlayBtn = btn;
    btn.innerHTML = '⏸ Pausa';
    window.currentAudio.play();
    window.currentAudio.onended = function () {
        btn.innerHTML = '▶ Ascolta';
        window.currentAudio = null;
        window.currentPlayBtn = null;
    };
};

window.toggleFavorite = function (id, title, subtitle, audioUrl, type, imgUrl) {
    const index = favorites.findIndex(f => f.id === id);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push({ id, title, subtitle, audioUrl: audioUrl || '', type: type || 'song', imgUrl: imgUrl || '' });
    }
    localStorage.setItem('music_favs', JSON.stringify(favorites));

    // Aggiorna le icone nella pagina senza ricaricare le API
    document.querySelectorAll('.fav-btn').forEach(btn => {
        if (btn.id === 'fav-' + id) btn.classList.toggle('active');
    });

    // Re-render dell'intera sezione preferiti isolata
    renderFavorites();
};

window.isFavorite = function (id) {
    return favorites.some(f => f.id === id);
};

window.renderFavorites = function () {
    const favSec = document.getElementById('favorites-section');
    const songsCard = document.getElementById('favorites-songs-card');
    const albumsCard = document.getElementById('favorites-albums-card');
    const songsContainer = document.getElementById('favorites-songs-container');
    const albumsContainer = document.getElementById('favorites-albums-container');

    if (!favSec) return;

    if (favorites.length === 0) {
        favSec.style.display = 'none';
        return;
    }

    favSec.style.display = 'block';

    const songs = favorites.filter(fav => fav.type !== 'album');
    const albums = favorites.filter(fav => fav.type === 'album');

    if (songs.length > 0) {
        songsCard.style.display = 'block';
        songsContainer.innerHTML = songs.map(fav => {
            const btnBg = fav.imgUrl ? 'background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.3); color:#fff; backdrop-filter:blur(4px);' : 'background:var(--accent); color:#fff; border:none;';
            const audioPlayer = fav.audioUrl ? `<button onclick="playPreview(this, '${fav.audioUrl}')" style="${btnBg} padding:6px 14px; border-radius:20px; cursor:pointer; font-size:0.75rem; font-weight:600; margin-top:auto; transition:0.2s; width:max-content; align-self:flex-start;">▶ Ascolta</button>` : '';
            const bgStyle = fav.imgUrl ? `background: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('${fav.imgUrl}') no-repeat center center / cover; color: #f8fafc; padding: 20px;` : `background: var(--card-hover); padding: 20px;`;
            const titleColor = fav.imgUrl ? `color:#ffffff;` : ``;
            const subtitleColor = fav.imgUrl ? `color:#a5b4fc;` : `color:var(--accent);`;
            const btnColor = fav.imgUrl ? `color:#f8fafc;` : ``;

            return `
                    <li style="border-bottom:none; ${bgStyle} border-radius: 12px; position:relative; min-height: 160px; height: 100%; display: flex; flex-direction: column;">
                        <button id="fav-${fav.id}" class="fav-btn active" style="top:15px; right:15px; ${btnColor}" onclick="toggleFavorite('${fav.id}', '', '', '', '', '')">♥</button>
                        <div class="content-title" style="font-size:1.15rem; ${titleColor} margin-bottom:5px;">${fav.title}</div>
                        <div class="content-subtitle" style="cursor:pointer; ${subtitleColor}" onclick="openBio('${fav.subtitle.replace(/'/g, "&#39;")}')">${fav.subtitle} ℹ️</div>
                        ${audioPlayer}
                    </li>
                    `;
        }).join('');
    } else {
        songsCard.style.display = 'none';
        songsContainer.innerHTML = '';
    }

    if (albums.length > 0) {
        albumsCard.style.display = 'block';
        albumsContainer.innerHTML = albums.map(fav => {
            return `
                    <li style="border-bottom:none; background: linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('${fav.imgUrl}') no-repeat center center / cover; color: #f8fafc; padding: 20px; border-radius: 12px; position:relative; min-height:160px; height:100%; display:flex; flex-direction:column;">
                        <button id="fav-${fav.id}" class="fav-btn active" style="top:15px; right:15px; color:#f8fafc;" onclick="toggleFavorite('${fav.id}', '', '', '', '', '')">♥</button>
                        <div class="content-title" style="font-size:1.15rem; color:#ffffff; margin-bottom:5px;">${fav.title}</div>
                        <div class="content-subtitle" style="cursor:pointer; color:#a5b4fc;" onclick="openBio('${fav.subtitle.replace(/'/g, "&#39;")}')">${fav.subtitle} ℹ️</div>
                        <div id="album-tracks-${fav.id}" style="margin-top:auto;">
                            <button onclick="loadAlbumTracks('${fav.id}')" style="background:none; border:none; color:#a5b4fc; text-decoration:underline; cursor:pointer; font-size:0.8rem; padding:0; margin:0; font-family:'Poppins', sans-serif;">Visualizza Brani ▼</button>
                        </div>
                    </li>
                    `;
        }).join('');
    } else {
        albumsCard.style.display = 'none';
        albumsContainer.innerHTML = '';
    }
};

window.loadAlbumTracks = function (id) {
    const container = document.getElementById('album-tracks-' + id);
    container.innerHTML = '<span style="font-size:0.85rem; color:#cbd5f5;">Ricerca brani in corso...</span>';
    fetch(`https://itunes.apple.com/lookup?id=${id}&entity=song`)
        .then(r => r.json())
        .then(d => {
            if (d.results && d.results.length > 1) {
                const tracks = d.results.slice(1);
                let html = `<div style="max-height: 220px; overflow-y: auto; margin-top:15px; padding-right:10px;" class="album-tracks-list">`;
                html += tracks.map(t => {
                    const playingCode = t.previewUrl ? `<button onclick="playPreview(this, '${t.previewUrl}')" style="background:transparent; border:1px solid rgba(255,255,255,0.4); color:#fff; padding:4px 10px; border-radius:15px; cursor:pointer; font-size:0.7rem; margin-top:6px; transition:0.2s;">▶ Ascolta</button>` : '';
                    return `<div style="margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.15);">
                                <div style="font-size:0.85rem; font-weight:500;">${t.trackNumber}. ${t.trackName}</div>
                                ${playingCode}
                            </div>`;
                }).join('');
                html += `</div>`;
                container.innerHTML = html;
            } else {
                container.innerHTML = '<span style="font-size:0.85rem; color:#cbd5f5;">Nessun brano trovato per questo album.</span>';
            }
        }).catch(() => {
            container.innerHTML = '<span style="font-size:0.85rem; color:#cbd5f5;">Errore caricamento brani. Riprova più tardi.</span>';
        });
};

window.openBio = function (artistName) {
    const modal = document.getElementById('wiki-modal');
    const title = document.getElementById('wiki-modal-title');
    const body = document.getElementById('wiki-modal-body');

    modal.classList.add('active');
    title.innerText = artistName;
    body.innerHTML = 'Caricamento biografia da Wikipedia... <br><br><small>(Potrebbe richiedere qualche istante)</small>';

    fetch(`https://it.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&exintro&pithumbsize=200&generator=search&gsrsearch=${encodeURIComponent(artistName + " artista musicale")}&gsrlimit=1&format=json&origin=*`)
        .then(res => res.json())
        .then(data => {
            if (!data.query || !data.query.pages) {
                body.innerHTML = 'Nessuna biografia trovata su Wikipedia in italiano per questo artista.';
            } else {
                const pages = data.query.pages;
                const pageId = Object.keys(pages)[0];
                let extract = pages[pageId].extract;
                let pageTitle = pages[pageId].title;
                let imgHtml = '';
                if (pages[pageId].thumbnail && pages[pageId].thumbnail.source) {
                    imgHtml = `<img src="${pages[pageId].thumbnail.source}" alt="${artistName}" style="float:left; margin:0 15px 10px 0; border-radius:12px; width:120px; box-shadow:0 4px 10px rgba(0,0,0,0.1);">`;
                }
                body.innerHTML = imgHtml + extract + `<div style="clear:both;"></div><br><a href="https://it.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}" target="_blank" style="color:var(--accent);font-weight:bold;text-decoration:none;">Scopri di più su Wikipedia ➔</a>`;
            }
        }).catch(() => {
            body.innerHTML = 'Errore di connessione durante la ricerca della biografia.';
        });
};

document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('dynamic-grid-container');
    const countrySelect = document.getElementById('country-select');
    const searchInput = document.getElementById('music-search-input');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    // Carica preferiti iniziali
    renderFavorites();

    // --- Dark Mode ---
    if (localStorage.getItem('dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
        if (darkModeToggle) darkModeToggle.innerText = '☀️';
    }
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('dark_mode', isDark);
            darkModeToggle.innerText = isDark ? '☀️' : '🌙';
        });
    }

    // --- Modal Close ---
    const wikiModalClose = document.getElementById('wiki-modal-close');
    if (wikiModalClose) {
        wikiModalClose.addEventListener('click', () => {
            document.getElementById('wiki-modal').classList.remove('active');
        });
    }
    const wikiModal = document.getElementById('wiki-modal');
    if (wikiModal) {
        wikiModal.addEventListener('click', (e) => {
            if (e.target.id === 'wiki-modal') document.getElementById('wiki-modal').classList.remove('active');
        });
    }

    // --- Search Function ---
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.trim();
            clearTimeout(searchTimeout);
            if (term.length < 2) {
                if (term === '' && typeof currentCountry !== 'undefined') fetchMusicData(currentCountry);
                return;
            }

            searchTimeout = setTimeout(() => {
                if (container) container.innerHTML = '<div style="text-align: center; width: 100%; grid-column: 1 / -1; color: var(--text-secondary); font-size: 1.1rem;"><p>Ricerca globale in corso...</p></div>';

                fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=12`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.results && data.results.length > 0) {
                            let html = `
                                <div class="content-card" style="grid-column: 1 / -1;">
                                    <h3>🔍 Risultati Ricerca Internazionale</h3>
                                    <ul class="content-list" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
                                        ${data.results.map(song => {
                                const id = song.trackId.toString();
                                const albumId = song.collectionId ? song.collectionId.toString() : '';
                                const audioPlayer = song.previewUrl ? `<button onclick="playPreview(this, '${song.previewUrl}')" style="background:var(--accent); border:none; color:#fff; padding:6px 14px; border-radius:20px; cursor:pointer; font-size:0.75rem; font-weight:600; margin-top:10px;">▶ Ascolta</button>` : '';
                                const imgHires = song.artworkUrl100 ? song.artworkUrl100.replace('100x100', '600x600') : '';

                                const albumTrackBtnHtml = albumId ? `<button id="fav-${albumId}" class="fav-btn ${isFavorite(albumId) ? 'active' : ''}" style="position:static; transform:none; font-size:1rem; padding:2px;" onclick="toggleFavorite('${albumId}', '${song.collectionName.replace(/'/g, "&#39;")}', '${song.artistName.replace(/'/g, "&#39;")}', '', 'album', '${imgHires}')" title="Salva Intero Album">💿 ♥</button>` : '';

                                return `
                                            <li style="border-bottom:none; background: var(--card-hover); padding: 15px; border-radius: 12px; position:relative;">
                                                <div style="position:absolute; top:12px; right:12px; display:flex; gap:10px; z-index:5;">
                                                    <button id="fav-${id}" class="fav-btn ${isFavorite(id) ? 'active' : ''}" style="position:static; transform:none; font-size:1rem; padding:2px;" onclick="toggleFavorite('${id}', '${song.trackName.replace(/'/g, "&#39;")}', '${song.artistName.replace(/'/g, "&#39;")}', '${song.previewUrl || ''}', 'song', '${imgHires}')" title="Salva Singolo Brano">🎵 ♥</button>
                                                    ${albumTrackBtnHtml}
                                                </div>
                                                <div class="album-item" style="margin-bottom: 15px; padding-right:60px;">
                                                    <img src="${song.artworkUrl100}" alt="Cover" class="album-cover" style="width:60px; height:60px;">
                                                    <div>
                                                        <div class="content-title" style="font-size:0.95rem;">${song.trackName}</div>
                                                        <div class="content-subtitle">${song.artistName}</div>
                                                        <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">Album: ${song.collectionName}</div>
                                                    </div>
                                                </div>
                                                ${audioPlayer}
                                            </li>
                                            `;
                            }).join('')}
                                    </ul>
                                </div>`;
                            if (container) container.innerHTML = html;
                        } else {
                            if (container) container.innerHTML = '<div style="text-align: center; width: 100%; grid-column: 1 / -1; color: var(--text-secondary);">Nessun risultato trovato. Prova con altre parole chiave.</div>';
                        }
                    }).catch(() => {
                        if (container) container.innerHTML = '<div style="text-align: center; width: 100%; grid-column: 1 / -1; color: var(--text-secondary);">Errore di connessione durante la ricerca. Riprova.</div>';
                    });
            }, 800);
        });
    }

    function fetchMusicData(countryCode) {
        if (!container) return;
        container.innerHTML = '<div style="text-align: center; width: 100%; grid-column: 1 / -1; color: var(--text-secondary); font-size: 1.1rem;"><p>Caricamento classifiche in corso...</p></div>';

        const SONGS_URL = `https://itunes.apple.com/${countryCode}/rss/topsongs/limit=5/json`;
        const ALBUMS_URL = `https://itunes.apple.com/${countryCode}/rss/topalbums/limit=5/json`;

        Promise.all([
            fetch(SONGS_URL).then(res => res.json()),
            fetch(ALBUMS_URL).then(res => res.json())
        ])
            .then(([songsData, albumsData]) => {
                let html = '';
                const songs = songsData.feed.entry || [];
                const albums = albumsData.feed.entry || [];

                if (songs.length > 0) {
                    html += `
                        <div class="content-card">
                            <h3>🎵 Brani del Momento</h3>
                            <ul class="content-list">
                                ${songs.map(song => {
                        const id = song.id.attributes['im:id'];
                        const audioUrl = song.link && song.link.length > 1 ? song.link[1].attributes.href : '';
                        const audioPlayer = audioUrl ? `<button onclick="playPreview(this, '${audioUrl}')" style="background:var(--accent); border:none; color:#fff; padding:6px 14px; border-radius:20px; cursor:pointer; font-size:0.75rem; font-weight:600; margin-top:10px;">▶ Ascolta</button>` : '';
                        const artistName = song['im:artist'].label.replace(/'/g, "&#39;");
                        const titleName = song['im:name'].label.replace(/'/g, "&#39;");
                        const imgStr = song['im:image'] ? song['im:image'][song['im:image'].length - 1].label : '';
                        const imgHires = imgStr.replace(/\d+x\d+/, '600x600');
                        return `
                                    <li>
                                        <button id="fav-${id}" class="fav-btn ${isFavorite(id) ? 'active' : ''}" onclick="toggleFavorite('${id}', '${titleName}', '${artistName}', '${audioUrl || ''}', 'song', '${imgHires}')">♥</button>
                                        <div class="content-title">${song['im:name'].label}</div>
                                        <div class="content-subtitle">${song['im:artist'].label}</div>
                                        <div class="content-body" style="font-size: 0.85rem;">Album: ${song['im:collection']['im:name'].label} &bull; Genere: ${song.category.attributes.label}</div>
                                        ${audioPlayer}
                                    </li>
                                    `;
                    }).join('')}
                            </ul>
                        </div>
                        `;
                }

                if (albums.length > 0 || songs.length > 0) {
                    const artists = [];
                    const seen = new Set();
                    albums.forEach(album => {
                        const artistName = album['im:artist'].label;
                        if (!seen.has(artistName) && artists.length < 5) {
                            seen.add(artistName);
                            artists.push({
                                name: artistName,
                                genre: album.category.attributes.label
                            });
                        }
                    });

                    html += `
                        <div class="content-card">
                            <h3>🎤 Artisti in Voga</h3>
                            <ul class="content-list">
                                ${artists.map(artist => `
                                    <li>
                                        <div class="content-title" style="cursor:pointer; color:var(--accent);" onclick="openBio('${artist.name.replace(/'/g, "&#39;")}')">${artist.name} ℹ️</div>
                                        <div class="content-subtitle">${artist.genre}</div>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        `;
                }

                if (albums.length > 0) {
                    html += `
                        <div class="content-card">
                            <h3>💿 Classifica Album</h3>
                            <ul class="content-list">
                                ${albums.map(album => {
                        const id = album.id.attributes['im:id'];
                        const img = album['im:image'] ? album['im:image'][album['im:image'].length - 1].label : '';
                        const title = album['im:name'].label;
                        const titleClean = title.replace(/'/g, "&#39;");
                        const artist = album['im:artist'].label;
                        const artistClean = artist.replace(/'/g, "&#39;");
                        const releaseDate = album['im:releaseDate'] ? album['im:releaseDate'].attributes.label : 'Recente';

                        return `
                                    <li>
                                        <button id="fav-${id}" class="fav-btn ${isFavorite(id) ? 'active' : ''}" onclick="toggleFavorite('${id}', '${titleClean}', '${artistClean}', '', 'album', '${img.replace('100x100', '600x600')}')">♥</button>
                                        <div class="album-item">
                                            <img src="${img}" alt="Cover" class="album-cover" onerror="this.src='https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&q=80'">
                                            <div>
                                                <div class="content-title" style="font-size:1rem;">${title}</div>
                                                <div class="content-subtitle">${artist}</div>
                                                <div class="content-subtitle" style="margin-bottom:0; font-size:0.75rem;">Uscita: ${releaseDate}</div>
                                            </div>
                                        </div>
                                    </li>
                                    `;
                    }).join('')}
                            </ul>
                        </div>
                        `;
                }

                container.innerHTML = html || '<div style="text-align: center; width: 100%; grid-column: 1 / -1; color: var(--text-secondary);">Nessuna novità disponibile.</div>';
            })
            .catch(error => {
                console.error('Errore:', error);
                if (container) container.innerHTML = '<div style="text-align: center; width: 100%; grid-column: 1 / -1; color: var(--text-secondary);">Errore caricamento.</div>';
            });
    }

    let currentCountry = 'it';
    fetchMusicData(currentCountry);

    const dropdown = document.getElementById('custom-dropdown');
    const selectedBox = document.getElementById('custom-dropdown-selected');
    const optionsList = document.getElementById('custom-dropdown-options');

    if (selectedBox) {
        selectedBox.addEventListener('click', function (e) {
            dropdown.classList.toggle('open');
            e.stopPropagation();
        });
        document.addEventListener('click', () => dropdown.classList.remove('open'));
        if (optionsList) {
            optionsList.querySelectorAll('li').forEach(option => {
                option.addEventListener('click', function () {
                    const value = this.getAttribute('data-value');
                    const text = this.innerText;
                    const imgSrc = this.querySelector('img').src;
                    selectedBox.querySelector('.selected-text').innerText = text;
                    selectedBox.querySelector('.selected-flag').src = imgSrc;
                    dropdown.classList.remove('open');
                    if (currentCountry !== value) {
                        currentCountry = value;
                        fetchMusicData(currentCountry);
                    }
                });
            });
        }
    }
});

// --- Logic for Global Music Events (100% API Driven) ---
const TICKETMASTER_API_KEY = 'xWR4t9BUYk3VhI546JOxNDIrpf13sPzA'; 

let musicEvents = []; 
let currentGrouping = 'date'; // 'date' o 'country'

async function fetchLiveEvents() {
    if (!TICKETMASTER_API_KEY) {
        const es = document.getElementById('events-section');
        if (es) es.style.display = 'none';
        return;
    }

    const localeMap = { 'it': 'it-it', 'en': 'en-us', 'fr': 'fr-fr', 'es': 'es-es', 'de': 'de-de' };
    const locale = localeMap[currentLang] || 'en-us';

    try {
        const startDateTime = new Date().toISOString().split('.')[0] + "Z";
        const endDay = new Date();
        endDay.setMonth(endDay.getMonth() + 6);
        const endDateTime = endDay.toISOString().split('.')[0] + "Z";

        const response = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?classificationName=music&size=150&sort=date,asc&startDateTime=${startDateTime}&endDateTime=${endDateTime}&locale=${locale}&apikey=${TICKETMASTER_API_KEY}`);
        const data = await response.json();

        if (data && data._embedded && data._embedded.events) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const countryPriorityMap = { 'it': 'IT', 'en': 'US', 'fr': 'FR', 'es': 'ES', 'de': 'DE' };
            const priorityCountry = countryPriorityMap[currentLang] || 'US';

            const grouped = {};
            data._embedded.events.forEach(ev => {
                if (!ev.dates || !ev.dates.start || !ev.dates.start.localDate) return;
                const start = new Date(ev.dates.start.localDate);
                if (start < today) return;

                const artist = ev.name;
                let venueName = "", cityName = "", countryCode = "";
                if (ev._embedded && ev._embedded.venues && ev._embedded.venues.length > 0) {
                    const v = ev._embedded.venues[0];
                    venueName = v.name || "";
                    if (v.city) cityName = v.city.name || "";
                    if (v.country) countryCode = v.country.countryCode || "";
                }
                
                let locSnippet = venueName || cityName || "";
                if (cityName && !venueName.includes(cityName)) locSnippet += `, ${cityName}`;
                if (countryCode) locSnippet += ` (${countryCode})`;

                if (!grouped[artist]) {
                    grouped[artist] = {
                        artist: artist,
                        locations: new Set([locSnippet]),
                        countryCode: countryCode,
                        isPriority: countryCode === priorityCountry,
                        minDate: start,
                        maxDate: (ev.dates.end && ev.dates.end.localDate) ? new Date(ev.dates.end.localDate) : start,
                        image: (ev.images && ev.images.length > 0) ? ev.images[0].url : "https://images.unsplash.com/photo-1459749411177-042180ce6742?w=800&q=80",
                        link: ev.url
                    };
                } else {
                    if (locSnippet) grouped[artist].locations.add(locSnippet);
                    if (start < grouped[artist].minDate) grouped[artist].minDate = start;
                    const evEnd = (ev.dates.end && ev.dates.end.localDate) ? new Date(ev.dates.end.localDate) : start;
                    if (evEnd > grouped[artist].maxDate) grouped[artist].maxDate = evEnd;
                    if (countryCode === priorityCountry) grouped[artist].isPriority = true;
                }
            });

            musicEvents = Object.values(grouped);
            renderEvents();
        }
    } catch (e) { console.error(e); }
}

function renderEvents(filter = '') {
    const container = document.getElementById('events-grid-container');
    if (!container) return;

    const fromLabel = translations[currentLang].date_from || 'DAL';
    const toLabel = translations[currentLang].date_to || 'AL';

    const fe = musicEvents.filter(ev => 
        ev.artist.toLowerCase().includes(filter.toLowerCase()) || 
        Array.from(ev.locations).some(l => l.toLowerCase().includes(filter.toLowerCase()))
    );

    if (fe.length === 0) {
        container.innerHTML = `<div style="text-align: center; width:100%; color:var(--text-secondary);">Nessun evento.</div>`;
        return;
    }

    fe.sort((a, b) => {
        if (a.isPriority && !b.isPriority) return -1;
        if (!a.isPriority && b.isPriority) return 1;
        return a.minDate - b.minDate;
    });

    const countryPriorityMap = { 'it': 'IT', 'en': 'US', 'fr': 'FR', 'es': 'ES', 'de': 'DE' };
    const priorityCode = countryPriorityMap[currentLang] || 'US';

    let sections = {};
    if (currentGrouping === 'date') {
        fe.forEach(ev => {
            const key = ev.minDate.toLocaleDateString(currentLang, { month: 'long', year: 'numeric' });
            if (!sections[key]) sections[key] = [];
            sections[key].push(ev);
        });
    } else {
        fe.forEach(ev => {
            const key = ev.countryCode || "Other";
            if (!sections[key]) sections[key] = [];
            sections[key].push(ev);
        });
    }

    let sortedS = Object.keys(sections).map(k => ({ title: k, events: sections[k], isPri: false }));
    if (currentGrouping === 'country') {
        sortedS.forEach(s => { if(s.title === priorityCode) s.isPri = true; });
        sortedS.sort((a,b) => (a.isPri && !b.isPri) ? -1 : (!a.isPri && b.isPri) ? 1 : a.title.localeCompare(b.title));
    } else {
        if (sortedS.length > 0) sortedS[0].isPri = true;
    }

    container.innerHTML = sortedS.map(s => {
        const titleText = currentGrouping==='country' ? (new Intl.DisplayNames([currentLang], {type:'region'}).of(s.title) || s.title) : s.title;
        const hStyle = s.isPri ? "background:rgba(34,197,94,0.1); border:1px solid var(--accent-color);" : "background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);";
        return `
            <details ${s.isPri ? 'open' : ''} style="grid-column:1 / -1; margin-bottom:30px; width:100%;">
                <summary style="list-style:none; cursor:pointer; padding:15px 25px; ${hStyle} border-radius:15px; margin-bottom:20px; font-size:1.3rem; font-weight:700; color:var(--accent-color); display:flex; justify-content:space-between; align-items:center;">
                    <span>${titleText.toUpperCase()} ${s.isPri ? '⭐' : ''}</span>
                    <span style="font-size:0.9rem; opacity:0.6;">${s.events.length} eventi</span>
                </summary>
                <div class="events-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:30px;">
                    ${s.events.map(ev => {
                        const d1 = ev.minDate.toLocaleDateString(currentLang, {day:'numeric', month:'long', year:'numeric'});
                        const dDisplay = (ev.maxDate > ev.minDate) ? `${fromLabel} ${d1} ${toLabel} ${ev.maxDate.toLocaleDateString(currentLang, {day:'numeric', month:'long', year:'numeric'})}` : d1;
                        const locs = Array.from(ev.locations).filter(l => l!=="");
                        let lDisplay = locs.slice(0,2).join(" | ");
                        if(locs.length > 2) lDisplay += ` + ${locs.length-2} ${currentLang==='it' ? 'altre' : 'more'}...`;
                        return `
                        <div class="event-card" style="background-image:url('${ev.image}')">
                            <div style="position:absolute; top:20px; right:20px; background:#22c55e; color:#fff; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700; z-index:10; box-shadow:0 4px 10px rgba(0,0,0,0.3);">LIVE</div>
                            <div class="event-card-content">
                                <div class="event-date">${dDisplay}</div>
                                <div class="event-artist">${ev.artist}</div>
                                <div class="event-location" title="${locs.join('\n')}">📍 ${lDisplay}</div>
                                <a href="${ev.link}" target="_blank" class="event-btn">${translations[currentLang].view_tickets}</a>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </details>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    fetchLiveEvents();
    const esi = document.getElementById('event-search-input');
    if (esi) esi.addEventListener('input', (e) => renderEvents(e.target.value));

    const gdb = document.getElementById('group-date-btn');
    const gcb = document.getElementById('group-country-btn');
    if (gdb && gcb) {
        gdb.addEventListener('click', () => {
            currentGrouping = 'date';
            gdb.classList.add('active'); gcb.classList.remove('active');
            gdb.style.background = 'var(--accent-color)'; gdb.style.color = 'white';
            gcb.style.background = 'transparent'; gcb.style.color = 'var(--text-secondary)';
            renderEvents();
        });
        gcb.addEventListener('click', () => {
            currentGrouping = 'country';
            gcb.classList.add('active'); gdb.classList.remove('active');
            gcb.style.background = 'var(--accent-color)'; gcb.style.color = 'white';
            gdb.style.background = 'transparent'; gdb.style.color = 'var(--text-secondary)';
            renderEvents();
        });
    }

    // --- Theme Picker Logic ---
    const savedTheme = localStorage.getItem('music_theme') || 'default';
    if (savedTheme !== 'default') document.body.classList.add('theme-' + savedTheme);

    document.querySelectorAll('.theme-bubble').forEach(bubble => {
        bubble.addEventListener('click', () => {
            document.body.classList.remove('theme-ocean', 'theme-sunset', 'theme-forest');
            const theme = bubble.getAttribute('data-theme');
            if (theme !== 'default') document.body.classList.add('theme-' + theme);
            localStorage.setItem('music_theme', theme);
            // Refresh UI components that use accent colors
            renderEvents();
            if (typeof renderFavorites === 'function') renderFavorites();
        });
    });
});
