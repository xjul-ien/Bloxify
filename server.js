const Express = require("express");
const BodyParser = require("body-parser");
const SpotifyWebApi = require("spotify-web-api-node");
const { FFT } = require("dsp.js"); // Now requiring from the package.json

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

// Serve audio data (simulate getting playback data)
app.get("/audio-data", (req, res) => {
  // Simulate retrieving and sending audio data as raw PCM data
  // Example: Generate dummy audio data for frequency extraction
  const audioBufferLength = 44100; // 1 second of audio at 44100Hz
  const audioData = Buffer.alloc(audioBufferLength * 4); // 32-bit float

  // Fill the buffer with some example audio data (e.g., a sine wave)
  for (let i = 0; i < audioBufferLength; i++) {
    const value = Math.sin((i / audioBufferLength) * Math.PI * 2 * 440); // 440Hz sine wave
    audioData.writeFloatLE(value, i * 4);
  }

  // Extract frequencies from the simulated audio data
  const frequencies = extractFrequencies(audioData);

  res.json({ frequencies });
});

// Function to extract frequency data from raw audio data
function extractFrequencies(audioData) {
  const floatArray = new Float32Array(audioData.length / 4);
  for (let i = 0; i < floatArray.length; i++) {
    floatArray[i] = audioData.readFloatLE(i * 4);
  }

  // Perform FFT using dsp.js
  const fft = new FFT(floatArray.length);
  fft.forward(floatArray);

  // Get magnitudes and corresponding frequencies
  const magnitudes = fft.spectrum; // This gives us the magnitude of each frequency bin
  const frequencies = magnitudes.map((mag, index) => {
    return { frequency: index * (44100 / magnitudes.length), magnitude: mag }; // Adjust this according to your sample rate
  }).filter(f => f.magnitude > 0);

  frequencies.sort((a, b) => b.magnitude - a.magnitude);
  return frequencies.slice(0, 10).map(f => f.frequency); // Return the top 10 frequencies
}

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
