from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS
from sqlalchemy import select
from typing import List
from marshmallow import ValidationError
import os
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv
from celery import Celery

from factory import ma, db, Employee, EmployeeSchema,  Credential, CredentialSchema, Role, Delegate, DelegateSchema, DelegateStatusHistory, DelegateStatusHistorySchema, Status

load_dotenv()
app = Flask(__name__)
CORS(app) 

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URI")
# BACKEND_CONNECTION_STRING = os.getenv("BACKEND_CONNECTION_STRING")
BROKER_CONNECTION_STRING = os.getenv("BROKER_CONNECTION_STRING")

db.init_app(app)
ma.init_app(app)

with app.app_context():
    db.create_all()
    
worker = Celery('tasks',  
                #  backend=BACKEND_CONNECTION_STRING,
                 broker=BROKER_CONNECTION_STRING)

@app.route("/employees/healthcheck", methods=["GET"])
def healthcheck():
    return jsonify({"message": "employee service reached"}), 200

@app.route("/employees", methods=["GET"])
def get_all_employee():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 10))
    stmt = select(Employee).order_by(Employee.staff_id)

    pagination = db.paginate(
        stmt,
        page=page,
        per_page=per_page,
        error_out=False,
        count=True,
    )

    if pagination.total == 0:
        output_data = {
            "status_code": 404,
            "message": "No Employee found",
            "data": None
        }
        return output_data, 404

    if page > pagination.pages:
        output_data = {
            "status_code": 405,
            "message": f"Page {page} out of range",
            "data": None
        }
        return output_data, 405

    results: List[Employee] = pagination.items
    schema = EmployeeSchema()

 
    output_data = {
        "status_code": 200,
        "message": "Employees Record",
        "data": {
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": pagination.page,
            "per_page": pagination.per_page,
            "employee": [schema.dump(u) for u in results],
        }
    }
    return output_data, 200

@app.route("/employees/", methods=["GET"])
def get_employee_by_staff_id(reporting_manager=None):
    staff_id = request.args.get('staff_id')
    dept = request.args.get('dept')
    schema = EmployeeSchema(many=True)
    stmt = select(Employee)
    
    if staff_id:
        staff_id = int(staff_id)
        stmt = stmt.where(Employee.staff_id == staff_id)
    
    if dept:
        stmt = stmt.where(Employee.dept == dept)
    
    if reporting_manager:
        stmt = stmt.where(Employee.reporting_manager == reporting_manager)

    try:
        employee = db.session.execute(stmt).scalars().all()

        output_data = {
            "status_code": 200,
            "message": f"Employee details:",
            "data": schema.dump(employee)
        }
        return output_data, 200
    except SQLAlchemyError as e:
        return jsonify({"error": str(e)}), 500
    

@app.route("/employees/", methods=["PUT"])
def update_employee():
    try:
        data = request.get_json()
        staff_id = request.args.get('staff_id')
        
        stmt = select(Employee).where(Employee.staff_id == int(staff_id))
        employee = db.session.execute(stmt).scalars().one_or_none()
        
        # Update the fields based on provided data
        updatable_fields = [
            "staff_fname", "staff_lname", "dept", "position",
            "country", "email", "reporting_manager", "role"
        ]
        for field in updatable_fields:
            if field in data:
                setattr(employee, field, data[field])
                
        db.session.commit()
        
        output_data = {
            "status_code": 200,
            "message": f"Employee details updated successfully for staff_id {staff_id}",
            "data": None
        }
        return output_data, 200
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@app.route("/employees", methods=["POST"])
def create_employee():
    try:
        data = request.get_json()
        
        ############################## Use this to post 1 by batch ##############################
        # employees = []
        # for item in data:
        #     # Prepare data for employee creation
        #     employee_data = {
        #         "staff_id": item.get("Staff_ID"),
        #         "staff_fname": item.get("Staff_FName"),
        #         "staff_lname": item.get("Staff_LName"),
        #         "dept": item.get("Dept"),
        #         "position": item.get("Position"),
        #         "country": item.get("Country"),
        #         "email": item.get("Email"),
        #         "reporting_manager": item.get("Reporting_Manager"),
        #         "role": item.get("Role")
        #     }

        #     # Create employee instance
        #     employee_schema = EmployeeSchema()
        #     employee = employee_schema.load(employee_data, session=db.session)
        #     employees.append(employee)

        # # Bulk insert employees
        # db.session.bulk_save_objects(employees)
        # db.session.commit()
        
        ############################## Use this to post 1 by 1 ##############################
        employee_schema = EmployeeSchema()
        employee = employee_schema.load(data, session=db.session)
        db.session.add(employee)
        db.session.commit()
        
        output_data = {
            "status_code": 201,
            "message": "Employee created",
            "data": employee_schema.dump(employee)
        }
        return output_data, 201
    except ValidationError as e:
        return jsonify({"errors": e.messages}), 400
    
