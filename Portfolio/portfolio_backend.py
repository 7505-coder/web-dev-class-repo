from flask import Flask, render_template, request, jsonify
from flask_pymongo import PyMongo
from datetime import datetime
import os

app = Flask(__name__)

app.config["MONGO_URI"] = os.environ.get("MONGO_URI", "mongodb://localhost:27017/portfolio_db")
mongo = PyMongo(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/contact', methods=['POST'])
def submit_contact():
    try:
        data = request.get_json()
        
        contact_data = {
            'name': data.get('name'),
            'email': data.get('email'),
            'message': data.get('message'),
            'timestamp': datetime.utcnow()
        }
        
        mongo.db.contacts.insert_one(contact_data)
        
        return jsonify({
            'success': True,
            'message': 'Thank you for reaching out! I\'ll get back to you soon.'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Something went wrong. Please try again.'
        }), 500

@app.route('/api/projects', methods=['GET'])
def get_projects():
    
    projects = [
        {
            'id': 1,
            'title': 'E-Commerce Platform',
            'description': 'Full-stack e-commerce solution with payment integration, inventory management, and real-time analytics.',
            'technologies': ['React', 'Node.js', 'MongoDB', 'Stripe']
        },
        {
            'id': 2,
            'title': 'Task Management System',
            'description': 'Collaborative project management tool with Kanban boards, team chat, and deadline tracking.',
            'technologies': ['Vue.js', 'Express', 'PostgreSQL', 'Socket.io']
        }
    ]
    return jsonify(projects)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)