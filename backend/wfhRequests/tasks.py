from celery import Celery, Task
from celery import signals
from datetime import datetime
import requests
import os

BROKER_CONNECTION_STRING = os.getenv("BROKER_CONNECTION_STRING")
BACKEND_CONNECTION_STRING = os.getenv("BACKEND_CONNECTION_STRING")
UPDATE_STATUS_URL = os.getenv("UPDATE_STATUS_URL")

worker = Celery('tasks', 
                broker=BROKER_CONNECTION_STRING, 
                backend=BACKEND_CONNECTION_STRING)


@worker.task(name='auto_reject')
def auto_reject(request_id, entry_id):

    # Prepare the JSON payload for the PUT request
    payload = {
        "request_id": request_id,
        "entry_ids": [entry_id]  # Assuming you want to send just one entry_id
    }

    # Make the PUT request to the autoReject endpoint
    response = requests.put(UPDATE_STATUS_URL, json=payload)

    if response.status_code == 200:
        return 'Successful handling: Entries auto-rejected'
    else:
        return f'Failed to update: {response.json().get("error", "Unknown error")}'
