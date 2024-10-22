from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS
from sqlalchemy import select, and_, or_
from typing import List
from marshmallow import ValidationError
import os
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv
from datetime import datetime

from factory import ma, db, AnnualLeave, AnnualLeaveSchema

load_dotenv()
app = Flask(__name__)
CORS(app) 

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URI")

db.init_app(app)
ma.init_app(app)

with app.app_context():
    db.create_all()

@app.route("/leaves/healthcheck", methods=["GET"])
def healthcheck():
    return jsonify({"message": "leaves service reached"}), 200

@app.route("/leaves", methods=["GET"])
def get_all_leaves():
    requests = db.session.query(AnnualLeave).all()

    result = []
    for request in requests:
        request_data = AnnualLeaveSchema().dump(request)
        result.append(request_data)
    
    output_data = {
        "status_code": 200,
        "message": "Anuual Leave Record",
        "data": 
            result
        
    }
    return output_data, 200
    # return jsonify(result)

@app.route("/leaves/staff/<int:staff_id>", methods=["GET"])
def get_leaves_by_staff_id(staff_id):
    # Query for all annual leave requests where employee_id matches the staff_id
    requests = db.session.query(AnnualLeave).filter(AnnualLeave.employee_id == staff_id).all()

    # Prepare a list to hold all the serialized requests
    response_data = []

    for request in requests:
        print(f"Processing request: {request}")

        # Serialize the request data using AnnualLeaveSchema
        request_data = AnnualLeaveSchema().dump(request)
        
        # Append the serialized request data to the response list
        response_data.append(request_data)
    
    # Construct the final output
    output_data = {
        "status_code": 200,
        "message": "Annual Leave Requests By Staff ID",
        "data": response_data
    }
    return output_data, 200


@app.route('/leaves/date/<string:entry_date_str>', methods=['GET'])
def get_leaves_by_date(entry_date_str):
    # Convert the string date to a Python date object
    entry_date = datetime.strptime(entry_date_str, '%Y-%m-%d').date()

    # Query AnnualLeave records filtered by leave_date
    entries = db.session.query(AnnualLeave).filter(AnnualLeave.leave_date == entry_date).all()
    
    if not entries:
        return jsonify([])  # Return empty list if no matching entries found
    
    # Serialize the AnnualLeave records using AnnualLeaveSchema
    serialized_entries = [AnnualLeaveSchema().dump(entry) for entry in entries]

    output_data = {
        "status_code": 200,
        "message": "Annual Leaves By Date",
        "data": serialized_entries
    }
    return output_data, 200

@app.route('/leaves/addAnnualLeave', methods=['POST'])
def create_annual_leave_request():
    data = request.get_json()

    try:
        # Extract employee_id and leave_date from the request body
        employee_id = data.get('employee_id')
        leave_date = data.get('leave_date')
        dept = data.get('department')

        if not employee_id or not leave_date:
            return jsonify({"error": "Employee ID and Leave Date are required"}), 400

        # Create a new AnnualLeave instance
        annual_leave = AnnualLeave(
            employee_id=employee_id,
            department=dept,
            leave_date=datetime.strptime(leave_date, '%Y-%m-%d')  # Convert leave_date to a datetime object
        )
        
        # Add the new leave request to the session and commit
        db.session.add(annual_leave)
        db.session.commit()

        # Serialize the response using AnnualLeaveSchema
        annual_leave_schema = AnnualLeaveSchema()
        output_data = {
            "status_code": 201,
            "message": "Annual Leave Request created",
            "data": annual_leave_schema.dump(annual_leave)
        }
        return output_data, 201

    except ValidationError as ve:
        return jsonify({"error": "Invalid data", "details": ve.messages}), 400
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/leaves/<int:leave_id>", methods=["DELETE"])
def delete_leave(leave_id):
    try:
        leave_request = db.session.get(AnnualLeave, leave_id)

        db.session.delete(leave_request)
        db.session.commit()
        
        output_data = {
            "status_code": 200,
            "message": f"Leave Request with ID {leave_id} deleted successfully",
            "data": None
        }
        return output_data, 200
    
    except ValidationError as e:
        return jsonify({"errors": e.messages}), 400

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002)

