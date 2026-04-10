// Variabili globali per Preferiti, Audio e Stato
let favorites = JSON.parse(localStorage.getItem('music_favs') || '[]');
window.currentAudio = null;
window.currentPlayBtn = null;
let currentCountry = 'it'; // Definita globalmente per essere accessibile da tutti i moduli
let musicEvents = []; 
let currentGrouping = 'date'; // 'date' o 'country'
let eventsGlobalExpanded = true; // null = default, true = expand all, false = collapse all
window.currentGrouping = currentGrouping;
window.eventsGlobalExpanded = eventsGlobalExpanded;
const TICKETMASTER_API_KEY = 'xWR4t9BUYk3VhI546JOxNDIrpf13sPzA'; 

window.refreshExpandBtn = function() {
    const btnText = document.getElementById('expand-all-text');
    const btnIcon = document.getElementById('expand-all-icon');
    const safeLang = (typeof currentLang !== 'undefined') ? currentLang : 'it';
    
    if (btnText && typeof translations !== 'undefined' && translations[safeLang]) {
        // Se è true (tutto aperto), proponi 'collapse_all'
        // Se è null o false (tutto chiuso o default), proponi 'expand_all'
        const key = window.eventsGlobalExpanded === true ? 'collapse_all' : 'expand_all';
        btnText.innerText = translations[safeLang][key] || (window.eventsGlobalExpanded === true ? 'Riduci Tutto' : 'Espandi Tutto');
    }
    if (btnIcon) {
        btnIcon.innerText = window.eventsGlobalExpanded === true ? '📁' : '📂';
    }
};

// --- Audio Player Logic ---
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

// --- Favorites Logic ---
window.toggleFavorite = function (id, title, subtitle, audioUrl, type, imgUrl) {
    const index = favorites.findIndex(f => f.id === id);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push({ id, title, subtitle, audioUrl: audioUrl || '', type: type || 'song', imgUrl: imgUrl || '' });
    }
    localStorage.setItem('music_favs', JSON.stringify(favorites));

    document.querySelectorAll('.fav-btn').forEach(btn => {
        if (btn.id === 'fav-' + id) btn.classList.toggle('active');
    });

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
            return `
                <li style="border-bottom:none; ${bgStyle} border-radius: 12px; position:relative; min-height: 160px; height: 100%; display: flex; flex-direction: column;">
                    <button id="fav-${fav.id}" class="fav-btn active" style="top:15px; right:15px;" onclick="toggleFavorite('${fav.id}', '', '', '', '', '')">♥</button>
                    <div class="content-title" style="font-size:1.15rem; margin-bottom:5px;">${fav.title}</div>
                    <div class="content-subtitle" style="cursor:pointer;" onclick="openBio('${fav.subtitle.replace(/'/g, "&#39;")}')">${fav.subtitle} ℹ️</div>
                    ${audioPlayer}
                </li>`;
        }).join('');
    } else {
        songsCard.style.display = 'none';
    }

    if (albums.length > 0) {
        albumsCard.style.display = 'block';
        albumsContainer.innerHTML = albums.map(fav => {
            return `
                <li style="border-bottom:none; background: linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('${fav.imgUrl}') no-repeat center center / cover; color: #f8fafc; padding: 20px; border-radius: 12px; position:relative; min-height:160px; height:100%; display:flex; flex-direction:column;">
                    <button id="fav-${fav.id}" class="fav-btn active" style="top:15px; right:15px;" onclick="toggleFavorite('${fav.id}', '', '', '', '', '')">♥</button>
                    <div class="content-title" style="font-size:1.15rem; color:#ffffff; margin-bottom:5px;">${fav.title}</div>
                    <div class="content-subtitle" style="cursor:pointer; color:#a5b4fc;" onclick="openBio('${fav.subtitle.replace(/'/g, "&#39;")}')">${fav.subtitle} ℹ️</div>
                    <div id="album-tracks-${fav.id}" style="margin-top:auto;">
                        <button onclick="loadAlbumTracks('${fav.id}')" style="background:none; border:none; color:#a5b4fc; text-decoration:underline; cursor:pointer; font-size:0.8rem; padding:0; margin:0;">Visualizza Brani ▼</button>
                    </div>
                </li>`;
        }).join('');
    } else {
        albumsCard.style.display = 'none';
    }
};

