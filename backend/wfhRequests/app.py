from utility import get_previous_working_day
from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS
from sqlalchemy import select, and_, or_
from typing import List
from marshmallow import ValidationError
import os
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv
from datetime import datetime
from celery import Celery


from factory import ma, db,Status, WFHRequest, WFHRequestSchema, WFHRequestEntry, WFHRequestEntrySchema, NotificationStatus, AuditTrail, AuditTrailSchema 

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


@app.route("/wfhRequests/healthcheck", methods=["GET"])
def healthcheck():
    return jsonify({"message": "wfhRequest service reached"}), 200

@app.route("/wfhRequests", methods=["GET"])
def get_wfh_requests():
    # Query all WFHRequest records and eager load their related WFHRequestEntry records
    requests = db.session.query(WFHRequest).all()
    # Query all WFHRequestEntry records
    all_entries = db.session.query(WFHRequestEntry).all()
    
    # Create a dictionary to map request_id to its entries
    entries_by_request_id = {}
    for entry in all_entries:
        if entry.request_id not in entries_by_request_id:
            entries_by_request_id[entry.request_id] = []
        entries_by_request_id[entry.request_id].append(WFHRequestEntrySchema().dump(entry))
    
    # Serialize the data for each WFHRequest and include entries
    result = []
    for request in requests:
        request_data = WFHRequestSchema().dump(request)
        # Add entries for the current request
        request_data['entries'] = entries_by_request_id.get(request.request_id, [])
        result.append(request_data)
    
    output_data = {
        "status_code": 200,
        "message": "WFH Requests Record",
        "data": 
            result
        
    }
    return output_data, 200
    # return jsonify(result)

@app.route("/wfhRequests/<int:request_id>", methods=["GET"])
def get_wfh_request(request_id):
    # Query the WFHRequest with the specified request_id
    request = db.session.query(WFHRequest).filter_by(request_id=request_id).first()
    
    # Query all WFHRequestEntry records related to this WFHRequest
    entries = db.session.query(WFHRequestEntry).filter_by(request_id=request_id).all()
    
    # Serialize the data
    request_data = WFHRequestSchema().dump(request)
    request_data['entries'] = [WFHRequestEntrySchema().dump(entry) for entry in entries]
    
    output_data = {
        "status_code": 200,
        "message": "One WFH Request By ID",
        "data": request_data
        
    }
    return output_data, 200

@app.route("/wfhRequests/staff/<int:staff_id>", methods=["GET"])
def get_wfh_request_by_staff_id(staff_id):
    
    requests = db.session.query(WFHRequest).filter(
        or_(WFHRequest.requester_id == staff_id, WFHRequest.reporting_manager == staff_id)
    ).all()
    
    # Prepare a list to hold all the requests and their entries
    response_data = []

    for request in requests:
        print(f"Processing request: {request}")

        # Query all WFHRequestEntry records related to this WFHRequest
        entries = db.session.query(WFHRequestEntry).filter_by(request_id=request.request_id).all()
        
        # Serialize the request data
        request_data = WFHRequestSchema().dump(request)
        request_data['entries'] = [WFHRequestEntrySchema().dump(entry) for entry in entries]
        
        # Append the serialized request data to the response list
        response_data.append(request_data)
    
    output_data = {
        "status_code": 200,
        "message": "WFH Requests By Staff ID",
        "data": response_data
    }
    return output_data, 200

@app.route("/wfhRequests/requester/<int:staff_id>", methods=["GET"])
def get_wfh_request_by_requester_id(staff_id):
    
    requests = db.session.query(WFHRequest).filter(
        WFHRequest.requester_id == staff_id
    ).all()
    
    # Prepare a list to hold all the requests and their entries
    response_data = []

    for request in requests:
        # Query all WFHRequestEntry records related to this WFHRequest with status 'Approved'
        entries = db.session.query(WFHRequestEntry).filter_by(
            request_id=request.request_id, status=Status.APPROVED
        ).all()
        
        if entries:
            # Serialize the request data
            request_data = WFHRequestSchema().dump(request)
            request_data['entries'] = [WFHRequestEntrySchema().dump(entry) for entry in entries]
            
            # Append the serialized request data to the response list
            response_data.append(request_data)
    
    output_data = {
        "status_code": 200,
        "message": "WFH Requests By Staff ID",
        "data": response_data
    }
    return output_data, 200


