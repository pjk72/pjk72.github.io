import requests
import sys

# This script tests the 'Shazam Song Recognizer' API (shazam-api7.p.rapidapi.com).
# Based on the implementation plan, it uses 'multipart/form-data' with the 'upload_file' parameter.
# It sends a 500KB chunk of audio data for recognition.

def test_shazam_api7(audio_url=None):
    if not audio_url:
        audio_url = "https://raw.githubusercontent.com/rafaelreis-hotmart/Audio-Sample-files/master/sample.wav"
    
    print(f"--- Shazam API7 Test (Multipart/Form-Data) ---")
    print(f"Target URL: {audio_url}")
    
    try:
        # 1. Download audio
        print("Downloading audio...")
        response = requests.get(audio_url, timeout=15)
        response.raise_for_status()
        audio_data = response.content
        print(f"Downloaded {len(audio_data)} bytes.")

        # 2. Extract a 500KB chunk as per objective
        chunk_size = 500 * 1024
        audio_chunk = audio_data[:chunk_size]

        # 3. Prepare Request
        api_url = "https://shazam-api7.p.rapidapi.com/songs/recognize-song"
        api_key = "65c517cd98mshd509565706f012ep1e49f3jsne80c01e37828"
        
        headers = {
            'x-rapidapi-key': api_key,
            'x-rapidapi-host': "shazam-api7.p.rapidapi.com"
            # 'Content-Type' will be set to 'multipart/form-data' automatically by requests when using 'files'
        }

        # 4. Send POST request with multipart/form-data
        # We use the parameter name 'upload_file' as mentioned in the objective history
        print(f"Sending POST request to {api_url} using 'upload_file'...")
        files = {
            'upload_file': ('sample.wav', audio_chunk, 'audio/wav')
        }
        
        api_response = requests.post(api_url, files=files, headers=headers, timeout=30)
        
        print(f"Status: {api_response.status_code} {api_response.reason}")
        print("Response Body:")
        print(api_response.text)
        
        if api_response.status_code == 200:
            print("\nSUCCESS: API accepted the request!")
        else:
            # If upload_file fails, try 'audio' as a fallback parameter name
            print("\nRetrying with 'audio' parameter name...")
            files = {
                'audio': ('sample.wav', audio_chunk, 'audio/wav')
            }
            api_response = requests.post(api_url, files=files, headers=headers, timeout=30)
            print(f"Status: {api_response.status_code} {api_response.reason}")
            print("Response Body:")
            print(api_response.text)

    except Exception as e:
        print(f"\nLOCAL ERROR: {str(e)}")

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else None
    test_shazam_api7(url)