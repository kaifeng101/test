from datetime import datetime, timedelta
import pytz

sg_timezone = pytz.timezone('Asia/Singapore')

# Helper function to get the previous working day at 00:00
def get_previous_working_day(date):
    # Subtract a day from the date
    previous_day = date - timedelta(days=1)
    
    # If the previous day is Saturday (5), skip to Friday
    if previous_day.weekday() == 5:  # Saturday
        previous_day -= timedelta(days=1)
    # If the previous day is Sunday (6), skip to Friday
    elif previous_day.weekday() == 6:  # Sunday
        previous_day -= timedelta(days=2)
    
    # # Set time to 00:00 for the previous working day
    previous_day = previous_day.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Localize to Singapore time
    previous_day = sg_timezone.localize(previous_day)
    
    return previous_day