@app.route("/employees/credential", methods=["POST"])
def create_credential():
    try:
        data = request.get_json()
        
        ############################## Use this to post 1 by batch ##############################
        # credentials = []
        # for item in data:
        #     # Prepare data for employee creation
        #     credential_data = {
        #         "staff_id": item.get("staff_id"),
        #         "password": item.get("password")
        #     }

        #     # Create credential instance
        #     credential_schema = CredentialSchema()
        #     credential = credential_schema.load(credential_data, session=db.session)
        #     credentials.append(credential)

        # # Bulk insert credentials
        # db.session.bulk_save_objects(credentials)
        # db.session.commit()
        
        ############################## Use this to post 1 by 1 ##############################
        credential_schema = CredentialSchema()
        credential = credential_schema.load(data, session=db.session)
        db.session.add(credential)
        db.session.commit()
        
        output_data = {
            "status_code": 201,
            "message": "Employee Credential created",
            "data": credential_schema.dump(credential)
        }
        return output_data, 201
    except ValidationError as e:
        return jsonify({"errors": e.messages}), 400

@app.route("/employees/auth", methods=["GET"])
def authenticate_employee():
    try:
        staff_id = request.args.get('staff_id')
        
        staff_id = int(staff_id)
        stmt = select(Credential).where(Credential.staff_id == staff_id)
        employeeCredential = db.session.execute(stmt).scalars().one_or_none()
        schema = CredentialSchema()
        
        if employeeCredential:
            credentials_details = schema.dump(employeeCredential)
            print(credentials_details)
            
            
            output_data = {
                "status_code": 200,
                "message": "Employee Password",
                "data": credentials_details['password']
            }
            return output_data, 200
        else:
            output_data = {
                "status_code": 404,
                "message": "Employee Not Found",
                "data": None
            }
            return output_data, 404
        
    except ValidationError as e:
        return jsonify({"errors": e.messages}), 500


# Fetch the list of managers from the same department
@app.route("/employees/reporting-mgr", methods=["GET"])
def get_other_reporting_manager():
    dept = request.args.get('dept')
    schema = EmployeeSchema(many=True)
    stmt = select(Employee)
    
    
    stmt = stmt.where(Employee.dept == dept, Employee.role == Role.MANAGER)

    try:
        employee = db.session.execute(stmt).scalars().all()

        output_data = {
            "status_code": 200,
            "message": f"Employee details:",
            "data": schema.dump(employee)
        }
        return output_data, 200
    except SQLAlchemyError as e:
        return jsonify({"error": str(e)}), 500


def get_delegate_by_delegate_id(delegate_id):
    schema = DelegateSchema(many=True)
    stmt = select(Delegate).where(Delegate.delegate_id == delegate_id)

    delegate_details = db.session.execute(stmt).scalars().all()

    return schema.dump(delegate_details)

        
# Create delegate record
@app.route("/employees/delegate", methods=["POST"])
def create_delegate():
    try:
        data = request.get_json()
        
        delegate_schema = DelegateSchema()
        delegate = delegate_schema.load(data, session=db.session)
        db.session.add(delegate)
        db.session.flush()
        
        delegate_data = {
            "delegate_id": delegate.delegate_id,
            "delegate_from": delegate.delegate_from,
            "delegate_to": delegate.delegate_to,
            "status": delegate.status.value,
        }
        
        create_delegate_status_record(delegate_data)
        
        db.session.commit()
        
        output_data = {
            "status_code": 201,
            "message": "Delegate Record created",
            "data": delegate_schema.dump(delegate)
        }
        return output_data, 201
    except ValidationError as e:
        return jsonify({"errors": e.messages}), 400
    
# Create the delegate status history record
@app.route("/employees/delegate-status-history", methods=["POST"])
def create_delegate_status_record(delegate_data=None):
    try:
        data = request.get_json()
        
        if (delegate_data):
            data = delegate_data
            
        delegate_schema = DelegateStatusHistorySchema()
        delegate_status_history = delegate_schema.load(data, session=db.session)
        db.session.add(delegate_status_history)
        db.session.commit()
        
        if data['status'] != 'pending':
            update_delegate_status(data['delegate_id'], data['status'])
            
        # Once accepted to be temp reporting manager, 
        # 1) Temp update the reporting manager to the new guy
        # 2) When times up, reporting manager revert back to original guy
        if data['status'] == 'accepted':
            delegate_details = get_delegate_by_delegate_id(data['delegate_id'])
            delegate_details = delegate_details[0]
            start_date = delegate_details.get('start_date')
            end_date = delegate_details.get('end_date')
            delegate_from = delegate_details.get('delegate_from')
            delegate_to = delegate_details.get('delegate_to')
            
            # list of employees affected
            affected_employees = get_employee_by_staff_id(delegate_from)
            affected_employees = affected_employees[0]
            affected_staff_ids = [employee['staff_id'] for employee in affected_employees['data']]

            print('affected_staff_ids: ', affected_staff_ids)
            worker.send_task("replace_to_temp_mgr", eta=start_date, kwargs={'temp_manager': delegate_to, 'affected_staff_ids': affected_staff_ids})
            worker.send_task("replace_to_original_mgr", eta=end_date, kwargs={'original_manager': delegate_from, 'affected_staff_ids': affected_staff_ids})

        
        output_data = {
            "status_code": 201,
            "message": "Delegate Record created",
            "data": delegate_schema.dump(delegate_status_history)
        }
        return output_data, 201
    except ValidationError as e:
        print(e)
        return jsonify({"errors": e.messages}), 400


