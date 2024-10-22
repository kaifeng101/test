// import * as React from 'react';
import HRTablePendingReq from '../components/HRTablePendingReq';
import { Tabs, Tab, Box } from '@mui/material';
import axios from 'axios'
import React, { useState, useEffect } from 'react';

const EmployeeRequests = () => {
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
  }, []);

  // Filter requests based on tabIndex, overall_status, and reporting_manager
  const filteredRequests = () => {
    if (!wfhrequests) return [];

    // Filter based on the staff_id and overall_status
    return wfhrequests.filter(request => {
      switch (tabIndex) {
        case 0: // All Employees Approved Request
          return request.entries.some((entry) => entry.status === 'Approved')
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
          <Tab label="All Employees Approved Requests" />
          <Tab label = "All Requests"/>
        </Tabs>

        {/* Tab Content */}
        <TabPanel value={tabIndex} index={0}>
          <HRTablePendingReq fetchWFHRequests={filteredRequests()} />
        </TabPanel>
        <TabPanel value={tabIndex} index={1}>
          <HRTablePendingReq fetchWFHRequests={filteredRequests()} />
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
  
export default EmployeeRequests;