window.loadAlbumTracks = function (id) {
    const container = document.getElementById('album-tracks-' + id);
    container.innerHTML = '<span style="font-size:0.85rem; color:#cbd5f5;">Ricerca brani...</span>';
    fetch(`https://itunes.apple.com/lookup?id=${id}&entity=song`)
        .then(r => r.json())
        .then(d => {
            if (d.results && d.results.length > 1) {
                const tracks = d.results.slice(1);
                container.innerHTML = `<div style="max-height: 200px; overflow-y: auto; margin-top:10px;">` + 
                    tracks.map(t => `<div style="margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px;">
                        <div style="font-size:0.8rem;">${t.trackNumber}. ${t.trackName}</div>
                        ${t.previewUrl ? `<button onclick="playPreview(this, '${t.previewUrl}')" style="background:transparent; border:1px solid rgba(255,255,255,0.3); color:#fff; padding:3px 8px; border-radius:15px; cursor:pointer; font-size:0.65rem; margin-top:4px;">▶ Ascolta</button>` : ''}
                    </div>`).join('') + `</div>`;
            }
        });
};

window.openBio = function (artistName) {
    const modal = document.getElementById('wiki-modal');
    modal.classList.add('active');
    document.getElementById('wiki-modal-title').innerText = artistName;
    document.getElementById('wiki-modal-body').innerHTML = 'Caricamento da Wikipedia...';
    fetch(`https://it.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&generator=search&gsrsearch=${encodeURIComponent(artistName + " artista musicale")}&gsrlimit=1&format=json&origin=*`)
        .then(res => res.json())
        .then(data => {
            if (data.query) {
                const page = Object.values(data.query.pages)[0];
                document.getElementById('wiki-modal-body').innerHTML = page.extract + `<br><a href="https://it.wikipedia.org/wiki/${encodeURIComponent(page.title)}" target="_blank" style="color:var(--accent);">Leggi tutto ➔</a>`;
            } else {
                document.getElementById('wiki-modal-body').innerHTML = 'Biografia non trovata.';
            }
        });
};

