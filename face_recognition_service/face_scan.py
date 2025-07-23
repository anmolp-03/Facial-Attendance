import sys
import json
import requests
import numpy as np
import cv2
import face_recognition
import os

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No image URL or path provided"}))
        return
    img_input = sys.argv[1]
    try:
        if img_input.startswith('http://') or img_input.startswith('https://'):
            resp = requests.get(img_input)
            img_array = np.asarray(bytearray(resp.content), dtype=np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        elif os.path.exists(img_input):
            img = cv2.imread(img_input)
        else:
            print(json.dumps({"success": False, "error": "Invalid image path or URL"}))
            return
        face_locations = face_recognition.face_locations(img)
        if not face_locations:
            print(json.dumps({"success": False, "error": "No face detected"}))
            return
        face_encoding = face_recognition.face_encodings(img, face_locations)[0]
        print(json.dumps({"success": True, "encoding": face_encoding.tolist()}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main() 