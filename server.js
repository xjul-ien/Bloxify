const Express = require("express");
const BodyParser = require("body-parser");
const SpotifyWebApi = require("spotify-web-api-node");
const { FFT } = require("dsp.js"); // Requiring from package.json

const app = Express();
app.use(BodyParser.json());

const spotifyApi = new SpotifyWebApi({
  clientId: "011188270465432ba262f8a90502d186",
  clientSecret: "2015a518fcd24d8b8db74d114ec9ad1a",
  redirectUri: "https://compute-bloxify-net-callback.xjulien-rodot.workers.dev",
});

// Set the refresh token
const refreshToken = "AQBGMqns3fKcvxQA6Vw4tyahrmtSMaj0dUbcm9X9eUdpJTT0K-g6cxVBdSyOc2CRKbQJxnV1oK7c1MXXsIlmVa5-6RtYTos0kSJhJEn2gcctLg7T_ZABblMFvStekFZKa-A";
spotifyApi.setRefreshToken(refreshToken);

// Refresh access token
app.post("/refresh_token", (req, res) => {
  spotifyApi.refreshAccessToken().then(
    function(data) {
      res.json({
        accessToken: data.body['access_token'],
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
          duration: data.body.item.duration_ms,
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

// Function to extract frequencies from audio data
function extractFrequencies(audioData) {
    const floatArray = new Float32Array(audioData.length / 4);
    for (let i = 0; i < floatArray.length; i++) {
        floatArray[i] = audioData.readFloatLE(i * 4);
    }

    const fft = new FFT(floatArray.length);
    fft.forward(floatArray);

    const magnitudes = fft.spectrum;
    const frequencies = magnitudes.map((mag, index) => {
        return { frequency: index * (44100 / magnitudes.length), magnitude: mag };
    }).filter(f => f.magnitude > 0);

    frequencies.sort((a, b) => b.magnitude - a.magnitude);
    return frequencies.slice(0, 10).map(f => f.frequency);
}

// Serve audio data (simulate getting playback data)
app.get("/audio-data", (req, res) => {
    const audioData = ... // Your raw audio data to be processed
    const frequencies = extractFrequencies(audioData);
    
    // Example magnitudes (replace with actual magnitude extraction)
    const magnitudes = frequencies.map(freq => Math.random());
    
    res.json({ frequencies, magnitudes });
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
