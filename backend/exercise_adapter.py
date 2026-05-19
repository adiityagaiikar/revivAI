"""
Exercise Analysis Adapter
Wraps main.py functionality for WebSocket integration
Outputs JSON data for real-time streaming to frontend
"""

import cv2
import sys
import json
import os
import argparse
import base64

# Add parent directory to path to import analyzers
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))

try:
    from warrior_analyzer import WarriorAnalyzer
    from squat import SquatAnalyzer
    from lunges_vision import LungeAnalyzer
    from hand_bend import HandBendAnalyzer
except ImportError as e:
    print(f"Analyzer import error: {e}", file=sys.stderr)
    sys.exit(1)

ANALYZERS = {
    'warrior': ('Warrior Pose', WarriorAnalyzer),
    'squats': ('Squats', SquatAnalyzer),
    'lunges': ('Lunges', LungeAnalyzer),
    'hand_bend': ('Hand Bend', HandBendAnalyzer),
}

def run_exercise(exercise_id):
    """Run exercise analysis and output JSON data"""
    
    if exercise_id not in ANALYZERS:
        print(json.dumps({"error": f"Unknown exercise: {exercise_id}"}), flush=True)
        return
    
    name, AnalyzerClass = ANALYZERS[exercise_id]
    analyzer = AnalyzerClass()
    
    cap = cv2.VideoCapture(0)
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        # Process frame through analyzer
        result = analyzer.process_video(frame)
        
        _, buffer = cv2.imencode('.jpg', result.get("frame", frame))
        frame_base64 = base64.b64encode(buffer).decode('utf-8')

        # Output JSON data for WebSocket
        output = {
            "angle": result.get('angle', 0),
            "reps": result.get('rep_count', 0),
            "score": result.get('score', 0),
            "error": result.get('error_text', ''),
            "stage": result.get('stage', ''),
            "frame": frame_base64
        }
        print(json.dumps(output), flush=True)
    
    cap.release()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--exercise', type=str, required=True, help='Exercise ID')
    args = parser.parse_args()
    
    run_exercise(args.exercise)
