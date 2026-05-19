"""
Exercise Analysis Adapter — FastAPI WebSocket Server
Receives base64 JPEG frames from the frontend and streams back
JSON with angle, rep_count, error, and annotated frame.
"""

import cv2
import json
import base64
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from warrior_analyzer import WarriorAnalyzer
from squat import SquatAnalyzer
from lunges_vision import LungeAnalyzer
from hand_bend import HandBendAnalyzer

app = FastAPI(title="revivAl Exercise Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ANALYZERS = {
    'warrior': WarriorAnalyzer,
    'squats': SquatAnalyzer,
    'lunges': LungeAnalyzer,
    'hand_bend': HandBendAnalyzer,
}


@app.get("/")
def health():
    return {"status": "ok", "message": "revivAl Exercise Engine is running"}


@app.websocket("/ws/{exercise_id}")
async def exercise_websocket(websocket: WebSocket, exercise_id: str):
    await websocket.accept()

    if exercise_id not in ANALYZERS:
        await websocket.send_text(json.dumps({"error": f"Unknown exercise: {exercise_id}"}))
        await websocket.close()
        return

    analyzer = ANALYZERS[exercise_id]()

    try:
        while True:
            # Receive base64 JPEG data URL from frontend
            data = await websocket.receive_text()

            # Strip data URL header (e.g. "data:image/jpeg;base64,...")
            if "," in data:
                data = data.split(",", 1)[1]

            # Decode to OpenCV frame
            img_bytes = base64.b64decode(data)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if frame is None:
                await websocket.send_text(json.dumps({"error": "Invalid frame received"}))
                continue

            # Run exercise analysis
            result = analyzer.process_video(frame)

            # Encode annotated frame back to base64
            output_frame = result.get("frame", frame)
            _, buffer = cv2.imencode('.jpg', output_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            frame_b64 = base64.b64encode(buffer).decode('utf-8')

            # Send result matching the frontend's expected schema
            response = {
                "rep_count": result.get("rep_count", 0),
                "angle": result.get("angle", 0),
                "score": result.get("score", 0),
                "error": result.get("error_text", ""),
                "stage": result.get("stage", ""),
                "frame": frame_b64,
            }
            await websocket.send_text(json.dumps(response))

    except WebSocketDisconnect:
        pass