@app.route("/wfhRequests/dept/<string:dept_name>", methods=["GET"])
def get_wfh_request_by_dept(dept_name):
    
    requests = db.session.query(WFHRequest).filter_by(department=dept_name).all()

    
    # Prepare a list to hold all the requests and their entries
    response_data = []

    for request in requests:
        print(f"Processing request: {request}")

        entries = db.session.query(WFHRequestEntry).filter_by(request_id=request.request_id).all()
        
        # Serialize the request data
        request_data = WFHRequestSchema().dump(request)
        request_data['entries'] = [WFHRequestEntrySchema().dump(entry) for entry in entries]
        
        # Append the serialized request data to the response list
        response_data.append(request_data)
    
    output_data = {
        "status_code": 200,
        "message": "WFH Requests By Department",
        "data": response_data
    }
    return output_data, 200

@app.route('/wfhRequests/date/<string:entry_date_str>', methods=['GET'])
def get_requests_by_date(entry_date_str):
    # Convert the string date to a Python date object
    entry_date = datetime.strptime(entry_date_str, '%Y-%m-%d').date()

    entries = db.session.query(WFHRequestEntry).filter(WFHRequestEntry.entry_date == entry_date).all()

    # Extract request_ids from the entries
    request_ids = {entry.request_id for entry in entries}
    
    if not request_ids:
        return jsonify([])  # Return empty list if no matching entries found
    
    # Query WFHRequest records with the extracted request_ids
    requests = db.session.query(WFHRequest).filter(WFHRequest.request_id.in_(request_ids)).all()
    
    # Create a dictionary to map request_id to its entries
    entries_by_request_id = {}
    for entry in entries:
        if entry.request_id not in entries_by_request_id:
            entries_by_request_id[entry.request_id] = []
        entries_by_request_id[entry.request_id].append(WFHRequestEntrySchema().dump(entry))
    
    # Serialize the data for each WFHRequest and include entries
    result = []
    for request in requests:
        request_data = WFHRequestSchema().dump(request)
        request_data['entries'] = entries_by_request_id.get(request.request_id, [])
        result.append(request_data)
    
    output_data = {
        "status_code": 200,
        "message": "WFH Requests By Date",
        "data": result
    }
    return output_data, 200
    # return jsonify(result)

@app.route('/wfhRequests/getNotificationsLength/<int:staffID>', methods=['GET'])
def get_notifications_length(staffID):
    requester_requests_count = db.session.query(WFHRequest).filter(
        WFHRequest.requester_id == staffID,
        # WFHRequest.notification_status == NotificationStatus.EDITED
        WFHRequest.requester_id != WFHRequest.reporting_manager,  # Exclude if requester is the reporting manager

        WFHRequest.notification_status.in_([NotificationStatus.EDITED, NotificationStatus.WITHDRAWN, NotificationStatus.ACKNOWLEDGED, NotificationStatus.AUTO_REJECTED])

    ).count()
    
    # Query to get requests where reporting_manager = staffID and notification_status = 'Delivered'
    manager_requests_count = db.session.query(WFHRequest).filter(
        WFHRequest.reporting_manager == staffID,
        WFHRequest.reporting_manager != WFHRequest.requester_id,  # Exclude if requester is the reporting manager
        WFHRequest.notification_status.in_([NotificationStatus.DELIVERED, NotificationStatus.CANCELLED, NotificationStatus.SELF_WITHDRAWN])
    ).count()

    total_active_requests = requester_requests_count + manager_requests_count

    output_data = {
        "status_code": 200,
        "message": "Total Notifications Length",
        "data": total_active_requests
    }

    return output_data, 200

# @app.route('/wfhRequests/getLatestFive/<int:staff_id>', methods=['GET'])
# def get_latest_five_requests(staff_id):
#     requester_requests = db.session.query(WFHRequest).filter(
#         WFHRequest.requester_id == staff_id,
#         WFHRequest.notification_status.in_([NotificationStatus.EDITED, NotificationStatus.WITHDRAWN, NotificationStatus.ACKNOWLEDGED])
#     )

#     # Get latest 5 requests for reporting manager where notification_status is 'Delivered'
#     manager_requests = db.session.query(WFHRequest).filter(
#         WFHRequest.reporting_manager == staff_id,
#         WFHRequest.reporting_manager != WFHRequest.requester_id,  # Exclude if requester is the reporting manager
#         WFHRequest.notification_status.in_([NotificationStatus.DELIVERED, NotificationStatus.CANCELLED, NotificationStatus.SELF_WITHDRAWN])
#     )

