import * as React from 'react';
import { useSelector } from "react-redux";
import { useState, useEffect } from 'react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, MenuItem, Select, InputLabel, FormControl, Checkbox, FormControlLabel,  TablePagination, CircularProgress, Grid, Tooltip } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts'; // Add charting library for visualization
//import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
//import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import './AttendanceTracker.css'; // Import a CSS file for custom styles and animations

const AttendanceTracker = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [employees, setEmployees] = useState([]);
  const [showWorkingFromHome, setShowWorkingFromHome] = useState(true);
  const [showWorkingInOffice, setShowWorkingInOffice] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false); // Added loading state

  // Get user info from Redux store
  const user = useSelector((state) => state.user);
  const selectedDateString = selectedDate.format('YYYY-MM-DD');

  useEffect(() => {
    if (showFilters) {
      setLoading(true); // Show loading spinner
      const fetchData = async () => {
        try {
          const response = await axios.get(`https://scrumdaddybackend.studio/attendance/`, {
            params: { date: selectedDateString },
          });
          let employees = response.data.data;
          if (user.userInfo.role === 3) {
            employees = employees.filter(emp => emp.dept === user.userInfo.dept);
          }
          setEmployees(employees);
        } catch (error) {
          console.error('Error fetching attendance data:', error);
        } finally {
          setLoading(false); // Hide loading spinner
        }
      };
      fetchData();
    }
  }, [selectedDateString, showFilters, user.userInfo.role, user.userInfo.dept]);

  


  const departments = [...new Set(employees.map(emp => emp.dept))];

  const searchedEmployees = employees.filter((employee) =>
    employee.employee_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredByDepartment = (user.userInfo.role === 1 && selectedDept !== 'All')
    ? searchedEmployees.filter((employee) => employee.dept === selectedDept)
    : searchedEmployees;

  const filteredByStatus = filteredByDepartment.filter((employee) => {
    if (showWorkingFromHome && employee.workingFromHome) return true;
    if (showWorkingInOffice && !employee.workingFromHome) return true;
    return false;
  });
  

  // Pie chart data
  const pieData = [
    { name: 'Working from Home', value: filteredByStatus.filter(emp => emp.workingFromHome).length },
    { name: 'In Office', value: filteredByStatus.filter(emp => !emp.workingFromHome).length },
  ];
  const renderCustomLabel = ({ name, value }) => `${name}: ${value}`;

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleClear = () => {
    setSearchTerm('');
    setSelectedDept('All');
    setShowWorkingFromHome(true);
    setShowWorkingInOffice(true);
    setShowFilters(false); // Hide filters and attendance table
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

  const handleShowAttendance = () => {
    setShowFilters(true);
  };

  if (user.userInfo.role !== 1 && user.userInfo.role !== 3) {
    return <h3>You do not have permission to view this page.</h3>;
  }

  return (
    <div className="attendance-tracker-container pt-16" >
      <h1>Employee Attendance Tracker</h1>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6}>
          <span>I want to see the attendance for</span>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Select Date"
              value={selectedDate}
              onChange={handleDateChange}
              renderInput={(params) => <TextField {...params} />}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleShowAttendance}
          >
            Show Attendance
          </Button>
        </Grid>
      </Grid>

      {showFilters && (
        <>
          <Grid container spacing={2} alignItems="center" style={{ marginTop: '20px' }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Search by Name"
                variant="outlined"
                value={searchTerm}
                onChange={handleSearchChange}
                fullWidth
              />
            </Grid>

            {user.userInfo.role === 1 && (
              <Grid item xs={12} sm={6}>
                <FormControl variant="outlined" fullWidth>
                  <InputLabel>Department</InputLabel>
                  <Select value={selectedDept} onChange={handleDeptChange} label="Department">
                    <MenuItem value="All">All</MenuItem>
                    {departments.map((dept) => (
                      <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>

          <Grid container spacing={2} style={{ marginTop: '20px' }}>
            <Grid item>
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
            </Grid>
            <Grid item>
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
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleClear}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>

          {/* Loading spinner */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
              <CircularProgress />
            </div>
          ) : (
            <>
              <Grid container spacing={2} style={{ marginTop: '20px' , marginLeft:'50px'}}>
                <h3>Attendance for {selectedDate.format('YYYY-MM-DD')}</h3>
                <Grid item xs={12} sm={6}>
                  <PieChart width={700} height={250} >
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={renderCustomLabel} // Add labels to each segment
                    >
                      <Cell key="wfh" fill="#82ca9d" />
                      <Cell key="office" fill="#d84a44" />
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </Grid>
               
              </Grid>

              <TableContainer component={Paper} style={{ marginTop: '20px' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredByStatus
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((employee) => (
                        <TableRow key={employee.employee_name}>
                          <Tooltip title={employee.workingFromHome ? "WFH" : "Office"} placement="top" arrow>
                            <TableCell>{employee.employee_name}</TableCell>
                          </Tooltip>
                          <TableCell>{employee.dept}</TableCell>
                          <TableCell>
                            {employee.workingFromHome ? 'Working from Home' : 'In Office'}
                          </TableCell>
                          <TableCell>
                            {employee.date !== null ? employee.date:'-'}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
                <TablePagination
                  component="div"
                  count={filteredByStatus.length}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </TableContainer>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AttendanceTracker;
