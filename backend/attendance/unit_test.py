import unittest
from app import app, get_employee_details
import json

# Note:
# Modify date for "test_no_wfh_requests()" -> date that have no wfh request
# Modify date for "test_wfh_requests_exist()" -> date that have wfh request
# Modify date for "test_wfh_request_data_format()" -> date should have some employee wfh and some in office

class AttendanceServiceTestCase(unittest.TestCase):
    
    def setUp(self):
        self.app = app.test_client()
        self.app_context = app.app_context()
        self.app_context.push()

    def tearDown(self):
        self.app_context.pop()

    def test_healthcheck(self):
        # Send a GET request to the health check endpoint
        response = self.app.get('/attendance/healthcheck')
        
        # Assert the status code is 200
        self.assertEqual(response.status_code, 200)
        
        # Assert the JSON response data
        self.assertEqual(response.get_json(), {"message": "attendance service reached"})

    def test_valid_date_format(self):
        # Test the attendance retrieval with a valid date format
        response = self.app.get('/attendance/?date=2024-01-01')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('data', data)
        self.assertIsInstance(data['data'], list) # Ensure 'data' is a list

    def test_missing_date(self):
        response = self.app.get('/attendance/?date=')
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertEqual(data['message'], "Invalid date format. Please use YYYY-MM-DD.")
        
    def test_invalid_date_format(self):
        response = self.app.get('/attendance/?date=01-01-2024')
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertEqual(data['message'], 'Invalid date format. Please use YYYY-MM-DD.')
    
    def test_no_wfh_requests(self):
        response = self.app.get('/attendance/?date=2024-09-01')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        
        # Assert that there are no WFH (working from home) records for the given date
        wfh_records = [record for record in data['data'] if record.get('workingFromHome') == True]
        self.assertEqual(len(wfh_records), 0)  # Expect no working from home records
    
    def test_wfh_requests_exist(self):
        response = self.app.get('/attendance/?date=2024-10-30')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        
        # Assert that there are WFH (working from home) records for the given date
        wfh_records = [record for record in data['data'] if record.get('workingFromHome') == True]
        self.assertGreater(len(wfh_records), 0)  # Expect working from home records
    
    def test_wfh_request_data_format(self):
        # Call the real endpoint with a specific date
        response = self.app.get('/attendance/?date=2024-10-30')
        self.assertEqual(response.status_code, 200)
        
        # Parse the JSON response
        data = json.loads(response.data)
        
        # Check if the 'data' field is a list
        self.assertIsInstance(data['data'], list)
        
        # Iterate through each record to validate the workingFromHome and date relationship
        for record in data['data']:
            # Check if required attributes are present
            self.assertIn('date', record)
            self.assertIn('dept', record)
            self.assertIn('employee_name', record)
            self.assertIn('request_id', record)
            self.assertIn('requester_id', record)
            self.assertIn('workingFromHome', record)
            self.assertIn('reason', record)
            self.assertIn('duration', record)
        

            # Validate the relationship between workingFromHome and date
            if record.get('workingFromHome'):
                # If workingFromHome is true, date must not be null
                self.assertIsNotNone(record.get('date'), "Date should not be null when workingFromHome is True.")
            else:
                # If workingFromHome is false, date must be null
                self.assertIsNone(record.get('date'), "Date should be null when workingFromHome is False.")
            
    def test_get_employee_details(self):
        # Test the function with a real employee ID (make sure this ID exists)
        employee_details = get_employee_details(130002) 
        
        # Ensure the response is not None
        self.assertIsNotNone(employee_details)
        
        # Ensure that 'name' and 'dept' keys exist in the response
        self.assertIn("name", employee_details)
        self.assertIn("dept", employee_details)

        # Ensure that the 'name' and 'dept' have some data (not empty or None)
        self.assertTrue(employee_details["name"])
        self.assertTrue(employee_details["dept"])

if __name__ == "__main__":
    unittest.main()
