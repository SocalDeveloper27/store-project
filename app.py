from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure SQLite database - use environment variable for production
database_url = os.environ.get('DATABASE_URL', 'sqlite:///inventory.db')
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Define the Inventory model
class InventoryItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    barcode = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    price = db.Column(db.Float, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'barcode': self.barcode,
            'name': self.name,
            'quantity': self.quantity,
            'description': self.description,
            'price': self.price
        }

# Initialize the database
with app.app_context():
    db.create_all()
    
    # Add sample data if the database is empty
    if not InventoryItem.query.first():
        sample_items = [
            InventoryItem(barcode="12345", name="Sample Item 1", quantity=10, description="A sample item", price=9.99),
            InventoryItem(barcode="67890", name="Sample Item 2", quantity=5, description="Another sample item", price=14.99)
        ]
        db.session.bulk_save_objects(sample_items)
        db.session.commit()

# API Routes
@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    """Return all inventory items as JSON"""
    try:
        inventory = [item.to_dict() for item in InventoryItem.query.all()]
        return jsonify(inventory)
    except Exception as e:
        app.logger.error(f"Error getting inventory: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/inventory/<barcode>', methods=['GET'])
def get_item(barcode):
    """Return a specific inventory item by barcode"""
    try:
        item = InventoryItem.query.filter_by(barcode=barcode).first()
        if item:
            return jsonify(item.to_dict())
        return jsonify({'error': 'Item not found'}), 404
    except Exception as e:
        app.logger.error(f"Error getting item: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/inventory', methods=['POST'])
def add_item_api():
    """Add a new item to inventory via API"""
    try:
        data = request.json
        new_item = InventoryItem(
            name=data['name'],
            barcode=data['barcode'].strip(),
            quantity=int(data['quantity']),
            description=data.get('description', ''),
            price=float(data['price'])
        )
        db.session.add(new_item)
        db.session.commit()
        return jsonify(new_item.to_dict()), 201
    except Exception as e:
        app.logger.error(f"Error adding item via API: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/inventory/<barcode>', methods=['PUT'])
def update_item_api(barcode):
    """Update an existing item via API"""
    try:
        item = InventoryItem.query.filter_by(barcode=barcode).first()
        if not item:
            return jsonify({'error': 'Item not found'}), 404
            
        data = request.json
        item.name = data.get('name', item.name)
        item.barcode = data.get('barcode', item.barcode).strip()
        item.quantity = int(data.get('quantity', item.quantity))
        item.description = data.get('description', item.description)
        item.price = float(data.get('price', item.price))
        
        db.session.commit()
        return jsonify(item.to_dict())
    except Exception as e:
        app.logger.error(f"Error updating item via API: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/inventory/<barcode>', methods=['DELETE'])
def delete_item_api(barcode):
    """Delete an item via API"""
    try:
        item = InventoryItem.query.filter_by(barcode=barcode).first()
        if not item:
            return jsonify({'error': 'Item not found'}), 404
            
        db.session.delete(item)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Item deleted successfully'})
    except Exception as e:
        app.logger.error(f"Error deleting item via API: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/checkout', methods=['POST'])
def checkout_api():
    """Process checkout via API"""
    try:
        checkout_items = request.json.get('checkoutItems', [])
        
        for checkout_item in checkout_items:
            item = InventoryItem.query.filter_by(barcode=checkout_item['barcode']).first()
            if item:
                # Deduct the quantity of the item in the inventory
                item.quantity -= checkout_item['quantity']
                if item.quantity < 0:
                    item.quantity = 0
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'Checkout completed successfully.'})
    except Exception as e:
        app.logger.error(f"Error in checkout process: {str(e)}")
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

# Keep the original routes for local development
@app.route('/')
@app.route('/checkout', methods=['GET'])
def checkout():
    """Render the checkout page with the current inventory."""
    try:
        inventory = [item.to_dict() for item in InventoryItem.query.all()]
        return render_template('checkout.html', inventory=inventory)
    except Exception as e:
        app.logger.error(f"Error in checkout route: {str(e)}")
        return f"An error occurred: {str(e)}", 500

@app.route('/inventory')
def display_inventory():
    """Render the inventory page with the current inventory."""
    try:
        inventory = InventoryItem.query.all()
        return render_template('inventory.html', inventory=inventory)
    except Exception as e:
        app.logger.error(f"Error in inventory route: {str(e)}")
        return f"An error occurred: {str(e)}", 500

@app.route('/add', methods=['GET', 'POST'])
def add_item():
    """Handle adding a new item to the inventory."""
    if request.method == 'POST':
        try:
            # Create a new item from the form data
            new_item = InventoryItem(
                name=request.form['name'],
                barcode=request.form['barcode'].strip(),
                quantity=int(request.form['quantity']),
                description=request.form['description'],
                price=float(request.form['price'])
            )

            # Add the new item to the database
            db.session.add(new_item)
            db.session.commit()
            return redirect(url_for('display_inventory'))

        except Exception as e:
            # Handle errors (e.g., duplicate barcode)
            app.logger.error(f"Error adding item: {str(e)}")
            return render_template(
                'add_item.html',
                error=f"Error: {str(e)}",
                existing_barcodes=[item.barcode for item in InventoryItem.query.all()]
            )

    # Render the add item page
    return render_template('add_item.html', existing_barcodes=[item.barcode for item in InventoryItem.query.all()], error=None)

@app.route('/edit/<barcode>', methods=['GET', 'POST'])
def edit_item(barcode):
    """Handle editing an existing item in the inventory."""
    # Find the item by barcode
    item = InventoryItem.query.filter_by(barcode=barcode).first()
    if item is None:
        return "Item not found.", 404

    if request.method == 'POST':
        try:
            # Update the item's details
            item.name = request.form['name']
            item.barcode = request.form['barcode'].strip()
            item.quantity = int(request.form['quantity'])
            item.description = request.form['description']
            item.price = float(request.form['price'])
            db.session.commit()
            return redirect(url_for('display_inventory'))
        except Exception as e:
            # Handle errors
            app.logger.error(f"Error editing item: {str(e)}")
            return render_template(
                'edit_item.html',
                item=item,
                error=f"Error: {str(e)}"
            )

    # Render the edit item page
    return render_template('edit_item.html', item=item, error=None)

@app.route('/delete/<barcode>')
def delete_item(barcode):
    """Handle deleting an item from the inventory."""
    try:
        item = InventoryItem.query.filter_by(barcode=barcode).first()
        if item:
            db.session.delete(item)
            db.session.commit()
        return redirect(url_for('display_inventory'))
    except Exception as e:
        app.logger.error(f"Error deleting item: {str(e)}")
        return f"An error occurred: {str(e)}", 500

@app.route('/complete_checkout', methods=['POST'])
def complete_checkout():
    """Handle the checkout process and update the inventory."""
    try:
        checkout_items = request.json.get('checkoutItems', [])
        
        for checkout_item in checkout_items:
            item = InventoryItem.query.filter_by(barcode=checkout_item['barcode']).first()
            if item:
                # Deduct the quantity of the item in the inventory
                item.quantity -= checkout_item['quantity']
                if item.quantity < 0:
                    item.quantity = 0  # Ensure quantity doesn't go negative
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'Checkout completed successfully.'})
    except Exception as e:
        app.logger.error(f"Error in checkout process: {str(e)}")
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

# Main entry point
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)