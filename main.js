const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Set up Spotify credentials
const spotifyApi = new SpotifyWebApi({
  clientId: '011188270465432ba262f8a90502d186',
  clientSecret: '2015a518fcd24d8b8db74d114ec9ad1a',
  redirectUri: 'https://compute-bloxify-net-callback.xjulien-rodot.workers.dev/' // Change this to your Render server URL
});

// Endpoint to refresh access token
app.post('/refresh-token', (req, res) => {
  spotifyApi.setRefreshToken(req.body.refreshToken);
  spotifyApi.refreshAccessToken().then(
    data => {
      res.json({
        accessToken: data.body['access_token'],
        expiresIn: data.body['expires_in']
      });
    },
    err => {
      console.log('Could not refresh access token', err);
      res.status(400).send('Error refreshing token');
    }
  );
});

// Endpoint to start Spotify playback
app.post('/play', (req, res) => {
  const accessToken = req.body.accessToken;

  // Setup player
  const player = new Spotify.Player({
    name: 'Render Web Playback SDK',
    getOAuthToken: cb => { cb(accessToken); },
  });

  player.connect().then(success => {
    if (success) {
      console.log('Player connected to Spotify!');
      res.send('Player connected');
    } else {
      res.status(500).send('Failed to connect player');
    }
  });

  player.addListener('player_state_changed', state => {
    if (state) {
      // Send back audio data (frequencies or other details you need)
      const track = state.track_window.current_track;
      const playbackState = {
        songName: track.name,
        artists: track.artists.map(artist => artist.name),
        audioData: state // Example state object containing necessary audio data
      };
      res.json(playbackState);
    }
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
