import unittest
from marshmallow import ValidationError
from sqlalchemy.exc import SQLAlchemyError
from unittest.mock import patch, MagicMock
from app import app, db, get_delegate_by_delegate_id, update_delegate_status
from flask import json
from datetime import datetime

from factory import Employee

class EmployeeTest(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        self.client = app.test_client()
        self.app_context = app.app_context()
        self.app_context.push()

        # Sample employee data to update
        self.sample_employee = {
            "staff_fname": "John",
            "staff_lname": "Doe",
            "dept": "Finance",
            "position": "Analyst",
            "country": "USA",
            "email": "john.doe@example.com",
            "reporting_manager": 2,
            "role": "STAFF"
        }
        
        # Sample credential data for creating credentials
        self.sample_credential_data = {
            "staff_id": 1,
            "password": 123456  # Assuming password is an integer based on previous context
        }

    def tearDown(self):
        self.app_context.pop()

    def test_healthcheck(self):
        response = self.app.get('/employees/healthcheck')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['message'], 'employee service reached')

    def test_get_all_employee(self):
        response = self.app.get('/employees')
        self.assertEqual(response.status_code, 200)

        data = json.loads(response.data)
        self.assertIn('data', data)
        self.assertIsInstance(data['data'], dict)  # Ensure 'data' is a dict

        if len(data['data']) > 0:
            first_request = data['data']
            self.assertIn('total', first_request)
            self.assertIn('pages', first_request)
            self.assertIn('current_page', first_request)
            self.assertIn('per_page', first_request)
            self.assertIsInstance(first_request['employee'], list)  # Ensure entries are a list

    @patch('app.db.paginate')  # Adjust the import path based on your structure
    def test_get_all_employee_no_employees(self, mock_paginate):
        """Test the case where no employees are found (404)."""
        mock_paginate.return_value.total = 0  # Simulate no employees found
        mock_paginate.return_value.items = []  # Simulate an empty list of employees
        
        response = self.client.get('/employees')
        self.assertEqual(response.status_code, 404)

        data = json.loads(response.data)
        self.assertEqual(data['message'], "No Employee found")

    @patch('app.db.paginate')  # Adjust the import path based on your structure
    def test_get_all_employee_page_out_of_range(self, mock_paginate):
        """Test the case where the requested page is out of range (405)."""
        mock_paginate.return_value.total = 10  # Simulate total of 10 employees
        mock_paginate.return_value.pages = 5  # Simulate 5 total pages
        mock_paginate.return_value.page = 6  # Simulate that the current page is out of range
        mock_paginate.return_value.items = []  # Simulate no items

        response = self.client.get('/employees?page=6')
        self.assertEqual(response.status_code, 405)

        data = json.loads(response.data)
        self.assertEqual(data['message'], "Page 6 out of range")
        
    def test_get_employee_by_staff_id(self):
        # Let's say we added an employee with staff_id = 140002 during setup
        response = self.app.get('/employees/?staff_id=140002')  # Pass staff_id as a query parameter
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)

        self.assertIn('data', data)
        self.assertIsInstance(data['data'], list)  # Since you are using `many=True`, it should return a list
        self.assertGreater(len(data['data']), 0)  # Ensure that the list contains data

        # Further assertions can be made based on the specific structure of the employee data
        first_employee = data['data'][0]
        self.assertIn('staff_id', first_employee)
        self.assertEqual(first_employee['staff_id'], 140002)  # Check that the correct employee is returned
        self.assertIn('staff_fname', first_employee)  # Check other fields as necessary

    @patch('app.db.session')  # Mock the session object in the app
    def test_update_employee(self, mock_session):
        # Arrange
        staff_id = 1  # Assuming you want to update employee with staff_id = 1
        mock_employee = MagicMock()
        mock_employee.staff_id = staff_id
        
        # Set up the mock to return the employee object
        mock_session.execute.return_value.scalars.return_value.one_or_none.return_value = mock_employee
        
        # Act
        response = self.client.put(f'/employees/?staff_id={staff_id}', 
                                    data=json.dumps(self.sample_employee), 
                                    content_type='application/json')
        
        # Assert
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status_code'], 200)
        self.assertIn('message', data)
        self.assertEqual(data['message'], f"Employee details updated successfully for staff_id {staff_id}")

        # Check if the update was called correctly
        for key, value in self.sample_employee.items():
            self.assertEqual(getattr(mock_employee, key), value)

        # Ensure commit was called
        mock_session.commit.assert_called_once()
        
    @patch('app.db.session')  # Mock the session object in the app
    @patch('app.EmployeeSchema')  # Mock the EmployeeSchema to control its behavior
    def test_create_employee(self, MockEmployeeSchema, mock_session):
        # Arrange
        mock_employee_instance = MagicMock()
        MockEmployeeSchema.return_value.load.return_value = mock_employee_instance  # Mock loading employee data
        mock_session.add = MagicMock()  # Mock the add method
        mock_session.commit = MagicMock()  # Mock the commit method
        MockEmployeeSchema.return_value.dump.return_value = self.sample_employee  # Mock the dump method
        
        # Act
        response = self.client.post('/employees', 
                                     data=json.dumps(self.sample_employee), 
                                     content_type='application/json')
        
        # Assert
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['status_code'], 201)
        self.assertIn('message', data)
        self.assertEqual(data['message'], "Employee created")
        self.assertIn('data', data)

        # Ensure the employee was added to the session and committed
        mock_session.add.assert_called_once_with(mock_employee_instance)
        mock_session.commit.assert_called_once()
      
    @patch('app.db.session')  # Mock the session object in the app
    @patch('app.CredentialSchema')  # Mock the CredentialSchema to control its behavior
    def test_create_credential(self, MockCredentialSchema, mock_session):
        # Arrange
        mock_credential_instance = MagicMock()
        MockCredentialSchema.return_value.load.return_value = mock_credential_instance  # Mock loading credential data
        mock_session.add = MagicMock()  # Mock the add method
        mock_session.commit = MagicMock()  # Mock the commit method
        MockCredentialSchema.return_value.dump.return_value = self.sample_credential_data  # Mock the dump method
        
        # Act
        response = self.client.post('/employees/credential', 
                                     data=json.dumps(self.sample_credential_data), 
                                     content_type='application/json')
        
        # Assert
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['status_code'], 201)
        self.assertIn('message', data)
        self.assertEqual(data['message'], "Employee Credential created")
        self.assertIn('data', data)

        # Ensure the credential was added to the session and committed
        mock_session.add.assert_called_once_with(mock_credential_instance)
        mock_session.commit.assert_called_once()  

    @patch('app.db.session')  # Mock the session object in the app
    @patch('app.CredentialSchema')  # Mock the CredentialSchema
    def test_authenticate_employee_success(self, MockCredentialSchema, mock_session):
        # Arrange
        staff_id = 1
        mock_credential_instance = MagicMock()
        mock_credential_instance.password = 'my_secure_password'
        
        # Mocking the schema behavior
        MockCredentialSchema.return_value.dump.return_value = {'password': mock_credential_instance.password}
        
        # Mock the query result
        mock_session.execute.return_value.scalars.return_value.one_or_none.return_value = mock_credential_instance
        
        # Act
        response = self.client.get(f'/employees/auth?staff_id={staff_id}')
        
        # Assert
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status_code'], 200)
        self.assertEqual(data['message'], "Employee Password")
        self.assertEqual(data['data'], mock_credential_instance.password)

    def test_get_other_reporting_manager(self):
        response = self.app.get('/employees/?dept=Sales')  # Pass dept as a query parameter
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)

        self.assertIn('data', data)
        self.assertIsInstance(data['data'], list)  # Since you are using `many=True`, it should return a list
        self.assertGreater(len(data['data']), 0)  # Ensure that the list contains data
        
    @patch('app.db.session')  # Mock the db.session to prevent actual database calls
    @patch('app.DelegateSchema')  # Mock the DelegateSchema
    def test_get_delegate_by_delegate_id_success(self, MockDelegateSchema, mock_session):
        # Arrange
        delegate_id = 1
        mock_delegate_instance = MagicMock()
        mock_delegate_instance.delegate_id = delegate_id
        mock_delegate_instance.name = "John Doe"  # Add other delegate attributes as needed
        
        # Mock the schema behavior
        mock_schema_instance = MockDelegateSchema.return_value
        mock_schema_instance.dump.return_value = [{'delegate_id': delegate_id, 'name': "John Doe"}]

        # Mock the database call to return the delegate instance
        mock_session.execute.return_value.scalars.return_value.all.return_value = [mock_delegate_instance]
        
        # Act
        result = get_delegate_by_delegate_id(delegate_id)

        # Assert
        self.assertEqual(result, [{'delegate_id': delegate_id, 'name': "John Doe"}])
        MockDelegateSchema.assert_called_once_with(many=True)
        mock_session.execute.assert_called_once()

    @patch('app.db.session')  # Mock the db.session to prevent actual database calls
    @patch('app.DelegateSchema')  # Mock the DelegateSchema
    def test_get_delegate_by_delegate_id_not_found(self, MockDelegateSchema, mock_session):
        # Arrange
        delegate_id = 2
        
        # Mock the schema behavior
        mock_schema_instance = MockDelegateSchema.return_value
        mock_schema_instance.dump.return_value = []
        
        # Mock the database call to return no delegates
        mock_session.execute.return_value.scalars.return_value.all.return_value = []

        # Act
        result = get_delegate_by_delegate_id(delegate_id)

        # Assert
        self.assertEqual(result, [])
        MockDelegateSchema.assert_called_once_with(many=True)
        mock_session.execute.assert_called_once()
        
    @patch('app.db.session')  # Mock the db.session to prevent actual database calls
    @patch('app.DelegateSchema')  # Mock the DelegateSchema
    @patch('app.create_delegate_status_record')  # Mock the create_delegate_status_record function
    def test_create_delegate_success(self, mock_create_delegate_status_record, MockDelegateSchema, mock_session):
        # Arrange
        mock_delegate_instance = MagicMock()
        mock_delegate_instance.delegate_id = 1
        mock_delegate_instance.delegate_from = "2024-10-01"
        mock_delegate_instance.delegate_to = "2024-10-05"
        mock_delegate_instance.status.value = "Active"

        # Mock the schema behavior
        mock_schema_instance = MockDelegateSchema.return_value
        mock_schema_instance.load.return_value = mock_delegate_instance
        mock_schema_instance.dump.return_value = {'delegate_id': 1, 'status': "Active"}

        # Mock the database call
        mock_session.add.return_value = None
        mock_session.flush.return_value = None
        
        # Prepare the JSON data to send
        json_data = {
            "delegate_from": "2024-10-01",
            "delegate_to": "2024-10-05",
            "status": "Active",
        }

        # Act
        response = self.app.post('/employees/delegate', data=json.dumps(json_data), content_type='application/json')

        # Assert
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['message'], "Delegate Record created")
        self.assertIn('data', data)
        
        # Check that the create_delegate_status_record was called with correct arguments
        mock_create_delegate_status_record.assert_called_once_with({
            "delegate_id": mock_delegate_instance.delegate_id,
            "delegate_from": mock_delegate_instance.delegate_from,
            "delegate_to": mock_delegate_instance.delegate_to,
            "status": mock_delegate_instance.status.value,
        })

    @patch('app.db.session')  # Mock the db.session to prevent actual database calls
    @patch('app.DelegateSchema')  # Mock the DelegateSchema
    def test_create_delegate_validation_error(self, MockDelegateSchema, mock_session):
        # Arrange
        mock_schema_instance = MockDelegateSchema.return_value
        mock_schema_instance.load.side_effect = ValidationError({"error": ["Invalid data"]})

        # Prepare the JSON data to send
        json_data = {
            "delegate_from": "invalid_date",
            "delegate_to": "another_invalid_date",
            "status": "Active",
        }

        # Act
        response = self.app.post('/employees/delegate', data=json.dumps(json_data), content_type='application/json')

        # Assert
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('errors', data)
        self.assertEqual(data['errors'], {"error": ["Invalid data"]})    
        
    @patch('app.db.session')  # Mock the db.session to prevent actual database calls
    @patch('app.DelegateStatusHistorySchema')  # Mock the DelegateStatusHistorySchema
    @patch('app.get_delegate_by_delegate_id')  # Mock the get_delegate_by_delegate_id function
    @patch('app.get_employee_by_staff_id')  # Mock the get_employee_by_staff_id function
    @patch('app.worker')  # Mock the worker for task sending
    def test_create_delegate_status_record_success(self, mock_worker, mock_get_employee_by_staff_id, mock_get_delegate_by_delegate_id, MockDelegateStatusHistorySchema, mock_session):
        # Arrange
        mock_delegate_status_history_instance = MagicMock()
        mock_delegate_status_history_instance.delegate_id = 1
        mock_delegate_status_history_instance.status = "accepted"

        # Mock the schema behavior
        mock_schema_instance = MockDelegateStatusHistorySchema.return_value
        mock_schema_instance.load.return_value = mock_delegate_status_history_instance
        mock_schema_instance.dump.return_value = {'delegate_id': 1, 'status': "accepted"}

        # Mock the database call
        mock_session.add.return_value = None
        mock_session.commit.return_value = None

        # Mock the delegate details returned by get_delegate_by_delegate_id
        mock_get_delegate_by_delegate_id.return_value = [{
            'delegate_id': 1,
            'start_date': "2024-10-01T00:00:00Z",
            'end_date': "2024-10-05T00:00:00Z",
            'delegate_from': "manager_id",
            'delegate_to': "temp_manager_id"
        }]

        # Mock the affected employees
        mock_get_employee_by_staff_id.return_value = [{
            'data': [{'staff_id': 101}, {'staff_id': 102}]
        }]

        # Prepare the JSON data to send
        json_data = {
            "delegate_id": 1,
            "status": "accepted"
        }

        # Act
        response = self.app.post('/employees/delegate-status-history', data=json.dumps(json_data), content_type='application/json')

        # Assert
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['message'], "Delegate Record created")
        self.assertIn('data', data)

        # Check that tasks were sent to the worker
        mock_worker.send_task.assert_any_call("replace_to_temp_mgr", eta="2024-10-01T00:00:00Z", kwargs={'temp_manager': "temp_manager_id", 'affected_staff_ids': [101, 102]})
        mock_worker.send_task.assert_any_call("replace_to_original_mgr", eta="2024-10-05T00:00:00Z", kwargs={'original_manager': "manager_id", 'affected_staff_ids': [101, 102]})

    @patch('app.db.session')  # Mock the db.session to prevent actual database calls
    @patch('app.DelegateStatusHistorySchema')  # Mock the DelegateStatusHistorySchema
    def test_create_delegate_status_record_validation_error(self, MockDelegateStatusHistorySchema, mock_session):
        # Arrange
        mock_schema_instance = MockDelegateStatusHistorySchema.return_value
        mock_schema_instance.load.side_effect = ValidationError({"error": ["Invalid data"]})

        # Prepare the JSON data to send
        json_data = {
            "delegate_id": 1,
            "status": "invalid_status"
        }

        # Act
        response = self.app.post('/employees/delegate-status-history', data=json.dumps(json_data), content_type='application/json')

        # Assert
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('errors', data)
        self.assertEqual(data['errors'], {"error": ["Invalid data"]})
        
    @patch('app.db.session')  # Mock the db.session to prevent actual database calls
    def test_update_delegate_status(self, mock_session):
        # Arrange
        delegate_id = 1
        new_status = "active"
        
        mock_delegate = MagicMock()
        mock_delegate.status = "pending"
        mock_delegate.notification_status = "pending"

        # Mock the behavior of the select statement
        mock_session.execute.return_value.scalars.return_value.one_or_none.return_value = mock_delegate
        
        # Act
        update_delegate_status(delegate_id, new_status)

        # Assert
        self.assertEqual(mock_delegate.status, new_status.upper())
        self.assertEqual(mock_delegate.notification_status, new_status.upper())
        mock_session.commit.assert_called_once()  # Ensure commit was called 
        
    def test_get_delegate_audit_trail(self):
        # Act
        response = self.app.get('/employees/delegate')
        
        # Assert status code
        self.assertEqual(response.status_code, 200)

        # Load response data
        data = json.loads(response.data)
        
        # Check for 'data' key in the response
        self.assertIn('data', data)
        self.assertEqual(data['status_code'], 200)  # Ensure status_code is correct
        self.assertEqual(data['message'], "Delegate Record")  # Ensure message is correct

        # Check if 'data' contains delegate records
        if len(data['data']) > 0:
            first_request = data['data'][0]  # Get the first delegate record
            
            # Check for expected keys in the first delegate record
            self.assertIn('delegate_id', first_request)  # Change this according to your model
            self.assertIn('status', first_request)        # Change this according to your model
            
            # Ensure 'delegate_id' is an integer (or other type as needed)
            self.assertIsInstance(first_request['delegate_id'], int)  # Adjust according to your schema
            self.assertIsInstance(first_request['status'], str)  # Adjust according to your schema
    
    @patch('app.db.session')  # Mock the db.session
    def test_get_delegate_audit_trail_no_records(self, mock_session):
        # Arrange
        # Mock the case where no delegate records are found
        mock_session.execute.return_value.scalars.return_value.all.return_value = []

        # Act
        response = self.app.get('/employees/delegate')

        # Assert
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertEqual(data['status_code'], 404)
        self.assertEqual(data['message'], "No delegate record found")
        self.assertIsNone(data['data'])  # Ensure data is None
    
    @patch('app.db.session.execute')  
    @patch('app.DelegateSchema')  
    def test_get_delegate_by_staff_id_success(self, mock_schema, mock_execute):
        # Mocking the return value of the delegate records
        mock_delegate_records = [
            MagicMock(delegate_id=1, status='active'),
            MagicMock(delegate_id=2, status='inactive'),
        ]

        # Set the return value for the execute method
        mock_execute.return_value.scalars.return_value.all.return_value = mock_delegate_records

        # Mock the schema dump method to return a list of dictionaries
        mock_schema.return_value.dump.return_value = [
            {'delegate_id': record.delegate_id, 'status': record.status} for record in mock_delegate_records
        ]

        staff_id = 1  # Example valid staff_id
        
        # Act
        response = self.app.get(f'/employees/delegate/{staff_id}')

        # Assert status code
        self.assertEqual(response.status_code, 200)

        # Load response data
        data = json.loads(response.data)

        # Check for 'data' key in the response
        self.assertIn('data', data)
        self.assertEqual(data['status_code'], 200)  # Ensure status_code is correct
        self.assertEqual(data['message'], f"Delegate records for staff_id {staff_id}")  # Ensure message is correct

        # Check if 'data' contains delegate records
        self.assertGreater(len(data['data']), 0)  # Ensure we have records
        first_request = data['data'][0]  # Get the first delegate record
        
        # Check for expected keys in the first delegate record
        self.assertIn('delegate_id', first_request)
        self.assertIn('status', first_request)

        # Ensure 'delegate_id' is an integer
        self.assertIsInstance(first_request['delegate_id'], int)  
        self.assertIsInstance(first_request['status'], str)

        # Ensure entries are a list
        self.assertIsInstance(data['data'], list)  # Ensure entries are a list
    
    @patch('app.db.session.execute')  
    def test_get_delegate_by_staff_id_not_found(self, mock_execute):
        staff_id = 9999  # Example staff_id that does not exist

        # Mocking the return value of an empty result set
        mock_execute.return_value.scalars.return_value.all.return_value = []

        # Act
        response = self.app.get(f'/employees/delegate/{staff_id}')

        # Assert status code for not found
        self.assertEqual(response.status_code, 404)

        # Load response data
        data = json.loads(response.data)

        # Check for 'data' key in the response
        self.assertIn('data', data)
        self.assertEqual(data['status_code'], 404)  # Ensure status_code is correct
        self.assertEqual(data['message'], f"No delegate records found for staff_id {staff_id}")  # Ensure message is correct

    @patch('app.db.session.execute')  
    @patch('app.DelegateStatusHistorySchema')  
    def test_get_delegate_status_audit_trail_success(self, mock_schema, mock_execute):
        delegate_id = 1  # Example delegate_id that exists

        # Mocking delegate status history records
        mock_status_history_records = [
            MagicMock(delegate_id=delegate_id, status='active', reason='Approved'),
            MagicMock(delegate_id=delegate_id, status='inactive', reason='Revoked'),
        ]

        # Mock the execute method return value
        mock_execute.return_value.scalars.return_value.all.return_value = mock_status_history_records

        # Mock the schema dump method to return a list of dictionaries
        mock_schema.return_value.dump.return_value = [
            {'delegate_id': record.delegate_id, 'status': record.status, 'reason': record.reason} 
            for record in mock_status_history_records
        ]

        # Act
        response = self.app.get(f'/employees/delegate-status-history/{delegate_id}')

        # Assert status code
        self.assertEqual(response.status_code, 200)

        # Load response data
        data = json.loads(response.data)

        # Check for 'data' key in the response
        self.assertIn('data', data)
        self.assertEqual(data['status_code'], 200)  # Ensure status_code is correct
        self.assertEqual(data['message'], "Delegate Status History")  # Ensure message is correct

        # Check if 'data' contains status history records
        self.assertGreater(len(data['data']), 0)  # Ensure we have records
        first_request = data['data'][0]  # Get the first status record

        # Check for expected keys in the first status record
        self.assertIn('delegate_id', first_request)
        self.assertIn('status', first_request)
        self.assertIn('reason', first_request)

        # Ensure 'delegate_id' is an integer and other fields have correct types
        self.assertIsInstance(first_request['delegate_id'], int)
        self.assertIsInstance(first_request['status'], str)
        self.assertIsInstance(first_request['reason'], str)

        # Ensure entries are a list
        self.assertIsInstance(data['data'], list)  # Ensure entries are a list

    @patch('app.db.session.execute')  
    def test_get_delegate_status_audit_trail_not_found(self, mock_execute):
        delegate_id = 9999  # Example delegate_id that does not exist

        # Mocking the return value of an empty result set
        mock_execute.return_value.scalars.return_value.all.return_value = []

        # Act
        response = self.app.get(f'/employees/delegate-status-history/{delegate_id}')

        # Assert status code for not found (similar logic as above)
        self.assertEqual(response.status_code, 200)  # If you want to handle empty lists differently, adjust this

        # Load response data
        data = json.loads(response.data)

        # Check for 'data' key in the response
        self.assertIn('data', data)
        self.assertEqual(data['status_code'], 200)  # Ensure status_code is correct
        self.assertEqual(data['message'], "Delegate Status History")  # Ensure message is correct

        # Check if 'data' is an empty list
        self.assertEqual(len(data['data']), 0)  # Ensure we have no records

    @patch('app.db.session.execute')  
    def test_get_delegate_status_audit_trail_error(self, mock_execute):
        delegate_id = 1  # Example delegate_id

        # Mocking the SQLAlchemy error
        mock_execute.side_effect = SQLAlchemyError("Database error")

        # Act
        response = self.app.get(f'/employees/delegate-status-history/{delegate_id}')

        # Assert status code for internal server error
        self.assertEqual(response.status_code, 500)

        # Load response data
        data = json.loads(response.data)

        # Check for error message in the response
        self.assertIn('error', data)
        self.assertEqual(data['error'], "Database error")  # Ensure error message is correct

    

    @patch('app.db.session.query')  
    def test_get_notifications_length_no_notifications(self, mock_query):
        staff_id = 1  # Example staff ID

        # Mocking the return value of both counts to be 0
        mock_requester_query = MagicMock()
        mock_requester_query.filter.return_value.count.return_value = 0  # No accepted/rejected requests
        mock_query.return_value = mock_requester_query

        mock_manager_query = MagicMock()
        mock_manager_query.filter.return_value.count.return_value = 0  # No pending requests
        mock_query.return_value = mock_manager_query

        # Act
        response = self.app.get(f'/employees/getDelegateNotiLength/{staff_id}')

        # Assert status code
        self.assertEqual(response.status_code, 200)

        # Load response data
        data = json.loads(response.data)

        # Check for expected keys and values
        self.assertIn('data', data)
        self.assertEqual(data['status_code'], 200)  # Ensure status_code is correct
        self.assertEqual(data['message'], "Total Unseen Notifications Length")  # Ensure message is correct
        self.assertEqual(data['data'], 0)  # 0 + 0 = 0 total active requests


if __name__ == '__main__':
    unittest.main()
