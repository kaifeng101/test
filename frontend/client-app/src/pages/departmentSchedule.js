import DepartmentCard from '../components/DepartmentCard';
import axios from 'axios';
import React, { useState, useEffect } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from "@mui/material/Stack";

const DepartmentCalendar = () => {
    const departments = ['CEO', 'Sales', 'Solutioning', 'Engineering', 'HR', 'Finance', 'Consultancy', 'IT'];
    const [deptRequests, setDeptRequests] = useState({});
    const [loading, setLoading] = useState(true); // Loading state

    const fetchApprovedWFHRequests = async () => {
        try {
            const requests = {};
            const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

            for (const dept of departments) {
                const response = await axios.get(`https://scrumdaddybackend.studio/wfhRequests/dept/${dept}`);
                const approvedRequests = [];

                // Loop through each request and get the individual entries
                response.data.data.forEach(request => {
                    if (request.overall_status === 'Approved') {
                        // Map through the entries array to get individual statuses
                        request.entries.forEach(entry => {
                            // Check if the entryDate matches today's date
                            if (entry.status === 'Approved' && entry.entry_date === today) {
                                approvedRequests.push({
                                    department: dept,
                                    requestId: entry.request_id,
                                    entryId: entry.entry_id,
                                    entryDate: entry.entry_date,
                                    reason: entry.reason,
                                    duration: entry.duration,
                                    status: entry.status,
                                    requesterId: request.requester_id,
                                    reportingManager: request.reporting_manager
                                });
                            }
                        });
                    }
                });
                
                requests[dept] = approvedRequests;
            }
            setDeptRequests(requests);
            setLoading(false); // Set loading to false once data is fetched
            console.log('Fetched approved WFH requests:', requests);
        } catch (error) {
            console.log('Error fetching approved WFH requests:', error);
            setLoading(false); // Even on error, stop loading
        }
    };

    useEffect(() => {
        fetchApprovedWFHRequests();
    });

    return (
        <div>
            <div className="p-5">
                {loading ? (
                // Show loading spinner while loading
                <Stack spacing={2} direction="row" justifyContent="center">
                    <CircularProgress />
                </Stack>
                ) : (
                departments.map((dept) => (
                    <div key={dept} style={{ marginBottom: '16px' }}>
                    <DepartmentCard 
                        department={dept} 
                        requests={deptRequests[dept] || []} 
                    />
                    </div>
                ))
                )}
            </div>
        </div>
    );
};

export default DepartmentCalendar;
