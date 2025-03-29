from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# Configure database - use environment variable for production
database_url = os.environ.get('DATABASE_URL', 'sqlite:///inventory.db')
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Simple model for testing
class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    barcode = db.Column(db.String(50), unique=True)
    price = db.Column(db.Float, default=0.0)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'barcode': self.barcode,
            'price': self.price
        }

# Initialize database
with app.app_context():
    db.create_all()

# Add sample item if none exist
@app.before_request
def check_database():
    if not hasattr(check_database, 'initialized'):
        with app.app_context():
            if Item.query.count() == 0:
                sample = Item(name="Sample Product", barcode="12345", price=9.99)
                db.session.add(sample)
                db.session.commit()
        check_database.initialized = True

@app.route('/')
def home():
    return "Hello from Store API!"

@app.route('/api/inventory')
def get_inventory():
    try:
        items = Item.query.all()
        return jsonify([item.to_dict() for item in items])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)