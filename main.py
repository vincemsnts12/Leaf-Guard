import cv2
from inference import get_model

API_KEY = "SFX50ETz7X3tdn1xroB7"
MODEL_FILTER_ID = "potato_leaf_classification-6j6tg/4"
MODEL_DISEASE_ID = "leafguard-potato-disease-vkhik/1"

print("\nLoading Models...\n")

try:
    filter_model = get_model(model_id=MODEL_FILTER_ID, api_key=API_KEY)
    disease_model = get_model(model_id=MODEL_DISEASE_ID, api_key=API_KEY)
    print("\nModels loaded successfully.")
except Exception as e:
    print(f"Error loading models: {e}")
    exit()

def process_potato_leaf(image_path):
    print(f"\nProcessing: {image_path}...")
    
    image = cv2.imread(image_path)
    
    if image is None:
        print("Error: Could not load image.")
        return

    filter_results = filter_model.infer(image)
    
    try:
        top_pred = filter_results[0].predictions[0]
        class_name = top_pred.class_name
        confidence = top_pred.confidence
    except IndexError:
        print("Result: No object detected.")
        return "Rejected"

    print(f"Potato Leaf Validation Result: {class_name} ({confidence * 100:.2f}%)")

    if class_name == "Potato_Leaf" and confidence > 0.75:
        print("\nStatus: Valid Potato Leaf. \nProceeding to Disease Analysis...")
        
        disease_results = disease_model.infer(image)
        
        if disease_results[0].predictions:
            disease_pred = disease_results[0].predictions[0]
            dis_name = disease_pred.class_name
            dis_conf = disease_pred.confidence
            
            print(f"\nFINAL DIAGNOSIS: {dis_name} ({dis_conf * 100:.2f}%)")
            return dis_name
        else:
            print("Result: Leaf detected, but disease pattern is unclear. Input other picture")
            return "Unknown"
        
    else:
        print("Status: REJECTED. Not a valid potato leaf.")
        return "Rejected"

process_potato_leaf("test_img/pot.jpg")