#     combined_requests = requester_requests.union_all(manager_requests).order_by(
#         WFHRequest.modified_at.desc(),
#         WFHRequest.request_id.desc()  # Adding request_id to ensure uniqueness in sorting
#     ).limit(5)    
#     requests = combined_requests.all()
#     print(f"Total requests: {len(requests)}")  # Check the total number of combined records


#     result = []
#     for request in requests:
#         request_data = WFHRequestSchema().dump(request)
#         result.append(request_data)

#     #     request.notification_status = NotificationStatus.SEEN
#     #     db.session.add(request)

#     # db.session.commit()

#     output_data = {
#         "status_code": 200,
#         "message": "WFH Requests By Date",
#         "data": result
#     }

#     return output_data, 200

@app.route('/wfhRequests/getAll/<int:staff_id>', methods=['GET'])
def get_all_requests(staff_id):
    requester_requests = db.session.query(WFHRequest).filter(
        WFHRequest.requester_id == staff_id,
        WFHRequest.requester_id != WFHRequest.reporting_manager,  # Exclude if requester is the reporting manager
        WFHRequest.last_notification_status.in_([NotificationStatus.EDITED, NotificationStatus.SELF_WITHDRAWN, NotificationStatus.ACKNOWLEDGED, NotificationStatus.AUTO_REJECTED, NotificationStatus.WITHDRAWN])
    )

    manager_requests = db.session.query(WFHRequest).filter(
        WFHRequest.reporting_manager == staff_id,
        WFHRequest.reporting_manager != WFHRequest.requester_id,  # Exclude if requester is the reporting manager
        WFHRequest.last_notification_status.in_([NotificationStatus.DELIVERED, NotificationStatus.CANCELLED, NotificationStatus.WITHDRAWN, NotificationStatus.EDITED, NotificationStatus.SELF_WITHDRAWN, NotificationStatus.ACKNOWLEDGED, NotificationStatus.AUTO_REJECTED])
    )

    combined_requests = requester_requests.union(manager_requests).order_by(WFHRequest.modified_at.desc())
    requests = combined_requests.all()

    result = []
    for request in requests:
        request_data = WFHRequestSchema().dump(request)
        result.append(request_data)

        request.notification_status = NotificationStatus.SEEN
        db.session.add(request)

    db.session.commit()

    output_data = {
        "status_code": 200,
        "message": "WFH Requests By Date",
        "data": result
    }

    return output_data, 200

@app.route('/wfhRequests/getAuditTrail/<int:request_id>', methods=['GET'])
def get_all_audit_trails(request_id):

    requests = db.session.query(AuditTrail).filter(
        AuditTrail.request_id == request_id,
    ).all()

    result = []
    for request in requests:
        request_data = AuditTrailSchema().dump(request)
        result.append(request_data)

    output_data = {
        "status_code": 200,
        "message": "WFH Requests By Date",
        "data": result
    }

    return output_data, 200

