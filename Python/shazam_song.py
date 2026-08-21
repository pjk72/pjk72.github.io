import requests
import sys

# This script tests the 'Shazam Song Recognizer' API (shazam-song-recognizer.p.rapidapi.com).
# We're using a slightly smaller chunk (200KB) and a longer timeout (60s) to avoid read timeouts.

def test_shazam_song_recognizer(audio_url=None):
    if not audio_url:
        audio_url = "https://raw.githubusercontent.com/rafaelreis-hotmart/Audio-Sample-files/master/sample.wav"
    
    print(f"--- Shazam Song Recognizer Test ---")
    print(f"Target URL: {audio_url}")
    
    try:
        # 1. Download audio
        print("Downloading audio...")
        response = requests.get(audio_url, timeout=15)
        response.raise_for_status()
        audio_data = response.content
        print(f"Downloaded {len(audio_data)} bytes.")

        # 2. Extract a 200KB chunk (smaller to reduce processing time)
        chunk_size = 200 * 1024
        audio_chunk = audio_data[:chunk_size]

        # 3. Prepare Request
        api_url = "https://shazam-song-recognizer.p.rapidapi.com/recognize"
        api_key = "65c517cd98mshd509565706f012ep1e49f3jsne80c01e37828"
        
        headers = {
            'x-rapidapi-key': api_key,
            'x-rapidapi-host': "shazam-song-recognizer.p.rapidapi.com"
        }

        # 4. Send POST request with multipart/form-data
        print(f"Sending POST request to {api_url} (Chunk size: {len(audio_chunk)} bytes)...")
        files = {
            'upload_file': ('sample.wav', audio_chunk, 'audio/wav')
        }
        
        # Using a longer timeout as this API seems slow
        api_response = requests.post(api_url, files=files, headers=headers, timeout=60)
        
        print(f"Status: {api_response.status_code} {api_response.reason}")
        print("Response Body:")
        print(api_response.text)
        
        if api_response.status_code == 200:
            print("\nSUCCESS: API accepted the request!")
        else:
            print(f"\nFAILURE: API returned {api_response.status_code}")

    except Exception as e:
        print(f"\nLOCAL ERROR: {str(e)}")

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else None
    test_shazam_song_recognizer(url)
