const express = require("express");
const bodyParser = require("body-parser");
const SpotifyWebApi = require("spotify-web-api-node");

const app = express();
app.use(bodyParser.json());

const spotifyApi = new SpotifyWebApi({
  clientId: "011188270465432ba262f8a90502d186",
  clientSecret: "2015a518fcd24d8b8db74d114ec9ad1a",
  redirectUri: "https://compute-bloxify-net-callback.xjulien-rodot.workers.dev"
});

// Refresh access token
app.post("/refresh_token", (req, res) => {
  const { refreshToken } = req.body;
  spotifyApi.setRefreshToken(refreshToken);
  spotifyApi.refreshAccessToken().then(
    function(data) {
      res.json({
        accessToken: data.body['access_token']
      });
    },
    function(err) {
      console.log("Could not refresh access token", err);
      res.status(500).json({ error: "Failed to refresh token" });
    }
  );
});

// Get currently playing track data
app.get("/currently-playing", (req, res) => {
  const accessToken = req.headers['authorization'].split(" ")[1];
  spotifyApi.setAccessToken(accessToken);

  spotifyApi.getMyCurrentPlaybackState().then(
    function(data) {
      if (data.body && data.body.is_playing) {
        res.json({
          song: data.body.item,
          progress: data.body.progress_ms,
          duration: data.body.item.duration_ms
        });
      } else {
        res.status(204).send(); // No content, nothing is playing
      }
    },
    function(err) {
      console.log("Something went wrong!", err);
      res.status(500).json({ error: "Failed to fetch currently playing track" });
    }
  );
});

// Serve audio data (simulate getting playback data)
app.get("/audio-data", (req, res) => {
  // Simulate retrieving and sending audio data as frequencies
  const frequencies = [200, 400, 600, 800, 1000]; // Example frequency data
  res.json({ frequencies });
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
