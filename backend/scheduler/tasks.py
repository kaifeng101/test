from celery import Celery, Task
from celery import signals
from datetime import datetime
import requests
import os
from dotenv import load_dotenv


load_dotenv()

BROKER_CONNECTION_STRING = os.getenv("BROKER_CONNECTION_STRING")
# BACKEND_CONNECTION_STRING = os.getenv("BACKEND_CONNECTION_STRING")
UPDATE_STATUS_URL = os.getenv("UPDATE_STATUS_URL")
UPDATE_REPORTING_MANAGER_URL = os.getenv("UPDATE_REPORTING_MANAGER_URL")

worker = Celery('tasks', 
                broker=BROKER_CONNECTION_STRING)


@worker.task(name='auto_reject')
def auto_reject(request_id, entry_id):
    payload = {
        "request_id": request_id,
        "entry_ids": [entry_id]  # Assuming you want to send just one entry_id
    }

    response = requests.put(UPDATE_STATUS_URL, json=payload)

    if response.status_code == 200:
        return 'Successful handling: Entries auto-rejected'
    else:
        return f'Failed to update: {response.json().get("error", "Unknown error")}'
    


@worker.task(name='replace_to_temp_mgr')
def replace_to_temp_mgr(temp_manager, affected_staff_ids):
    for staff_id in affected_staff_ids:
        payload = {
            "reporting_manager": temp_manager  
        }

        response = requests.put(f"{UPDATE_REPORTING_MANAGER_URL}?staff_id={staff_id}", json=payload)

        if response.status_code == 200:
            print(f"Successfully updated reporting manager for staff_id {staff_id}")
        else:
            print(f"Failed to update reporting manager for staff_id {staff_id}: {response.json()}")


@worker.task(name='replace_to_original_mgr')
def replace_to_original_mgr(original_manager, affected_staff_ids):
    for staff_id in affected_staff_ids:
        payload = {
            "reporting_manager": original_manager 
        }

        response = requests.put(f"{UPDATE_REPORTING_MANAGER_URL}?staff_id={staff_id}", json=payload)

        if response.status_code == 200:
            print(f"Successfully updated reporting manager for staff_id {staff_id}")
        else:
            print(f"Failed to update reporting manager for staff_id {staff_id}: {response.json()}")
