// Import statements remain unchanged
import ManagerTablePendingReq from '../components/ManagerTablePendingReq';
import { Tabs, Tab, Box } from '@mui/material';
import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { useSelector } from "react-redux";
import { selectUser } from "../redux/userSlice";

const ManagerRequests = () => {
  const user = useSelector(selectUser); // Get the logged-in user's info
  const staffId = user.staff_id; // Assuming 'staff_id' is a property in the user object
  const [tabIndex, setTabIndex] = React.useState(0);
  const [wfhrequests, setWFHRequests] = useState(null);

  const handleTabChange = (event, newIndex) => {
    setTabIndex(newIndex);
  };

  const fetchWFHRequests = async () => {
    try {
      const response = await axios.get('https://scrumdaddybackend.studio/wfhRequests');
      const wfhrequests = response.data.data;
      setWFHRequests(wfhrequests);
    } catch (error) {
      console.log('error', error);
    }
  };

  useEffect(() => {
    fetchWFHRequests();
  }, []);

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
        case 2: // All Requests
          return isReportingManager
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
          <Tab label="My Employees Pending Requests" />
          <Tab label="My Employees Approved Requests" />
          <Tab label="All My Employees Requests" />
        </Tabs>

        {/* Tab Content */}
        <TabPanel value={tabIndex} index={0}>
          <ManagerTablePendingReq fetchWFHRequests={filteredRequests()} />
        </TabPanel>
        <TabPanel value={tabIndex} index={1}>
          <ManagerTablePendingReq fetchWFHRequests={filteredRequests()} />
        </TabPanel>
        <TabPanel value={tabIndex} index={2}>
          <ManagerTablePendingReq fetchWFHRequests={filteredRequests()} />
        </TabPanel>
      </div>
    )
  );
}

// TabPanel Component remains unchanged
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
  );
}

export default ManagerRequests;
