// import * as React from 'react';
import TablePendingReq from '../components/TablePendingReq';
import { Tabs, Tab, Box } from '@mui/material';
import axios from 'axios'
import React, { useState, useEffect } from 'react';
import { useSelector } from "react-redux";
import { selectUser } from "../redux/userSlice";


const RequestsPage = () => {
  const user = useSelector(selectUser); // Get the logged-in user's info
  const staffId = user.staff_id; // Assuming 'staff_id' is a property in the user object
  const [tabIndex, setTabIndex] = React.useState(0);

  const handleTabChange = (event, newIndex) => {
    setTabIndex(newIndex);
  };

  const [wfhrequests, setWFHRequests] = useState(null)

  const fetchWFHRequests = async () => {
    try {
        const response = await axios.get('https://scrumdaddybackend.studio/wfhRequests');
        // console.log(response);
        const wfhrequests = response.data.data;
        console.log(wfhrequests)
        setWFHRequests(wfhrequests)
        // console.log(response.data.data.wfhRequests);
    } catch (error) {
        console.log('error', error);
    }
  };

  useEffect(() => {
    fetchWFHRequests()
  });

  // Filter requests based on tabIndex, overall_status, and reporting_manager
  const filteredRequests = () => {
    if (!wfhrequests) return [];

    // Filter based on the staff_id and overall_status
    return wfhrequests.filter(request => {
      const isReportingManager = request.reporting_manager === staffId;
      switch (tabIndex) {
        case 0: // My Employees Pending Requests
          return isReportingManager && request.overall_status === 'Pending';
        case 1: // My Employees Approved Requests
          return isReportingManager && request.entries.some(entry => entry.status === 'Approved');
        case 2: // My Employees Reviewed Requests
          return isReportingManager && request.overall_status === 'Pending Withdrawal';
        case 3: // All My Requests
          return isReportingManager; // Show all requests managed by the user
          default:
          return [];
      }
    });
  };

  return (
    wfhrequests && (
      <div className="pt-16">
        {/* Tabs Section */}
        <Tabs value={tabIndex} onChange={handleTabChange} 
        variant="scrollable"
        scrollButtons="auto"
        aria-label="scrollable auto tabs example">
          <Tab label="Pending Requests" />
          <Tab label="Approved Requests" />
          <Tab label="Pending Withdrawal Requests" />
          <Tab label="All Requests" />
        </Tabs>

        {/* Tab Content */}
        <TabPanel value={tabIndex} index={0}>
          <TablePendingReq fetchWFHRequests={filteredRequests()} />
        </TabPanel>
        <TabPanel value={tabIndex} index={1}>
          <TablePendingReq fetchWFHRequests={filteredRequests()} />
        </TabPanel>
        <TabPanel value={tabIndex} index={2}>
          <TablePendingReq fetchWFHRequests={filteredRequests()} />
        </TabPanel>
        <TabPanel value={tabIndex} index={3}>
          <TablePendingReq fetchWFHRequests={filteredRequests()} />
        </TabPanel>
      </div>
    )
  );
}

// TabPanel Component to render content conditionally based on the active tab
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
    )
    
};
  
export default RequestsPage;