@app.route('/wfhRequests', methods=['POST'])
def create_wfh_request():
    data = request.get_json()

    try:
        requester_id = data.get('requester_id')
        reporting_manager = data.get('reporting_manager')
        dept = data.get('department')
        entries_data = data.get('entries', [])

        if not requester_id or not reporting_manager:
            return jsonify({"error": "Requester ID and Reporting Manager are required"}), 400

        overall_status = Status.APPROVED if requester_id == reporting_manager else Status.PENDING

        # Create a new WFHRequest
        wfh_request = WFHRequest(
            requester_id=requester_id,
            reporting_manager=reporting_manager,
            department=dept,
            overall_status=overall_status  # Default status
        )
        db.session.add(wfh_request)
        db.session.flush()  # Flush to get the generated wfh_request_id
        request_id = wfh_request.request_id    

        if reporting_manager == requester_id:
            audit_trail = AuditTrail(
                request_id=request_id,
                requester_id=requester_id,
                reporting_manager=reporting_manager,
                department=dept,
                status=Status.PENDING
            )
            db.session.add(audit_trail)
        else:
            second_audit_trail = AuditTrail(
                request_id=request_id,
                requester_id=requester_id,
                reporting_manager=reporting_manager,
                department=dept,
                status=overall_status
            )
            db.session.add(second_audit_trail)
            db.session.flush()

        
        # Create WFHRequestEntry instances for each entry
        for entry_data in entries_data:
            entry = WFHRequestEntry(
                entry_date=entry_data.get('entry_date'),
                reason=entry_data.get('reason'),
                duration=entry_data.get('duration'),
                action_reason = '',
                status=overall_status,
                request_id=request_id  # Explicitly set the request_id here
            )
            db.session.add(entry)
            db.session.flush()  # Flush to get the generated entry_id
            
            entry_audit_trail = AuditTrail(
                request_id=request_id,
                entry_id=entry.entry_id,
                requester_id=requester_id,
                reporting_manager=reporting_manager,
                department=dept,
                status=overall_status,
                entry_date=entry_data.get('entry_date'),
                reason=entry_data.get('reason'),
                duration=entry_data.get('duration'),
            )
            db.session.add(entry_audit_trail)

            task_name = "auto_reject"
            
            local_entry_date = datetime.strptime(entry_data.get('entry_date'), '%Y-%m-%d %H:%M:%S')
            # Get the previous working day at 00:00
            previous_working_day = get_previous_working_day(local_entry_date)

            worker.send_task(task_name, eta=previous_working_day, kwargs={'request_id': request_id, 'entry_id': entry.entry_id})

        if reporting_manager == requester_id:
            third_audit_trail = AuditTrail(
                request_id=request_id,
                requester_id=requester_id,
                reporting_manager=reporting_manager,
                department=dept,
                status=overall_status
            )
            db.session.add(third_audit_trail)

        db.session.commit()

        # Serialize the response
        wfh_request_schema = WFHRequestSchema()
        output_data = {
            "status_code": 201,
            "message": "WFH Request created",
            "data": wfh_request_schema.dump(wfh_request)
        }
        return output_data, 201

    except ValidationError as ve:
        return jsonify({"error": "Invalid data", "details": ve.messages}), 400
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    
@app.route("/wfhRequests/<int:requestID>", methods=["DELETE"])
def delete_WFHRequests(requestID):
    try:
        wfh_request = db.session.get(WFHRequest, requestID)

        db.session.delete(wfh_request)
        db.session.commit()
        
        output_data = {
            "status_code": 200,
            "message": f"WFH Request with ID {requestID} deleted successfully",
            "data": None
        }
        return output_data, 200
    
    except ValidationError as e:
        return jsonify({"errors": e.messages}), 400

