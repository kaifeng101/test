import * as React from 'react';
import { useState,useEffect } from 'react';
import axios from 'axios';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';

dayjs.extend(isToday);




const AttendanceCalendar = () => {
  const [employees, setEmployees] = useState([]);
  const [transformedData, setTransformedData] = useState({}); // Bind transformedData to state
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const selectedDateString = selectedDate.format('YYYY-MM-DD'); 
  console.log(selectedDateString);

   // Fetch data whenever the selectedDate changes
   useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`https://scrumdaddybackend.studio/attendance/`, {
          params: {
            date: selectedDateString, 
          },
        });
        const employees = response.data.data;
        setEmployees(employees);
        console.log(employees);
      } catch (error) {
        console.error('Error fetching attendance data:', error);
      }
    };
    fetchData();
  }, [selectedDateString]);

  // Transform employees data into a structured object (by date) whenever employees change
  useEffect(() => {
    const transformed = employees.reduce((acc, employee) => {
      const { date } = employee;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(employee);
      return acc;
    }, {});
    setTransformedData(transformed); // Update the transformedData state
    console.log('Transformed Data:', transformed);
  }, [employees]);

  console.log('Transformed Data:', transformedData);

  const [isModalOpen, setModalOpen] = useState(false);
  const [employeesForSelectedDate, setEmployeesForSelectedDate] = useState([]);
  const [noEmployees, setNoEmployees] = useState(false);
  const [workingFromHomeFilter, setWorkingFromHomeFilter] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [viewType, setViewType] = useState('monthly');

  const departments = [...new Set(employees.map(emp => emp.dept))];

  const handleDateClick = (newDate) => {
     setSelectedDate(newDate)
    const newDateString = newDate.format('YYYY-MM-DD');
    console.log('Selected Date:', newDateString);

    // Fetch employees for the clicked date directly from the transformedData
    let employeesForDate = transformedData[newDateString] || [];
   

    // Filter based on the selected checkboxes
    if (workingFromHomeFilter) {
      employeesForDate = employeesForDate.filter((employee) => employee.workingFromHome);
    }

    // Filter by selected department if any
    if (selectedDepartment) {
      employeesForDate = employeesForDate.filter((employee) => employee.dept === selectedDepartment);
    }

    // Update state with filtered employees
    if (employeesForDate.length > 0) {
      setEmployeesForSelectedDate(employeesForDate);
      setNoEmployees(false);
    } else {
      setNoEmployees(true);
      setEmployeesForSelectedDate([]);
    }

    setModalOpen(true); // Open the modal to show the attendance
  };

  const handleClose = () => {
    setModalOpen(false);
    setWorkingFromHomeFilter(false);
  };


  const handleMonthYearChange = (date) => {
    setSelectedDate(date);
  };

  const renderCalendarCells = () => {
    if (viewType === 'weekly') {
      return renderWeeklyCells();
    } else if (viewType === 'daily') {
      return renderDailyCells();
    }
    return renderMonthlyCells();
  };

  const renderMonthlyCells = () => {
    const startOfMonth = selectedDate.startOf('month');
    const endOfMonth = selectedDate.endOf('month');
    const firstDayOfMonth = startOfMonth.day(); // Get day of the week for the first day of the month
    const daysInMonth = endOfMonth.date();

    const cells = [];
    let currentDay = 1;

    // Add day labels
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayLabels.forEach((label, index) => {
      cells.push(
        <div key={`label-${index}`} className="calendar-cell day-label">
          {label}
        </div>
      );
    });

    // Create blank cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`empty-${i}`} className="calendar-cell empty"></div>);
    }

    // Create cells for each day in the month
    while (currentDay <= daysInMonth) {
      const day = startOfMonth.date(currentDay);
      
      const dayString = day.format('YYYY-MM-DD');
      const employeesForDay = transformedData[dayString] || [];

      const hasWorkingFromHome = employeesForDay.some(employee => employee.workingFromHome);

      let highlightClass = '';

     if (workingFromHomeFilter) {
        if (hasWorkingFromHome) {
          highlightClass = 'working-from-home';
        }
      } 

      cells.push(
        <div
          key={day.format('YYYY-MM-DD')}
          className={`calendar-cell ${day.isToday() ? 'today' : ''} ${highlightClass}`}
          onClick={() => handleDateClick(day)}
        >
          <div className="date-number">{currentDay}</div>
        </div>
      );
      currentDay++;
    }

    return cells;
  };

  const renderWeeklyCells = () => {
    const startOfWeek = selectedDate.startOf('week');
    const cells = [];
  
   // Add day labels
   const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
   dayLabels.forEach((label, index) => {
     cells.push(
       <div key={`label-${index}`} className="calendar-cell day-label">
         {label}
       </div>
     );
   });

    for (let day = startOfWeek; day.isBefore(startOfWeek.add(7, 'days')); day = day.add(1, 'day')) {
      const dayString = day.format('DD-MM-YYYY');
      const employeesForDay = transformedData[dayString] || [];
  
      const hasWorkingFromHome = employeesForDay.some(employee => employee.workingFromHome);
  
      let highlightClass = '';
  
       if (workingFromHomeFilter) {
        if (hasWorkingFromHome) {
          highlightClass = 'working-from-home';
        }
      } 
  
      cells.push(
        <div
          key={day.format('DD-MM-YYYY')}
          className={`calendar-cell ${day.isToday() ? 'today' : ''} ${highlightClass}`}
          onClick={() => handleDateClick(day)}
        >
          <div className="date-number">{day.date()}</div>
        </div>
      );
    }
    return cells;
  };

  const renderDailyCells = () => {
    const dayString = selectedDate.format('YYYY-MM-DD');
    let employeesForDay = transformedData[dayString] || [];
  
    if (workingFromHomeFilter ) {
      employeesForDay = employeesForDay.filter(employee => employee.workingFromHome);
    } 
  
    if (selectedDepartment) {
      employeesForDay = employeesForDay.filter(employee => employee.dept === selectedDepartment);
    }
  
    return (
      <div className="daily-view pt-16">
        <h3 align="center">Attendance Details</h3>
        {employeesForDay.length > 0 ? (
          <TableContainer component={Paper} style={{ marginTop: '20px' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee Name</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Reason (if Working from Home)</TableCell>
                  <TableCell align="center">Duration (if Working from Home)</TableCell>
                  <TableCell align="center">Department</TableCell>
                  <TableCell align="center">Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employeesForDay.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>{employee.employee_name}</TableCell>
                    <TableCell align="center">
                      {employee.workingFromHome ? 'Working from Home' : 'Working in Office'}
                    </TableCell>
                    <TableCell align="center">
                      {employee.workingFromHome ? employee.reason : 'N/A'}
                    </TableCell>
                    <TableCell align="center">
                      {employee.workingFromHome ? employee.duration : 'N/A'}
                    </TableCell>
                    <TableCell align="center">{employee.dept}</TableCell>
                    <TableCell align="center">{employee.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <h3>No employees found for {selectedDate.format('DD/MM/YYYY')}</h3>
          </div>
        )}
      </div>
    );
  };


  return (
    <div>
    <h1>Employee Attendance Tracker</h1>
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        views={['year', 'month']}
        value={selectedDate}
        onChange={handleMonthYearChange}
        renderInput={(params) => <TextField {...params} />}
      />
    </LocalizationProvider>

    

    <div>
      <Button onClick={() => setViewType('monthly')} variant={viewType === 'monthly' ? 'contained' : 'outlined'}>Monthly View</Button>
      <Button onClick={() => setViewType('weekly')} variant={viewType === 'weekly' ? 'contained' : 'outlined'}>Weekly View</Button>
      <Button onClick={() => setViewType('daily')} variant={viewType === 'daily' ? 'contained' : 'outlined'}>Daily View</Button>
      <Button onClick={() => setSelectedDate(dayjs())} variant="outlined" style={{ marginLeft: '10px' }}>Today</Button> {/* Add Today button */}

    </div>

    <FormControlLabel
        control={
          <Checkbox
            checked={workingFromHomeFilter}
            onChange={() => setWorkingFromHomeFilter(!workingFromHomeFilter)}
          />
        }
        label="Show only employees working from home"
      />
     
      <FormControl variant="outlined" sx={{ minWidth: 120 }}>
          <InputLabel id="department-label">Department</InputLabel>
          <Select
            labelId="department-label"
            id="department-select"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
          >
            <MenuItem value="">
              <em>All</em>
            </MenuItem>
            {departments.map((dept) => (
              <MenuItem key={dept} value={dept}>
                {dept}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

      <div className="calendar-header">
      <Button onClick={() => setSelectedDate(selectedDate.subtract(1, viewType === 'monthly' ? 'month' : viewType === 'weekly' ? 'week' : 'day'))}>Previous</Button>
      <h2>{viewType === 'monthly' ? selectedDate.format('MMMM YYYY') : viewType === 'weekly' ? `Week of ${selectedDate.format('DD-MM-YYYY')}` : selectedDate.format('DD-MM-YYYY')}</h2>
      <Button onClick={() => setSelectedDate(selectedDate.add(1, viewType === 'monthly' ? 'month' : viewType === 'weekly' ? 'week' : 'day'))}>Next</Button>
    </div>
      <div className="calendar-grid">
        {renderCalendarCells()}
        </div>

      <Dialog open={isModalOpen} onClose={handleClose}>
        <DialogTitle>Attendance Details</DialogTitle>
        <DialogContent>
          {noEmployees ? (
            <p>No attendance for selected criteria</p>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Working From Home</TableCell>
                    
                    <TableCell>Department</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {employeesForSelectedDate.map((employee) => (
                    <TableRow key={employee.requester_id}>
                      <TableCell>{employee.employee_name}</TableCell>
                      <TableCell align="center">
                    {employee.workingFromHome ? 'Working from Home' : 'Working in Office'}
                  </TableCell>
                     
                      <TableCell>{employee.dept}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <style jsx>{`
        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 20px 0;
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 10px;
        }
        .calendar-day {
          font-weight: bold;
          text-align: center;
        }
        .calendar-cell {
          padding: 15px;
          border: 1px solid #ccc;
          text-align: center;
          cursor: pointer;
          position: relative;
        }
        .date-number {
          font-size: 1.2rem;
        }
        .today {
          background-color: rgba(0, 150, 255, 0.3);
          border-radius: 5px;
        }
        
          .working-from-home {
            background-color: rgba(255, 215, 0, 0.5); /* Example color for working from home */
          }
          
        .empty-cell {
          visibility: hidden;
        }
        .daily-view {
          display: flex;
          flex-direction: column;
        }
        .daily-attendance {
          margin: 10px 0;
        }
          .weekdays-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-weight: bold;
}

.weekday {
  padding: 50px;
  border: 1px solid #ccc;
  background-color: #f0f0f0; /* Optional: Change to suit your design */
}
  .day-label {
  font-weight: bold;
  text-align: center;
  background-color: #f0f0f0; /* Optional: to distinguish labels from other cells */
  border-bottom: 1px solid #ccc; /* Optional: for a clean separation */
}
      `}</style>
    </div>
  );
};

export default AttendanceCalendar;