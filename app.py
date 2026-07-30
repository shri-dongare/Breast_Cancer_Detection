import os
import re
import numpy as np
import cv2
from flask import Flask, render_template, request, redirect, url_for, flash, session
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import or_
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
app = Flask(__name__)
UPLOAD_FOLDER = "static/uploads/"
MASK_FOLDER = "static/masks/"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MASK_FOLDER"] = MASK_FOLDER
app.config['SECRET_KEY'] = os.environ.get("SECRET_KEY","change-this-to-a-long-random-secret-key") # Add this for session management
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
db = SQLAlchemy(app)

# Load trained model


MODEL_PATH = os.path.join("model", "breast_cancer_model.h5")

model = None

def get_model():
    global model
    if model is None:
        model = load_model(MODEL_PATH)
    return model
# Define classes
classes = ["Benign", "Malignant", "Normal"]
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}

def allowed_file(filename):
    return (
        "." in filename and
        filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )

def valid_email(email):
    pattern = r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
    return bool(re.match(pattern, email))

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(MASK_FOLDER, exist_ok=True)


# User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    username = db.Column(db.String(80), unique=True, nullable=False)

    email = db.Column(db.String(120), unique=True, nullable=False)

    password = db.Column(db.String(255), nullable=False)

# Create all database tables
with app.app_context():
    db.create_all()

def preprocess_image(image_path):
    img = load_img(image_path, target_size=(150, 150))
    img_array = img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0) / 255.0
    return img_array

def generate_mask(image_path, filename):
    """Generate a mask image using thresholding"""
    # Create full path for mask directory if it doesn't exist
    mask_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "masks")
    os.makedirs(mask_dir, exist_ok=True)
    
    # Read image in color
    img = cv2.imread(image_path)
    if img is None:
        print(f"Failed to load image from {image_path}")
        return None
        
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Resize to match the input size
    gray = cv2.resize(gray, (150, 150))
    
    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Create a threshold mask
    _, mask = cv2.threshold(blurred, 127, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Create full path for mask file
    mask_path = os.path.join(mask_dir, f"mask_{filename}")

    
    
    # Save the mask image
    success = cv2.imwrite(mask_path, mask)
    if not success:
        print(f"Failed to save mask to {mask_path}")
        return None
    
    print(f"Mask saved successfully to {mask_path}")  # Debug print
    return f"masks/mask_{filename}"  # Return relative path for URL

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        user = User.query.filter(
    or_(
        User.username == username,
        User.email == username
    )
).first()
        
      
        if user and check_password_hash(user.password, password):
            session['username'] = user.username
            flash('Logged in successfully!', 'success')
            return redirect(url_for('index'))
        else:
            flash('Invalid username or password', 'error')
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':

        username = request.form['username'].strip()
        email = request.form['email'].strip().lower()
        password = request.form['password']
        confirm_password = request.form['confirm_password']

        if not username or not email or not password or not confirm_password: 
            flash("All fields are required.", "error")
            return redirect(url_for("register"))
        
        if not valid_email(email):
            flash("Invalid email format.", "error")
            return redirect(url_for("register"))

        # Username already exists
        if User.query.filter_by(username=username).first():
            flash('Username already exists.', 'error')
            return redirect(url_for('register'))

        # Email already exists
        if User.query.filter_by(email=email).first():
            flash('Email already registered.', 'error')
            return redirect(url_for('register'))

        # Passwords don't match
        if password != confirm_password:
            flash('Passwords do not match.', 'error')
            return redirect(url_for('register'))
            
        if len(password) < 8:
            flash("Password must be at least 8 characters long.", "error")
            return redirect(url_for("register"))

        hashed_password = generate_password_hash(password)
        
        

        new_user = User(
            username=username,
            email=email,
            password=hashed_password
        )

        db.session.add(new_user)
        db.session.commit()

        flash('Registration successful! Please login.', 'success')
        return redirect(url_for('login'))

    return render_template('register.html')

# Protect routes that require login
def login_required(route_function):
    @wraps(route_function)
    def wrapper(*args, **kwargs):
        if 'username' not in session:
            flash('Please login first', 'error')
            return redirect(url_for('login'))
        return route_function(*args, **kwargs)

    return wrapper

@app.route('/logout')
@login_required
def logout():
    session.pop('username', None)
    flash('Logged out successfully!', 'success')
    return redirect(url_for('login'))



@app.route("/terms")
@login_required
def terms():
    return render_template("terms.html")




@app.route("/privacy")
@login_required
def privacy():
    return render_template("privacy.html")


@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/contact")
@login_required
def contact():
    return render_template("contact.html")


@app.route("/home")
def home():
    return redirect(url_for("index"))



@app.route("/", methods=["GET", "POST"])
@login_required
def index():
    if request.method == "POST":
        if "file" not in request.files:
            return redirect(request.url)
        
        file = request.files["file"]
        if file.filename == "":
            flash("Please select an image.", "error")
            return redirect(request.url)
        if not allowed_file(file.filename):
            flash("Only PNG, JPG and JPEG images are allowed.", "error")
            return redirect(request.url)
        
        if file:
            # Ensure filename is secure
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
            file.save(filepath)

            # Generate mask before preprocessing
            mask_path = generate_mask(filepath, filename)
            if mask_path is None:
                return "Error processing image", 400

            # Preprocess and predict
            img_array = preprocess_image(filepath)
            predictions = get_model().predict(img_array)
            predicted_class = classes[np.argmax(predictions)]
            confidence = np.max(predictions) * 100

            return render_template("index.html", 
                                uploaded_image=url_for("static", filename=f"uploads/{filename}"),
                                mask_image=url_for("static", filename=f"masks/mask_{filename}"),
                                prediction=predicted_class, 
                                confidence=confidence)

    return render_template("index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