# for managers only
@app.route("/wfhRequests/withdraw", methods=["PUT"])
def withdrawal_requests():
    data = request.get_json()
    request_id = data.get('request_id')
    entries_data = data.get('entry_ids')  # Expecting a list of objects with entry_id and reason

    # if not request_id or not entry_ids or not isinstance(entry_ids, list):
    #     return jsonify({"error": "request_id and entry_ids (as an array) are required"}), 400
    if not request_id or not entries_data or not isinstance(entries_data, list):
        return jsonify({"error": "request_id and entry_ids (as an array of objects) are required"}), 400

    try:
        wfh_request = WFHRequest.query.get(request_id)
        if not wfh_request:
            return jsonify({"error": "Request not found"}), 404
        requester_id = wfh_request.requester_id
        reporting_manager = wfh_request.reporting_manager
        department = wfh_request.department

        entry_ids = [entry.get('entry_id') for entry in entries_data]

        # Find the WFHRequestEntry records that match the request_id and are in the list of entry_ids
        entries = WFHRequestEntry.query.filter(
            WFHRequestEntry.request_id == request_id,
            WFHRequestEntry.entry_id.in_(entry_ids)
        ).all()

        if not entries:
            return jsonify({"error": "No matching entries found"}), 404

        reasons_map = {entry['entry_id']: entry['reason'] for entry in entries_data}

        # Update the status of the found entries to WITHDRAWN
        for entry in entries:
            entry.status = Status.WITHDRAWN
            entry.action_reason = reasons_map.get(entry.entry_id)
            entry_audit_trail = AuditTrail(
                request_id=request_id,
                entry_id=entry.entry_id,
                requester_id=requester_id,
                reporting_manager=reporting_manager,
                department=department,
                status=Status.WITHDRAWN,
                action_reason=reasons_map.get(entry.entry_id),
                entry_date=entry.entry_date,
                reason=entry.reason,
                duration=entry.duration,
            )
            db.session.add(entry_audit_trail)


        all_entries = WFHRequestEntry.query.filter_by(request_id=request_id).all()
        status_set = set(entry.status for entry in all_entries)

        if len(status_set) > 1:
            overall_status = Status.REVIEWED
        else:
            overall_status = Status.WITHDRAWN

        notification_status = NotificationStatus.WITHDRAWN

        request_record = WFHRequest.query.get(request_id)
        if request_record:
            if request_record.overall_status != overall_status:
                audit_trail = AuditTrail(
                    request_id=request_id,
                    requester_id=requester_id,
                    reporting_manager=reporting_manager,
                    department=department,
                    status=overall_status,
                )
                db.session.add(audit_trail)
            request_record.overall_status = overall_status
            request_record.notification_status = notification_status
            request_record.last_notification_status = notification_status
            db.session.commit()
        else:
            return jsonify({"error": "Request not found"}), 404
        
        db.session.commit()

        return jsonify({"message": "Entries updated successfully"}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route("/wfhRequests/approve", methods=["PUT"])
def approval_requests():
    data = request.get_json()
    request_id = data.get('request_id')
    entry_ids = data.get('entry_ids')  # Expecting a list of entry IDs

    if not request_id or not entry_ids or not isinstance(entry_ids, list):
        return jsonify({"error": "request_id and entry_ids (as an array) are required"}), 400

    try:
        wfh_request = WFHRequest.query.get(request_id)
        if not wfh_request:
            return jsonify({"error": "Request not found"}), 404
        requester_id = wfh_request.requester_id
        reporting_manager = wfh_request.reporting_manager
        department = wfh_request.department

        # Find the WFHRequestEntry records that match the request_id and are in the list of entry_ids
        entries = WFHRequestEntry.query.filter(
            WFHRequestEntry.request_id == request_id,
            WFHRequestEntry.entry_id.in_(entry_ids)
        ).all()

        if not entries:
            return jsonify({"error": "No matching entries found"}), 404

        # Update the status of the found entries to WITHDRAWN
        for entry in entries:
            entry.status = Status.APPROVED
            entry_audit_trail = AuditTrail(
                request_id=request_id,
                entry_id=entry.entry_id,
                requester_id=requester_id,
                reporting_manager=reporting_manager,
                department=department,
                status=Status.APPROVED,
                entry_date=entry.entry_date,
                reason=entry.reason,
                duration=entry.duration,
            )
            db.session.add(entry_audit_trail)

        all_entries = WFHRequestEntry.query.filter_by(request_id=request_id).all()
        status_set = set(entry.status for entry in all_entries)

        if len(status_set) > 1:
            overall_status = Status.REVIEWED
            
        else:
            overall_status = Status.APPROVED
        
        notification_status = NotificationStatus.EDITED
        
        request_record = WFHRequest.query.get(request_id)
        if request_record:
            if request_record.overall_status != overall_status:
                audit_trail = AuditTrail(
                    request_id=request_id,
                    requester_id=requester_id,
                    reporting_manager=reporting_manager,
                    department=department,
                    status=overall_status,
                )
                db.session.add(audit_trail)
            request_record.overall_status = overall_status
            request_record.notification_status = notification_status
            request_record.last_notification_status = notification_status
            db.session.commit()
        else:
            return jsonify({"error": "Request not found"}), 404
        
        db.session.commit()

        return jsonify({"message": "Entries updated successfully"}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@app.route("/wfhRequests/reject", methods=["PUT"])
def reject_requests():
    data = request.get_json()
    request_id = data.get('request_id')
    # entry_ids = data.get('entry_ids')  # Expecting a list of entry IDs
    entries_data = data.get('entry_ids')  # Expecting a list of objects with entry_id and reason


    # if not request_id or not entry_ids or not isinstance(entry_ids, list):
    #     return jsonify({"error": "request_id and entry_ids (as an array) are required"}), 400
    if not request_id or not entries_data or not isinstance(entries_data, list):
        return jsonify({"error": "request_id and entry_ids (as an array of objects) are required"}), 400
    
    try:
        wfh_request = WFHRequest.query.get(request_id)
        if not wfh_request:
            return jsonify({"error": "Request not found"}), 404
        requester_id = wfh_request.requester_id
        reporting_manager = wfh_request.reporting_manager
        department = wfh_request.department

        entry_ids = [entry.get('entry_id') for entry in entries_data]

        # Find the WFHRequestEntry records that match the request_id and are in the list of entry_ids
        entries = WFHRequestEntry.query.filter(
            WFHRequestEntry.request_id == request_id,
            WFHRequestEntry.entry_id.in_(entry_ids)
        ).all()

        if not entries:
            return jsonify({"error": "No matching entries found"}), 404
        
        reasons_map = {entry['entry_id']: entry['reason'] for entry in entries_data}


        # Update the status of the found entries to WITHDRAWN
        for entry in entries:
            entry.status = Status.REJECTED
            entry.action_reason = reasons_map.get(entry.entry_id)
            entry_audit_trail = AuditTrail(
                request_id=request_id,
                entry_id=entry.entry_id,
                requester_id=requester_id,
                reporting_manager=reporting_manager,
                department=department,
                status=Status.REJECTED,
                action_reason=reasons_map.get(entry.entry_id),
                entry_date=entry.entry_date,
                reason=entry.reason,
                duration=entry.duration,
            )
            db.session.add(entry_audit_trail)


        all_entries = WFHRequestEntry.query.filter_by(request_id=request_id).all()
        status_set = set(entry.status for entry in all_entries)

        if len(status_set) > 1:
            overall_status = Status.REVIEWED
        else:
            overall_status = Status.REJECTED

        notification_status = NotificationStatus.EDITED

        request_record = WFHRequest.query.get(request_id)
        if request_record:
            if request_record.overall_status != overall_status:
                audit_trail = AuditTrail(
                    request_id=request_id,
                    requester_id=requester_id,
                    reporting_manager=reporting_manager,
                    department=department,
                    status=overall_status,
                )
                db.session.add(audit_trail)
            request_record.overall_status = overall_status
            request_record.notification_status = notification_status
            request_record.last_notification_status = notification_status
            
            
            db.session.commit()
        else:
            return jsonify({"error": "Request not found"}), 404
        
        db.session.commit()

        return jsonify({"message": "Entries updated successfully"}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route("/wfhRequests/cancel", methods=["PUT"])
def cancel_requests():
    data = request.get_json()
    request_id = data.get('request_id')
    entry_ids = data.get('entry_ids')  # Expecting a list of entry IDs

    if not request_id or not entry_ids or not isinstance(entry_ids, list):
        return jsonify({"error": "request_id and entry_ids (as an array) are required"}), 400

    try:
        wfh_request = WFHRequest.query.get(request_id)
        if not wfh_request:
            return jsonify({"error": "Request not found"}), 404
        requester_id = wfh_request.requester_id
        reporting_manager = wfh_request.reporting_manager
        department = wfh_request.department

        # Find the WFHRequestEntry records that match the request_id and are in the list of entry_ids
        entries = WFHRequestEntry.query.filter(
            WFHRequestEntry.request_id == request_id,
            WFHRequestEntry.entry_id.in_(entry_ids)
        ).all()

        if not entries:
            return jsonify({"error": "No matching entries found"}), 404

        # Update the status of the found entries to WITHDRAWN
        for entry in entries:
            entry.status = Status.CANCELLED
            entry_audit_trail = AuditTrail(
                request_id=request_id,
                entry_id=entry.entry_id,
                requester_id=requester_id,
                reporting_manager=reporting_manager,
                department=department,
                status=Status.CANCELLED,
                entry_date=entry.entry_date,
                reason=entry.reason,
                duration=entry.duration,
            )
            db.session.add(entry_audit_trail)

        all_entries = WFHRequestEntry.query.filter_by(request_id=request_id).all()
        status_set = set(entry.status for entry in all_entries)

        if len(status_set) > 1:
            overall_status = Status.PENDING
        else:
            overall_status = Status.CANCELLED

        notification_status = NotificationStatus.CANCELLED

        request_record = WFHRequest.query.get(request_id)
        if request_record:
            if request_record.overall_status != overall_status:
                audit_trail = AuditTrail(
                    request_id=request_id,
                    requester_id=requester_id,
                    reporting_manager=reporting_manager,
                    department=department,
                    status=overall_status,
                )
                db.session.add(audit_trail)
            request_record.overall_status = overall_status
            request_record.notification_status = notification_status
            request_record.last_notification_status = notification_status
            db.session.commit()
        else:
            return jsonify({"error": "Request not found"}), 404
        
        db.session.commit()

        return jsonify({"message": "Entries updated successfully"}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# for staff
@app.route("/wfhRequests/revoke", methods=["PUT"])
def revoke_requests():
    data = request.get_json()
    request_id = data.get('request_id')
    entry_ids = data.get('entry_ids')  # Expecting a list of entry IDs

    if not request_id or not entry_ids or not isinstance(entry_ids, list):
        return jsonify({"error": "request_id and entry_ids (as an array) are required"}), 400

    try:
        request_record = WFHRequest.query.get(request_id)
        requester_id = request_record.requester_id
        reporting_manager = request_record.reporting_manager
        department = request_record.department

        matches = request_record.requester_id == request_record.reporting_manager

        # Find the WFHRequestEntry records that match the request_id and are in the list of entry_ids
        entries = WFHRequestEntry.query.filter(
            WFHRequestEntry.request_id == request_id,
            WFHRequestEntry.entry_id.in_(entry_ids)
        ).all()

        if not entries:
            return jsonify({"error": "No matching entries found"}), 404

        # Update the status of the found entries to WITHDRAWN
        for entry in entries:
            if matches:
                entry.status = Status.WITHDRAWN
                entry_audit_trail = AuditTrail(
                    request_id=request_id,
                    entry_id=entry.entry_id,
                    requester_id=requester_id,
                    reporting_manager=reporting_manager,
                    department=department,
                    status=Status.WITHDRAWN,
                    entry_date=entry.entry_date,
                    reason=entry.reason,
                    duration=entry.duration,
                )
                db.session.add(entry_audit_trail)
            else:
                entry.status = Status.PENDING_WITHDRAWN
                entry_audit_trail = AuditTrail(
                    request_id=request_id,
                    entry_id=entry.entry_id,
                    requester_id=requester_id,
                    reporting_manager=reporting_manager,
                    department=department,
                    status=Status.PENDING_WITHDRAWN,
                    entry_date=entry.entry_date,
                    reason=entry.reason,
                    duration=entry.duration,
                )
                db.session.add(entry_audit_trail)

        all_entries = WFHRequestEntry.query.filter_by(request_id=request_id).all()
        status_set = set(entry.status for entry in all_entries)

        if len(status_set) > 1:
            overall_status = Status.REVIEWED
        else:
            if matches:
                overall_status = Status.WITHDRAWN
            else:
                overall_status = Status.PENDING_WITHDRAWN

        notification_status = NotificationStatus.SELF_WITHDRAWN

        request_record = WFHRequest.query.get(request_id)
        if request_record:
            if request_record.overall_status != overall_status:
                audit_trail = AuditTrail(
                    request_id=request_id,
                    requester_id=requester_id,
                    reporting_manager=reporting_manager,
                    department=department,
                    status=overall_status,
                )
                db.session.add(audit_trail)
            request_record.overall_status = overall_status
            request_record.notification_status = notification_status
            request_record.last_notification_status = notification_status
            db.session.commit()
        else:
            return jsonify({"error": "Request not found"}), 404
        
        db.session.commit()

        return jsonify({"message": "Entries updated successfully"}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route("/wfhRequests/acknowledge", methods=["PUT"])
def acknowledge_requests():
    data = request.get_json()
    request_id = data.get('request_id')
    entry_ids = data.get('entry_ids')  # Expecting a list of entry IDs

    if not request_id or not entry_ids or not isinstance(entry_ids, list):
        return jsonify({"error": "request_id and entry_ids (as an array) are required"}), 400

    try:
        wfh_request = WFHRequest.query.get(request_id)
        if not wfh_request:
            return jsonify({"error": "Request not found"}), 404
        requester_id = wfh_request.requester_id
        reporting_manager = wfh_request.reporting_manager
        department = wfh_request.department

        # Find the WFHRequestEntry records that match the request_id and are in the list of entry_ids
        entries = WFHRequestEntry.query.filter(
            WFHRequestEntry.request_id == request_id,
            WFHRequestEntry.entry_id.in_(entry_ids)
        ).all()

        if not entries:
            return jsonify({"error": "No matching entries found"}), 404

        # Update the status of the found entries to WITHDRAWN
        for entry in entries:
            entry.status = Status.WITHDRAWN
            entry_audit_trail = AuditTrail(
                request_id=request_id,
                entry_id=entry.entry_id,
                requester_id=requester_id,
                reporting_manager=reporting_manager,
                department=department,
                status=Status.WITHDRAWN,
                entry_date=entry.entry_date,
                reason=entry.reason,
                duration=entry.duration,
            )
            db.session.add(entry_audit_trail)

        all_entries = WFHRequestEntry.query.filter_by(request_id=request_id).all()
        status_set = set(entry.status for entry in all_entries)

        if len(status_set) > 1:
            overall_status = Status.REVIEWED
        else:
            overall_status = Status.WITHDRAWN

        notification_status = NotificationStatus.ACKNOWLEDGED

        request_record = WFHRequest.query.get(request_id)
        if request_record:
            if request_record.overall_status != overall_status:
                audit_trail = AuditTrail(
                    request_id=request_id,
                    requester_id=requester_id,
                    reporting_manager=reporting_manager,
                    department=department,
                    status=overall_status,
                )
                db.session.add(audit_trail)
            request_record.overall_status = overall_status
            request_record.notification_status = notification_status
            request_record.last_notification_status = notification_status
            db.session.commit()
        else:
            return jsonify({"error": "Request not found"}), 404
        
        db.session.commit()

        return jsonify({"message": "Entries updated successfully"}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/wfhRequests/autoReject", methods=["PUT"])
def auto_reject_requests():
    data = request.get_json()
    request_id = data.get('request_id')
    entry_ids = data.get('entry_ids')  # Expecting a list of entry IDs

    if not request_id or not entry_ids or not isinstance(entry_ids, list):
        return jsonify({"error": "request_id and entry_ids (as an array) are required"}), 400

    try:
        # Find the WFHRequestEntry records that match the request_id and are in the list of entry_ids
        entries = WFHRequestEntry.query.filter(
            WFHRequestEntry.request_id == request_id,
            WFHRequestEntry.entry_id.in_(entry_ids)
        ).all()

        if not entries:
            return jsonify({"error": "No matching entries found"}), 404
        
        # Update the status of the found entries to AUTO_REJECTED
        for entry in entries:
            if (entry.status == Status.PENDING):
                entry.status = Status.AUTO_REJECTED

        all_entries = WFHRequestEntry.query.filter_by(request_id=request_id).all()
        status_set = set(entry.status for entry in all_entries)

        if len(status_set) > 1:
            overall_status = Status.REVIEWED
        else:
            overall_status = Status.AUTO_REJECTED  # Set overall status to AUTO_REJECTED if all entries are auto-rejected

        notification_status = NotificationStatus.AUTO_REJECTED  # Assuming a notification status for auto-rejection

        request_record = WFHRequest.query.get(request_id)
        if request_record:
            request_record.overall_status = overall_status
            request_record.notification_status = notification_status
            request_record.last_notification_status = notification_status
            db.session.commit()
        else:
            return jsonify({"error": "Request not found"}), 404

        db.session.commit()

        return jsonify({"message": "Entries updated successfully to AUTO_REJECTED"}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route('/wfhRequests/getAudit/<int:staff_id>', methods=['GET'])
def get_audit_trail_by_staff_id(staff_id):
    requester_requests = db.session.query(WFHRequest).filter(
        WFHRequest.requester_id == staff_id,
        WFHRequest.requester_id != WFHRequest.reporting_manager,  # Exclude if requester is the reporting manager
        WFHRequest.last_notification_status.in_([NotificationStatus.EDITED, NotificationStatus.SELF_WITHDRAWN, NotificationStatus.ACKNOWLEDGED, NotificationStatus.AUTO_REJECTED, NotificationStatus.WITHDRAWN])
    )

    manager_requests = db.session.query(WFHRequest).filter(
        WFHRequest.reporting_manager == staff_id,
        WFHRequest.reporting_manager != WFHRequest.requester_id,  # Exclude if requester is the reporting manager
        WFHRequest.last_notification_status.in_([NotificationStatus.DELIVERED, NotificationStatus.CANCELLED, NotificationStatus.WITHDRAWN, NotificationStatus.EDITED, NotificationStatus.SELF_WITHDRAWN, NotificationStatus.ACKNOWLEDGED, NotificationStatus.AUTO_REJECTED])
    )

    combined_requests = requester_requests.union(manager_requests).order_by(WFHRequest.modified_at.desc())
    requests = combined_requests.all()

    result = []
    for request in requests:
        request_data = WFHRequestSchema().dump(request)
        result.append(request_data)

        request.notification_status = NotificationStatus.SEEN
        db.session.add(request)

    db.session.commit()

    output_data = {
        "status_code": 200,
        "message": "WFH Requests By Date",
        "data": result
    }

    return output_data, 200

    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002)