def update_delegate_status(delegate_id, status):
    stmt = select(Delegate).where(Delegate.delegate_id == delegate_id)
    delegate_record = db.session.execute(stmt).scalars().one_or_none()
    
    delegate_record.status = status.upper()
    delegate_record.notification_status = status.upper()

    db.session.commit()
    

# Fetch delegate audit trail
@app.route("/employees/delegate", methods=["GET"])
def get_delegate_audit_trail():
    stmt = select(Delegate)

    # Execute the query and fetch all records
    results = db.session.execute(stmt).scalars().all()

    if not results:
        return {
            "status_code": 404,
            "message": "No delegate record found",
            "data": None
        }, 404

    schema = DelegateSchema(many=True)  # Ensure many=True for multiple records

    # Serialize results including the 'reason' field
    serialized_data = schema.dump(results)

    output_data = {
        "status_code": 200,
        "message": "Delegate Record",
        "data": serialized_data,  # Including the 'reason' field now
    }

    return jsonify(output_data), 200

@app.route("/employees/delegate/<int:staff_id>", methods=["GET"])
def get_delegate_by_staff_id(staff_id):
    stmt = select(Delegate).where(
        (Delegate.delegate_from == staff_id) | (Delegate.delegate_to == staff_id)
    )

    # Execute the query and fetch all matching records
    results = db.session.execute(stmt).scalars().all()

    if not results:
        return {
            "status_code": 404,
            "message": f"No delegate records found for staff_id {staff_id}",
            "data": None
        }, 404

    schema = DelegateSchema(many=True)  # Ensure many=True for multiple records

    # Serialize results including the 'reason' field
    serialized_data = schema.dump(results)

    output_data = {
        "status_code": 200,
        "message": f"Delegate records for staff_id {staff_id}",
        "data": serialized_data,
    }

    return jsonify(output_data), 200

    
# Fetch delegate status audit trail
@app.route("/employees/delegate-status-history/<int:delegate_id>", methods=["GET"])
def get_delegate_status_audit_trail(delegate_id):
    schema = DelegateStatusHistorySchema(many=True)
    stmt = select(DelegateStatusHistory).where(DelegateStatusHistory.delegate_id == delegate_id)

    try:
        delegate_status = db.session.execute(stmt).scalars().all()

        # Serialize the results
        serialized_data = schema.dump(delegate_status)

        # Here, if your schema already excludes the fields, you can skip this filtering
        output_data = {
            "status_code": 200,
            "message": "Delegate Status History",
            "data": serialized_data  # Use serialized data directly
        }
        return output_data, 200
    except SQLAlchemyError as e:
        return jsonify({"error": str(e)}), 500


# **Yet to do** 
# Once assign,
    # Notification - Fetch from NotificationDelegate
    # if reject, notify


# Fetch the list of managers that could take over u -> get_other_reporting_manager()
# Once u decide and want to assign to this manager -> create_delegate()
# Once the assigned manager make a move (accept/reject) -> create_delegate_status_record()
    
@app.route('/employees/getDelegateNotiLength/<int:staffID>', methods=['GET'])
def get_notifications_length(staffID):
    requester_requests_count = db.session.query(Delegate).filter(
        Delegate.delegate_from == staffID,
        Delegate.notification_status.in_([Status.ACCEPTED, Status.REJECTED])
    ).count()
    
    # Query to get requests where reporting_manager = staffID and notification_status = 'Delivered'
    manager_requests_count = db.session.query(Delegate).filter(
        Delegate.delegate_to == staffID,
        Delegate.notification_status.in_([Status.PENDING])
    ).count()

    total_active_requests = requester_requests_count + manager_requests_count

    output_data = {
        "status_code": 200,
        "message": "Total Unseen Notifications Length",
        "data": total_active_requests
    }

    return output_data, 200

@app.route('/employees/getAllDeleNoti/<int:staff_id>', methods=['GET'])
def get_all_requests(staff_id):
    requester_requests = db.session.query(Delegate).filter(
        Delegate.delegate_from == staff_id,
        Delegate.status.in_([Status.ACCEPTED, Status.REJECTED])
    )

    manager_requests = db.session.query(Delegate).filter(
       Delegate.delegate_to == staff_id,
       Delegate.status.in_([Status.PENDING, Status.ACCEPTED, Status.REJECTED])
    )

    combined_requests = requester_requests.union(manager_requests)
    requests = combined_requests.all()

    result = []
    for request in requests:
        request_data = DelegateSchema().dump(request)
        result.append(request_data)

        request.notification_status = Status.SEEN
        db.session.add(request)

    db.session.commit()

    output_data = {
        "status_code": 200,
        "message": "All Delegation Requests By Staff",
        "data": result
    }

    return output_data, 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002)
