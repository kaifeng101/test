// import * as React from 'react';
import JackTablePendingReq from '../components/JackTablePendingReq';
import { Tabs, Tab, Box } from '@mui/material';
import axios from 'axios'
import React, { useState, useEffect } from 'react';
import { useSelector } from "react-redux";
import { selectUser } from "../redux/userSlice";


const JackPersonalRequests = () => {
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
  }, []);

  // Filter requests based on tabIndex, overall_status, and reporting_manager
  const filteredRequests = () => {
    if (!wfhrequests) return [];

    // Filter based on the staff_id and overall_status
    return wfhrequests.filter(request => {
      const isRequesterId = request.requester_id === staffId;
      switch (tabIndex) {
        case 0: // My Approved Requests
          return isRequesterId && request.overall_status === 'Approved';
        case 1:
          return isRequesterId
          default:
          return [];
      }
    });
  };

  return (
    wfhrequests && (
      <div className = "pt-16">
        {/* Tabs Section */}
        <Tabs value={tabIndex} onChange={handleTabChange} 
        variant="scrollable"
        scrollButtons="auto"
        aria-label="scrollable auto tabs example">
          <Tab label = "My Approved Requests"/>
          <Tab label = "All My Requests"/>
        </Tabs>

        {/* Tab Content */}
        <TabPanel value={tabIndex} index={0}>
          <JackTablePendingReq fetchWFHRequests={filteredRequests()} />
        </TabPanel>
        <TabPanel value={tabIndex} index={1}>
          <JackTablePendingReq fetchWFHRequests={filteredRequests()} />
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
  
export default JackPersonalRequests;