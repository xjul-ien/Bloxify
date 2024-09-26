const express = require("express");
const bodyParser = require("body-parser");
const SpotifyWebApi = require("spotify-web-api-node");
const fetch = require("node-fetch"); // Ensure to install this package
const { AudioContext } = require("audio-context");

const app = express();
app.use(bodyParser.json());

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
    function (data) {
      res.json({
        accessToken: data.body["access_token"],
      });
    },
    function (err) {
      console.log("Could not refresh access token", err);
      res.status(500).json({ error: "Failed to refresh token" });
    }
  );
});

// Get currently playing track data and frequencies
app.get("/currently-playing", async (req, res) => {
  const accessToken = req.headers["authorization"].split(" ")[1];
  spotifyApi.setAccessToken(accessToken);

  try {
    const data = await spotifyApi.getMyCurrentPlaybackState();
    if (data.body && data.body.is_playing) {
      const audioUrl = data.body.item.preview_url; // Get preview URL
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();

      // Create an audio context and decode the audio data
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Analyze the audio buffer to extract frequencies
      const frequencies = getFrequenciesFromAudioBuffer(audioBuffer, audioContext);

      res.json({
        song: data.body.item,
        progress: data.body.progress_ms,
        duration: data.body.item.duration_ms,
        frequencies,
      });
    } else {
      res.status(204).send(); // No content, nothing is playing
    }
  } catch (err) {
    console.error("Error fetching currently playing track", err);
    res.status(500).json({ error: "Failed to fetch currently playing track" });
  }
});

// Function to get frequencies from an AudioBuffer
function getFrequenciesFromAudioBuffer(audioBuffer, audioContext) {
  // Create an AnalyserNode to analyze the audio data
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createBufferSource();

  source.buffer = audioBuffer;
  source.connect(analyser);
  analyser.connect(audioContext.destination); // Connect to output (speakers)

  analyser.fftSize = 2048; // Set FFT size
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength); // Array to hold frequency data

  // Start the playback
  source.start();

  // Get frequency data after a short delay
  source.onended = () => {
    analyser.getByteFrequencyData(dataArray); // Get the frequency data
  };

  // Extract frequencies as an array
  const frequencies = [];
  for (let i = 0; i < bufferLength; i++) {
    frequencies.push(dataArray[i]);
  }

  return frequencies;
}

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
