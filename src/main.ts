import './style.css';
import { 
  handleAuthRedirect, 
  redirectToSpotifyAuth, 
  getTopTracks, 
  type SpotifyTrack 
} from './spotify';

const renderTrack = (track: SpotifyTrack, index: number) => {
  const card = document.createElement('div');
  card.className = 'track-card';
  
  card.innerHTML = `
    <div class="track-rank">${index + 1}</div>
    <img src="${track.album.images[0]?.url}" alt="${track.name}" class="track-image" loading="lazy">
    <div class="track-info">
      <p class="track-title" title="${track.name}">${track.name}</p>
      <p class="track-artist">${track.artists.map(a => a.name).join(', ')}</p>
    </div>
  `;

  card.onclick = () => window.open(track.external_urls.spotify, '_blank');
  
  return card;
};

const init = async () => {
  console.log('Initializing Spotify Dashboard...');
  
  const loginSection = document.getElementById('login-section');
  const dashboardSection = document.getElementById('dashboard-section');
  const loginButton = document.getElementById('login-button');
  const logoutButton = document.getElementById('logout-button');
  const tracksGrid = document.getElementById('tracks-grid');
  const loadingIndicator = document.getElementById('loading');

  if (!loginSection || !dashboardSection || !loginButton || !logoutButton || !tracksGrid || !loadingIndicator) {
    console.error('Required DOM elements not found');
    return;
  }

  // Logout handler
  logoutButton.onclick = () => {
    window.localStorage.removeItem('access_token');
    window.localStorage.removeItem('code_verifier');
    window.location.reload(); // Refresh to clear state and go to login
  };

  // Check for stored token or handle redirect code
  let token = window.localStorage.getItem('access_token');
  
  if (!token) {
    try {
      token = await handleAuthRedirect();
      if (token) {
        window.localStorage.setItem('access_token', token);
      }
    } catch (error) {
      console.error('Auth redirect handling failed:', error);
    }
  }

  if (token) {
    console.log('Access token found, loading tracks...');
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    logoutButton.style.display = 'flex'; // Show logout button

    try {
      const tracks = await getTopTracks(token);
      loadingIndicator.style.display = 'none';
      
      tracks.forEach((track, index) => {
        tracksGrid.appendChild(renderTrack(track, index));
      });
    } catch (error) {
      console.error('Error fetching tracks:', error);
      window.localStorage.removeItem('access_token');
      loadingIndicator.innerHTML = '<p>Error loading tracks. Your session might have expired. Please login again.</p>';
      loginSection.style.display = 'flex';
      logoutButton.style.display = 'none';
    }
  } else {
    console.log('No token found, showing login screen.');
    loginSection.style.display = 'flex';
    dashboardSection.style.display = 'none';
    logoutButton.style.display = 'none';
    
    loginButton.addEventListener('click', () => {
      console.log('Login button clicked, redirecting to Spotify...');
      redirectToSpotifyAuth();
    });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
