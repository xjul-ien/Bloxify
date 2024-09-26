const express = require("express");
const bodyParser = require("body-parser");
const SpotifyWebApi = require("spotify-web-api-node");
const { exec } = require("child_process");
const fft = require("fft-js").fft;
const fftUtil = require("fft-js").util;

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

// Serve audio data as frequencies
app.get("/audio-data", async (req, res) => {
  const accessToken = req.headers['authorization'].split(" ")[1];
  spotifyApi.setAccessToken(accessToken);

  // Get the current track's stream URL
  const currentTrackData = await spotifyApi.getMyCurrentPlaybackState();
  const trackUri = currentTrackData.body.item.uri; // Get the URI of the currently playing track

  // Use ffmpeg to process the audio
  const command = `ffmpeg -i "${trackUri}" -f f32le -ar 44100 -ac 1 pipe:1`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing ffmpeg: ${error.message}`);
      return res.status(500).json({ error: "Failed to process audio" });
    }
    
    // Process raw audio data to extract frequencies here
    const frequencies = extractFrequencies(stdout); // Process the output to extract frequencies

    res.json({ frequencies });
  });
});

// Function to extract frequencies from raw audio data
function extractFrequencies(audioData) {
  // Convert the raw audio data into a Float32Array
  const floatArray = new Float32Array(audioData.length / 4);
  for (let i = 0; i < floatArray.length; i++) {
    floatArray[i] = audioData.readFloatLE(i * 4); // Convert buffer to Float32
  }

  // Perform FFT
  const phasors = fft(floatArray);
  const magnitudes = fftUtil.fftMag(phasors);
  
  // Map frequency bins to more meaningful frequency values
  const sampleRate = 44100;
  const binSize = sampleRate / magnitudes.length;
  const frequencyData = magnitudes.map((mag, index) => {
    return { frequency: index * binSize, magnitude: mag };
  }).filter(f => f.magnitude > 0); // Filter out zero magnitudes

  // Return only the top N frequencies (e.g., top 10)
  frequencyData.sort((a, b) => b.magnitude - a.magnitude); // Sort by magnitude
  return frequencyData.slice(0, 10).map(f => f.frequency); // Return the frequencies
}

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
