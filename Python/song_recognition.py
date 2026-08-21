import requests
import sys

def recognize_song(audio_file_path=None, audio_url=None):
    url = "https://shazam-music-recognition1.p.rapidapi.com/api/recognize"

    headers = {
        "x-rapidapi-host": "shazam-music-recognition1.p.rapidapi.com",
        "x-rapidapi-key": "937107fc2fmsh3f14e2e149d183cp1a7b28jsn5745ab269835"
    }
    
    if audio_url:
        print(f"Downloading audio from {audio_url}...")
        response = requests.get(audio_url)
        response.raise_for_status()
        audio_data = response.content
        filename = "sample.mp3"
    elif audio_file_path:
        print(f"Reading audio from {audio_file_path}...")
        with open(audio_file_path, "rb") as f:
            audio_data = f.read()
        filename = audio_file_path
    else:
        print("Please provide either audio_file_path or audio_url")
        return

    print("Sending request to Shazam API...")
    files = {
        "audio": (filename, audio_data, "audio/mpeg")
    }

    response = requests.post(url, headers=headers, files=files)

    if response.status_code == 200:
        result = response.json()
        print("Recognition Result:")
        if "track" in result:
            track = result["track"]
            print(f"Title: {track.get('title')}")
            print(f"Artist: {track.get('subtitle')}")
        else:
            print(result)
            print("No track found in the response.")
    else:
        print(f"Error {response.status_code}: {response.text}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        recognize_song(audio_file_path=sys.argv[1])
    else:
        # Default test using a known mp3 url
        sample_url = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        recognize_song(audio_url=sample_url)
