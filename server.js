const Express = require("express");
const BodyParser = require("body-parser");
const YouTubeMusic = require("youtube-music-node");
const { FFT } = require("dsp.js");
const ytdl = require("ytdl-core");
const fs = require("fs");
const path = require("path");
const mm = require("music-metadata");
const Lame = require("lame");

const app = Express();
app.use(BodyParser.json());

// Initialize YouTube Music API client
const youTubeMusic = new YouTubeMusic();

// Endpoint to get music details and download audio
app.post("/get-audio-data", async (req, res) => {
    const songTitle = req.body.title;

    try {
        // 1. Get music details using YouTube Music API
        const songDetails = await youTubeMusic.search(songTitle, { type: 'song' });
        const videoId = songDetails.videos[0].id;

        // 2. Download the video as MP3
        const audioFilePath = path.join(__dirname, `${videoId}.mp3`);
        const audioStream = ytdl(videoId, { filter: format => format.audioBitrate > 0 });
        audioStream.pipe(fs.createWriteStream(audioFilePath));

        audioStream.on('end', async () => {
            // 3. Decode the audio data
            try {
                const audioData = await decodeAudioFile(audioFilePath);
                const frequencies = extractFrequencies(audioData);

                // 4. Send frequencies to Roblox server script
                res.json({ frequencies });
            } catch (error) {
                console.error("Error decoding audio: ", error);
                res.status(500).json({ error: "Failed to decode audio" });
            }
        });

        audioStream.on('error', (error) => {
            console.error("Error downloading audio: ", error);
            res.status(500).json({ error: "Failed to download audio" });
        });
    } catch (error) {
        console.error("Error fetching music details: ", error);
        res.status(500).json({ error: "Failed to fetch music details" });
    }
});

// Function to decode audio file
async function decodeAudioFile(filePath) {
    return new Promise((resolve, reject) => {
        // Create a readable stream from the MP3 file
        const readStream = fs.createReadStream(filePath);
        const decoder = new Lame.Decoder();

        // Use music-metadata to get audio metadata (for sample rate, etc.)
        mm.parseFile(filePath).then(metadata => {
            const sampleRate = metadata.format.sampleRate;

            // Collect decoded samples
            const samples = [];
            decoder.on('data', (chunk) => {
                // Push the decoded samples into an array
                samples.push(chunk);
            });

            decoder.on('end', () => {
                // Concatenate the samples into a single buffer
                const audioBuffer = Buffer.concat(samples);
                resolve(audioBuffer);
            });

            decoder.on('error', (error) => {
                reject(error);
            });

            // Pipe the read stream to the decoder
            readStream.pipe(decoder);
        }).catch(reject);
    });
}

// Function to extract frequencies from raw audio data
function extractFrequencies(audioData) {
    const floatArray = new Float32Array(audioData.length / 2);
    for (let i = 0; i < floatArray.length; i++) {
        floatArray[i] = audioData.readInt16LE(i * 2) / 32768; // Normalize to -1 to 1
    }

    // Perform FFT using dsp.js
    const fft = new FFT(floatArray.length);
    fft.forward(floatArray);

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
