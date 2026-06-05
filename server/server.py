"""
SmartSpeech Status Server + Media Server
=========================================
Ilovaning ishlash holatini boshqaradi va video/soundtrack fayllarni tarqatadi.

Endpointlar:
  GET  /status              — hozirgi statusni qaytaradi
  POST /status/on           — statusni yoqadi
  POST /status/off          — statusni o'chiradi
  GET  /media/videos/<name> — video faylni qaytaradi
  GET  /media/soundtracks/<name> — soundtrack faylni qaytaradi
  GET  /media/list           — mavjud media fayllar ro'yxati

Ishga tushirish:
  python server.py

MEDIA_DIR: videolar va soundtracklar joylashgan papka.
Bu papka ichida 'videos/' va 'soundtracks/' bo'lishi kerak.
"""

from flask import Flask, jsonify, send_from_directory, abort
import json
import os
import urllib.parse

app = Flask(__name__)

# Media papkasi — server papkasi ichidagi 'media/' ga ishora qiladi.
# Deploy qilganda: server/media/videos/ va server/media/soundtracks/ ichiga
# video/soundtrack fayllarni ko'chirib qo'ying.
SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
MEDIA_DIR = os.path.join(SERVER_DIR, 'media')
STATUS_FILE = os.path.join(SERVER_DIR, 'status.json')

# CORS
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Range'
    response.headers['Access-Control-Expose-Headers'] = 'Content-Length, Content-Range'
    return response

# ── Status boshqaruvi ─────────────────────────────────────────

def read_status() -> bool:
    try:
        with open(STATUS_FILE, 'r') as f:
            data = json.load(f)
            return data.get('status', True)
    except (FileNotFoundError, json.JSONDecodeError):
        return True

def write_status(status: bool):
    with open(STATUS_FILE, 'w') as f:
        json.dump({'status': status}, f, indent=2)

@app.route('/status', methods=['GET'])
def get_status():
    return jsonify({'status': read_status()})

@app.route('/status/on', methods=['POST'])
def set_status_on():
    write_status(True)
    return jsonify({'status': True, 'message': 'Ilova yoqildi ✅'})

@app.route('/status/off', methods=['POST'])
def set_status_off():
    write_status(False)
    return jsonify({'status': False, 'message': "Ilova o'chirildi ❌"})

# ── Media fayllarni tarqatish ─────────────────────────────────

@app.route('/media/videos/<path:filename>', methods=['GET'])
def serve_video(filename):
    """Video faylni qaytaradi (alphabet/ ichidagi fayllar ham qo'llab-quvvatlanadi)."""
    video_dir = os.path.join(MEDIA_DIR, 'videos')
    # URL-encoded nom bo'lishi mumkin
    decoded = urllib.parse.unquote(filename)
    filepath = os.path.join(video_dir, decoded)
    if not os.path.isfile(filepath):
        abort(404)
    # Papka va fayl nomini ajratib, send_from_directory ga berish
    directory = os.path.dirname(filepath)
    basename = os.path.basename(filepath)
    return send_from_directory(directory, basename)

@app.route('/media/soundtracks/<path:filename>', methods=['GET'])
def serve_soundtrack(filename):
    """Soundtrack faylni qaytaradi."""
    st_dir = os.path.join(MEDIA_DIR, 'soundtracks')
    decoded = urllib.parse.unquote(filename)
    filepath = os.path.join(st_dir, decoded)
    if not os.path.isfile(filepath):
        abort(404)
    directory = os.path.dirname(filepath)
    basename = os.path.basename(filepath)
    return send_from_directory(directory, basename)

@app.route('/media/list', methods=['GET'])
def list_media():
    """Mavjud barcha media fayllar ro'yxati."""
    videos = []
    soundtracks = []
    
    video_dir = os.path.join(MEDIA_DIR, 'videos')
    if os.path.isdir(video_dir):
        for root, dirs, files in os.walk(video_dir):
            for f in files:
                if f.endswith('.mp4'):
                    relpath = os.path.relpath(os.path.join(root, f), video_dir)
                    videos.append(relpath)
    
    st_dir = os.path.join(MEDIA_DIR, 'soundtracks')
    if os.path.isdir(st_dir):
        for f in os.listdir(st_dir):
            if f.endswith('.mp4'):
                soundtracks.append(f)
    
    return jsonify({
        'videos': sorted(videos),
        'soundtracks': sorted(soundtracks),
    })

# ── Bosh sahifa ───────────────────────────────────────────────

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'server': 'SmartSpeech Media + Status Server',
        'version': '2.0.0',
        'app_status': read_status(),
        'endpoints': {
            'GET /status': 'Statusni olish',
            'POST /status/on': 'Ilovani yoqish',
            'POST /status/off': "Ilovani o'chirish",
            'GET /media/videos/<name>': 'Video yuklab olish',
            'GET /media/soundtracks/<name>': 'Soundtrack yuklab olish',
            'GET /media/list': 'Mavjud fayllar ro\'yxati',
        }
    })

if __name__ == '__main__':
    if not os.path.exists(STATUS_FILE):
        write_status(True)
    
    print("🚀 SmartSpeech Server v2.0 ishga tushdi!")
    print(f"📁 Media papkasi: {os.path.abspath(MEDIA_DIR)}")
    print(f"🌐 http://0.0.0.0:4999")
    
    app.run(host='0.0.0.0', port=4999, debug=True)

