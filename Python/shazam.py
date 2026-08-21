import http.client
import base64
import requests
import sys

# This script tests the Shazam V3 Detect API on RapidAPI.
# It downloads a sample audio, takes a chunk, and sends it as a Base64 string.
# Note: The /songs/v3/detect endpoint usually expects raw PCM (mono, 44100Hz or similar).
# If sending MP3/WAV bytes doesn't work, you might see "Signature duration invalid".

def test_shazam_v3(audio_url=None):
    # Default test audio (a short WAV file might work better than MP3 for raw detection)
    if not audio_url:
        audio_url = "https://raw.githubusercontent.com/rafaelreis-hotmart/Audio-Sample-files/master/sample.wav"
    
    print(f"--- Shazam V3 Test ---")
    print(f"Target URL: {audio_url}")
    
    try:
        # 1. Download audio
        print("Downloading audio...")
        response = requests.get(audio_url, timeout=15)
        response.raise_for_status()
        audio_data = response.content
        print(f"Downloaded {len(audio_data)} bytes.")

        # 2. Extract a chunk
        # Shazam V3 usually needs about 3-5 seconds of audio.
        # For a 44100Hz 16-bit mono PCM, 5 seconds is ~441KB.
        # We'll take a 500KB chunk.
        chunk_size = 500 * 1024
        audio_chunk = audio_data[:chunk_size]
        
        # If it's a WAV file, we should ideally strip the 44-byte header to get raw PCM.
        if audio_url.lower().endswith(".wav") and len(audio_chunk) > 44:
            print("Detected WAV file, stripping 44-byte header...")
            audio_chunk = audio_chunk[44:]

        # 3. Base64 Encode
        print(f"Encoding {len(audio_chunk)} bytes to Base64...")
        payload = base64.b64encode(audio_chunk).decode('utf-8')

        # 4. Prepare Request
        # We use the key found in the original shazam.py
        api_key = "65c517cd98mshd509565706f012ep1e49f3jsne80c01e37828"
        host = "shazam.p.rapidapi.com"
        
        headers = {
            'x-rapidapi-key': api_key,
            'x-rapidapi-host': host,
            'Content-Type': "text/plain"
        }

        print(f"Sending POST request to {host}/songs/v3/detect...")
        conn = http.client.HTTPSConnection(host)
        conn.request("POST", "/songs/v3/detect?timezone=America%2FChicago&locale=en-US", payload, headers)
        
        # 5. Get Response
        res = conn.getresponse()
        data = res.read().decode("utf-8")
        
        print(f"Status: {res.status} {res.reason}")
        print("Response Body:")
        print(data)
        
        if "matches" in data and "[]" not in data:
            print("\nSUCCESS: Song recognized!")
        elif "exceptions" in data:
            print("\nAPI ERROR: Check the 'exceptions' field in the response.")
        else:
            print("\nINFO: No match found or unexpected response format.")

    except Exception as e:
        print(f"\nLOCAL ERROR: {str(e)}")

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else None
    test_shazam_v3(url)