import cv2
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from inference import get_model

# --- 1. CONFIGURATION ---
API_KEY = "SFX50ETz7X3tdn1xroB7" 
MODEL_FILTER_ID = "potato_leaf_classification-6j6tg/4" 
MODEL_DISEASE_ID = "leafguard-potato-disease-vkhik/1" 

# --- 2. MODEL LOADING ---
print("\nLoading Models...")
try:
    filter_model = get_model(model_id=MODEL_FILTER_ID, api_key=API_KEY)
    disease_model = get_model(model_id=MODEL_DISEASE_ID, api_key=API_KEY)
    # Pinalitan ang emoji ng simpleng text para iwas error sa Windows terminal
    print("[SUCCESS] Models loaded successfully.")
except Exception as e:
    print(f"[ERROR] Error loading models: {e}")
    exit()

app = Flask(__name__)
CORS(app)

@app.route('/analyze', methods=['POST'])
def analyze_image():
    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"status": "error", "message": "No selected file"}), 400
    
    try:
        filestream = file.read()
        np_img = np.frombuffer(filestream, np.uint8)
        image = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
        if image is None: return jsonify({"status": "error", "message": "Decode error"}), 500
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

    print(f"\n--- Processing {file.filename} ---")
    
    # --- MODEL 1: VALIDATION ---
    filter_results = filter_model.infer(image)
    try:
        top_pred = filter_results[0].predictions[0]
        class_name = top_pred.class_name
        confidence = top_pred.confidence
    except IndexError:
        return jsonify({"status": "Rejected", "message": "No leaf detected."})

    # Validation Logic (Threshold 75%)
    if class_name == "Potato_Leaf" and confidence > 0.75:
        
        # --- MODEL 2: DISEASE CLASSIFICATION ---
        disease_results = disease_model.infer(image)
        
        # Check if predictions exist
        if disease_results[0].predictions:
            # Kukuha tayo ng Top 1 result para sa classification
            top_disease = disease_results[0].predictions[0]
            
            predictions_list = [{
                "disease": top_disease.class_name,
                "confidence": top_disease.confidence, # Keep as float for frontend calculation
                "confidence_str": f"{top_disease.confidence * 100:.2f}%"
            }]

            return jsonify({
                "status": "Success",
                "validation": "Potato Leaf",
                "diagnosis": predictions_list
            })
        else:
            return jsonify({
                "status": "Success", 
                "validation": "Potato Leaf",
                "diagnosis": "Healthy",
                "message": "Leaf is valid but no disease class returned."
            })
        
    else:
        return jsonify({
            "status": "Rejected", 
            "message": "Image rejected: Not a valid potato leaf or low confidence."
        })
 
if __name__ == '__main__':
    app.run(debug=True, port=5000)