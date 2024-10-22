from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS
import os
from dotenv import load_dotenv
import requests
from datetime import datetime

load_dotenv()
app = Flask(__name__)
CORS(app) 

@app.route("/attendance/healthcheck", methods=["GET"])
def healthcheck():
    return jsonify({"message": "attendance service reached"}), 200


employee_url = os.getenv("EMPLOYEE_URL")
wfhRequest_url = os.getenv("WFHREQUESTS_URL")


@app.route("/attendance/", methods=["GET"])
def get_attendance_by_date():
    date = request.args.get('date')
    attendance_details = []
    
    # Validate the date format
    try:
        # Try to parse the date to check if it's valid
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        output_data = {
            "status_code": 400,
            "message": "Invalid date format. Please use YYYY-MM-DD.",
            "data": None
        }
        return output_data, 400

    # Fetch WFH requests for the specified date
    wfhRequests = requests.get(wfhRequest_url + '/date/' + date)
    wfhRequests_details = wfhRequests.json()

    # Initialize a set to store unique requester_ids for approved entries
    approved_requester_ids = set()

    if wfhRequests_details:
        # Loop through each request to check for approved entries
        for req in wfhRequests_details.get('data', []):
            for entry in req.get('entries', []):
                if entry['status'] == 'Approved':
                    approved_requester_ids.add(req['requester_id'])
                    # Add the entry date to the attendance details
                    attendance_details.append({
                        "request_id": entry['request_id'],
                        "requester_id": req['requester_id'],
                        "duration": entry['duration'],
                        "reason": entry['reason'],
                        "date": entry['entry_date'],  # Capture the entry_date
                        "employee_name": None,  # Placeholder, will fill later
                        "dept": None,  # Placeholder, will fill later
                        'workingFromHome': True
                    })

    # Convert the set to a list if needed
    approved_requester_ids_list = list(approved_requester_ids)

    # Incorporate employee details into approved entries
    for requester_id in approved_requester_ids_list:
        employee_details = get_employee_details(requester_id)

        if employee_details:
            # Update employee details in the attendance details
            for attendance in attendance_details:
                if attendance['requester_id'] == requester_id:
                    attendance["employee_name"] = employee_details.get('name')
                    attendance["dept"] = employee_details.get('dept')

    # Fetch all employees
    all_employees_response = requests.get(employee_url + "/")
    all_employees_data = all_employees_response.json()

    if all_employees_data['status_code'] == 200:
        for employee in all_employees_data['data']:
            staff_id = employee['staff_id']
            # Add all employees with their working status
            if staff_id not in approved_requester_ids:
                attendance_details.append({
                    "request_id": None,
                    "requester_id": staff_id,
                    "employee_name": f"{employee['staff_fname']} {employee['staff_lname']}",
                    "dept": employee["dept"],
                    'workingFromHome': False,  # Not in approved list
                    "date": None,  # Not applicable for regular employees
                    "duration": None,
                    "reason": None
                })

    output_data = {
        "status_code": 200,
        "message": "Attendance details",
        "data": attendance_details
    }
    return output_data, 200




    

def get_employee_details(staff_id):
    try:
        response = requests.get(employee_url + "/", params={"staff_id": staff_id})
        response_data = response.json() 
        
        if response_data['status_code'] == 200:
            if response_data['data']:
                employee = response_data['data'][0]
                
                return {
                    "name": f"{employee['staff_fname']} {employee['staff_lname']}",
                    "dept": employee["dept"]
                }
        return None
    except Exception as e:
        print(f"Error fetching employee details for staff_id {staff_id}: {e}")
        return None

    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002)
