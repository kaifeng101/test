import * as React from 'react';
import { useSelector } from "react-redux"; // Add this to get user info from the store
import { useState, useEffect } from 'react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, MenuItem, Select, InputLabel, FormControl, Checkbox, FormControlLabel, FormGroup, TablePagination,CircularProgress } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import axios from 'axios';

const TeamScheduleTracker = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [employees, setEmployees] = useState([]);
  const [showWorkingFromHome, setShowWorkingFromHome] = useState(true);
  const [showWorkingInOffice, setShowWorkingInOffice] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [loading, setLoading] = useState(false); // Added loading state

// Get user info from Redux store
const user = useSelector((state) => state.user);
  const selectedDateString = selectedDate.format('YYYY-MM-DD');

useEffect(() => {
  setLoading(true); // Show loading spinner

    const fetchData = async () => {
      try {
        const response = await axios.get(`https://scrumdaddybackend.studio/attendance/`, {
          params: {
            date: selectedDateString,
          },
        });
        let employees = response.data.data;
        // Filter employees based on role
        if (user.userInfo.role === 3 || user.userInfo.role === 2) {
          employees = employees.filter(emp => emp.dept === user.userInfo.dept);
        }
        setEmployees(employees);
        console.log(employees);
      } catch (error) {
        console.error('Error fetching attendance data:', error);
      }finally {
        setLoading(false); // Hide loading spinner
      }
    };
    fetchData(); // Fetch data on date change
  }, [selectedDateString, user.userInfo.role, user.userInfo.dept]);

  const departments = [...new Set(employees.map(emp => emp.dept))];

  // Filter employees by search term
  const searchedEmployees = employees.filter((employee) =>
    employee.employee_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter employees by department (only for role 1, staff with access to all departments)
  const filteredByDepartment = (user.userInfo.role === 1 && selectedDept !== 'All')
    ? searchedEmployees.filter((employee) => employee.dept === selectedDept)
    : searchedEmployees;

  // Filter employees by working status (Working from Home or Working in Office)
  const filteredByStatus = filteredByDepartment.filter((employee) => {
    if (showWorkingFromHome && employee.workingFromHome) return true;
    if (showWorkingInOffice && !employee.workingFromHome) return true;
    return false;
  });

  // Handle pagination change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when rows per page changes
  };

  const handleClear = () => {
    setSearchTerm('');
    setSelectedDept('All');
    setShowWorkingFromHome(true);
    setShowWorkingInOffice(true);
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleDeptChange = (e) => {
    setSelectedDept(e.target.value);
  };

  const handleWorkingFromHomeChange = (e) => {
    setShowWorkingFromHome(e.target.checked);
  };

  const handleWorkingInOfficeChange = (e) => {
    setShowWorkingInOffice(e.target.checked);
  };

  

  return (
    <div className='pt-16'>
      <h1>Team Schedule </h1>

      {/* Date Picker */}
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          label="Select Date"
          value={selectedDate}
          onChange={handleDateChange}
          renderInput={(params) => <TextField {...params} />}
        />
      </LocalizationProvider>

      {/* Search by Name */}
      <TextField
        label="Search by Name"
        variant="outlined"
        value={searchTerm}
        onChange={handleSearchChange}
        style={{ marginRight: '10px' , marginLeft : '10px'}}
      />

      {/* Filter by Department */}
      {user.userInfo.role === 1 && (
  <FormControl variant="outlined" style={{ minWidth: 150 }}>
    <InputLabel>Department</InputLabel>
    <Select
      value={selectedDept}
      onChange={handleDeptChange}
      label="Department"
    >
      <MenuItem value="All">All</MenuItem>
      {departments.map((dept) => (
        <MenuItem key={dept} value={dept}>
          {dept}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
)}
      {/* Clear Button */}
      <Button
        variant="contained"
        color="secondary"
        style={{ marginLeft: '10px', marginTop: '20px' }}
        onClick={handleClear}
      >
        Clear Filters
      </Button>

      {/* Filter by Working Status */}
      <FormGroup row style={{ marginTop: '20px' }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={showWorkingFromHome}
              onChange={handleWorkingFromHomeChange}
              color="primary"
            />
          }
          label="Working from Home"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={showWorkingInOffice}
              onChange={handleWorkingInOfficeChange}
              color="primary"
            />
          }
          label="Working in Office"
        />
      </FormGroup>

      
      {/* Loading spinner */}
      {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
              <CircularProgress />
            </div>
      ) : (<> 
      {/* Attendance Table */}
      {filteredByStatus.length > 0 ? (
        <TableContainer component={Paper} style={{ marginTop: '20px' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee Name</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Department</TableCell>
                <TableCell align="center">Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredByStatus
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((employee) => (
                  <TableRow key={employee.requester_id}>
                    <TableCell>{employee.employee_name}</TableCell>
                    <TableCell align="center">
                      {employee.workingFromHome ? 'Working from Home' : 'Working in Office'}
                    </TableCell>
                    <TableCell align="center">{employee.dept}</TableCell>
                    <TableCell align="center">{employee.date !==null ? employee.date : '-'}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <h3>No employees found for the selected criteria</h3>
        </div>
      )}

      {/* Pagination Control */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredByStatus.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
      </>
    )}
    </div>
     
  );
};

export default TeamScheduleTracker;