// --- Charts Data Fetch ---
function fetchMusicData(countryCode) {
    const container = document.getElementById('dynamic-grid-container');
    if (!container) return;
    container.innerHTML = '<div style="text-align: center; width:100%; color:var(--text-secondary);">Caricamento classifiche...</div>';

    Promise.all([
        fetch(`https://itunes.apple.com/${countryCode}/rss/topsongs/limit=5/json`).then(r => r.json()),
        fetch(`https://itunes.apple.com/${countryCode}/rss/topalbums/limit=5/json`).then(r => r.json())
    ]).then(([songsData, albumsData]) => {
        let html = '';
        const songs = songsData.feed.entry || [];
        const albums = albumsData.feed.entry || [];

        if (songs.length > 0) {
            html += `<div class="content-card"><h3>🎵 Brani del Momento</h3><ul class="content-list">${songs.map(song => {
                const id = song.id.attributes['im:id'];
                const audioUrl = song.link[1] ? song.link[1].attributes.href : '';
                return `<li>
                    <button id="fav-${id}" class="fav-btn ${isFavorite(id) ? 'active' : ''}" onclick="toggleFavorite('${id}', '${song['im:name'].label.replace(/'/g, "\\'")}', '${song['im:artist'].label.replace(/'/g, "\\'")}', '${audioUrl}', 'song', '${song['im:image'][2].label}')">♥</button>
                    <div class="content-title">${song['im:name'].label}</div>
                    <div class="content-subtitle">${song['im:artist'].label}</div>
                    ${audioUrl ? `<button onclick="playPreview(this, '${audioUrl}')" style="background:var(--accent); border:none; color:#fff; padding:6px 12px; border-radius:20px; cursor:pointer; font-size:0.75rem; margin-top:10px;">▶ Ascolta</button>` : ''}
                </li>`;
            }).join('')}</ul></div>`;
        }

        if (albums.length > 0) {
            html += `<div class="content-card"><h3>💿 Classifica Album</h3><ul class="content-list">${albums.map(album => {
                const id = album.id.attributes['im:id'];
                return `<li>
                    <button id="fav-${id}" class="fav-btn ${isFavorite(id) ? 'active' : ''}" onclick="toggleFavorite('${id}', '${album['im:name'].label.replace(/'/g, "\\'")}', '${album['im:artist'].label.replace(/'/g, "\\'")}', '', 'album', '${album['im:image'][2].label}')">♥</button>
                    <div class="album-item">
                        <img src="${album['im:image'][2].label}" class="album-cover">
                        <div>
                            <div class="content-title">${album['im:name'].label}</div>
                            <div class="content-subtitle">${album['im:artist'].label}</div>
                        </div>
                    </div>
                </li>`;
            }).join('')}</ul></div>`;
        }
        container.innerHTML = html;
    }).catch(() => {
        container.innerHTML = '<div style="text-align: center; width:100%; color:var(--text-secondary);">Errore caricamento.</div>';
    });
}

// --- Live Events Fetch & Render ---
async function fetchLiveEvents() {
    if (!TICKETMASTER_API_KEY) return;
    const safeLang = (typeof currentLang !== 'undefined') ? currentLang : 'it';
    const localeMap = { 'it': 'it-it', 'en': 'en-us', 'fr': 'fr-fr', 'es': 'es-es', 'de': 'de-de' };
    const locale = localeMap[safeLang] || 'en-us';
    const priorityCode = currentCountry.toUpperCase();

    try {
        const start = new Date().toISOString().split('.')[0] + "Z";
        const end = new Date(); end.setMonth(end.getMonth() + 6);
        const endStr = end.toISOString().split('.')[0] + "Z";

        const response = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?classificationName=music&size=200&sort=date,asc&startDateTime=${start}&endDateTime=${endStr}&locale=${locale}&apikey=${TICKETMASTER_API_KEY}`);
        const data = await response.json();

        if (data && data._embedded && data._embedded.events) {
            musicEvents = data._embedded.events.map(ev => {
                const v = ev._embedded?.venues?.[0] || {};
                const name = v.name || "";
                const city = v.city?.name || "";
                const country = v.country?.countryCode || "";
                
                const locParts = [];
                if (name) locParts.push(name);
                if (city && !name.includes(city)) locParts.push(city);
                
                let loc = locParts.join(', ');
                if (country) loc = loc ? `${loc} (${country})` : `(${country})`;

                // Se non c'è nulla, usiamo un placeholder dignitoso
                if (!loc || loc.length <= 4) loc = `Location in ${country || 'International'}`;

                return {
                    artist: ev.name,
                    locations: [loc],
                    countryCode: country,
                    isPriority: (country === priorityCode),
                    minDate: new Date(ev.dates.start.localDate),
                    image: ev.images?.[0]?.url || "https://images.unsplash.com/photo-1459749411177-042180ce6742?w=800&q=80",
                    link: ev.url
                };
            });
            renderEvents();
        }
    } catch (e) { console.error(e); }
}

function renderEvents(filter = '') {
    const container = document.getElementById('events-grid-container');
    if (!container) return;

    // Protezione per la variabile lingua
    const safeLang = (typeof currentLang !== 'undefined') ? currentLang : 'it';

    const filtered = musicEvents.filter(ev => ev.artist.toLowerCase().includes(filter.toLowerCase()));
    filtered.sort((a,b) => (a.isPriority === b.isPriority) ? a.minDate - b.minDate : (a.isPriority ? -1 : 1));

    const priorityCode = currentCountry.toUpperCase();
    
    // Sincronizziamo lo stato visivo dei pulsanti raggruppamento
    const gdb = document.getElementById('group-date-btn');
    const gcb = document.getElementById('group-country-btn');
    if (gdb && gcb) {
        gdb.classList.toggle('active', currentGrouping === 'date');
        gcb.classList.toggle('active', currentGrouping === 'country');
        gdb.style.background = currentGrouping === 'date' ? 'var(--accent-color)' : 'transparent';
        gcb.style.background = currentGrouping === 'country' ? 'var(--accent-color)' : 'transparent';
        gdb.style.color = currentGrouping === 'date' ? 'white' : 'var(--text-secondary)';
        gcb.style.color = currentGrouping === 'country' ? 'white' : 'var(--text-secondary)';
    }

    let sections = {};
    if (currentGrouping === 'date') {
        filtered.forEach(ev => {
            const key = ev.minDate.toLocaleDateString(safeLang, { month: 'long', year: 'numeric' });
            if (!sections[key]) sections[key] = [];
            sections[key].push(ev);
        });
    } else {
        filtered.forEach(ev => {
            const key = ev.countryCode || "Other";
            if (!sections[key]) sections[key] = [];
            sections[key].push(ev);
        });
    }

    container.innerHTML = Object.keys(sections).map(key => {
        const isPri = window.currentGrouping === 'country' ? (key === priorityCode) : (key === Object.keys(sections)[0]);
        // Seguiamo lo stato globale: true = tutto aperto, false = tutto chiuso
        const isOpen = window.eventsGlobalExpanded;
        const title = window.currentGrouping === 'country' ? (new Intl.DisplayNames([safeLang], {type:'region'}).of(key.toUpperCase()) || key) : key;
        const count = sections[key].length;
        
        return `
            <details ${isOpen ? 'open' : ''} style="grid-column:1/-1; margin-bottom:20px;">
                <summary style="padding:15px 20px; background:rgba(255,255,255,0.05); border-radius:12px; cursor:pointer; font-weight:bold; color:var(--accent); display:flex; justify-content:space-between; align-items:center; transition:0.3s; border:1px solid rgba(255,255,255,0.1);">
                    <span>${title.toUpperCase()} ${isPri ? '⭐' : ''}</span>
                    <span style="font-size:0.85rem; padding:4px 10px; background:rgba(255,255,255,0.1); border-radius:20px; color:var(--text-secondary);">${count} ${safeLang === 'it' ? 'eventi' : 'events'}</span>
                </summary>
                <div class="events-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(300px,1fr)); gap:20px; padding:20px 0;">
                    ${sections[key].map(ev => `
                        <div class="event-card" style="background-image:url('${ev.image}')">
                            <div class="event-card-content">
                                <div class="event-date">${ev.minDate.toLocaleDateString(safeLang, {day:'numeric', month:'short', year:'numeric'})}</div>
                                <div class="event-artist" style="font-size:1.1rem; margin-bottom:5px;">${ev.artist}</div>
                                <div class="event-location" title="${Array.from(ev.locations).join('\n')}">📍 ${Array.from(ev.locations)[0]}</div>
                                <a href="${ev.link}" target="_blank" class="event-btn" style="margin-top:10px;">${safeLang === 'it' ? 'Scopri Biglietti' : 'View Tickets'}</a>
                            </div>
                        </div>`).join('')}
                </div>
            </details>`;
    }).join('');
}

// --- Main Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Data Load
    renderFavorites();
    fetchMusicData(currentCountry);
    fetchLiveEvents();

    // 2. Search Handlers
    const musicSearch = document.getElementById('music-search-input');
    if (musicSearch) {
        let st;
        musicSearch.addEventListener('input', (e) => {
            clearTimeout(st);
            st = setTimeout(() => {
                if (e.target.value.trim() === '') fetchMusicData(currentCountry);
            }, 500);
        });
    }
    const eventSearch = document.getElementById('event-search-input');
    if (eventSearch) eventSearch.addEventListener('input', (e) => renderEvents(e.target.value));

    // 3. Country Selector Logic (Charts & Events Synchronization)
    function setupCountryDropdown(dropdownId, selectedId, optionsId) {
        const dropdown = document.getElementById(dropdownId);
        const selectedBox = document.getElementById(selectedId);
        const optionsList = document.getElementById(optionsId);

        if (selectedBox && optionsList) {
            selectedBox.addEventListener('click', (e) => {
                dropdown.classList.toggle('open');
                e.stopPropagation();
            });

            optionsList.querySelectorAll('li').forEach(option => {
                option.addEventListener('click', function () {
                    const value = this.getAttribute('data-value');
                    const text = this.innerText;
                    const imgSrc = this.querySelector('img').src;

                    if (currentCountry !== value) {
                        currentCountry = value;
                        
                        // Sincronizza TUTTI i dropdown della pagina
                        document.querySelectorAll('.custom-dropdown-selected').forEach(box => {
                            box.querySelector('.selected-text').innerText = text;
                            box.querySelector('.selected-flag').src = imgSrc;
                        });

                        fetchMusicData(currentCountry);
                        fetchLiveEvents(); 
                    }
                    dropdown.classList.remove('open');
                });
            });
        }
    }

    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('open'));
    });

    setupCountryDropdown('custom-dropdown', 'custom-dropdown-selected', 'custom-dropdown-options');
    setupCountryDropdown('event-country-dropdown', 'event-country-selected', 'event-country-options');

    // 4. Grouping & Expansion Toggles
    const gdb = document.getElementById('group-date-btn');
    const gcb = document.getElementById('group-country-btn');
    const expandBtn = document.getElementById('expand-all-btn');
    
    if (gdb && gcb) {
        gdb.addEventListener('click', () => { window.currentGrouping = 'date'; currentGrouping = 'date'; renderEvents(); });
        gcb.addEventListener('click', () => { window.currentGrouping = 'country'; currentGrouping = 'country'; renderEvents(); });
    }

    if (expandBtn) {
        expandBtn.addEventListener('click', () => {
            // Se è null, lo facciamo diventare true. Se è true diventa false. Se è false diventa true.
            window.eventsGlobalExpanded = (window.eventsGlobalExpanded === true) ? false : true;
            renderEvents(); // Aggiorna le liste
            window.refreshExpandBtn(); // Aggiorna testo/icona pulsante
        });
    }

    // Forza sincronizzazione iniziale testi pulsanti
    if (typeof window.refreshExpandBtn === 'function') window.refreshExpandBtn();

    // 5. Dark Mode & Themes
    const darkModeBtn = document.getElementById('dark-mode-toggle');
    if (darkModeBtn) {
        if (localStorage.getItem('dark_mode') === 'true') document.body.classList.add('dark-mode');
        darkModeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('dark_mode', document.body.classList.contains('dark-mode'));
        });
    }

    const savedTheme = localStorage.getItem('music_theme') || 'default';
    if (savedTheme !== 'default') document.body.classList.add('theme-' + savedTheme);
    document.querySelectorAll('.theme-bubble').forEach(b => {
        b.addEventListener('click', () => {
            document.body.classList.remove('theme-ocean', 'theme-sunset', 'theme-forest');
            const t = b.getAttribute('data-theme');
            if (t !== 'default') document.body.classList.add('theme-' + t);
            localStorage.setItem('music_theme', t);
            renderEvents();
            renderFavorites();
        });
    });

    // 6. Modal Logic
    const modalClose = document.getElementById('wiki-modal-close');
    if (modalClose) modalClose.addEventListener('click', () => document.getElementById('wiki-modal').classList.remove('active'));
});
