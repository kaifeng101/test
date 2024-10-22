// DepartmentCard.js
import { useTheme } from '@mui/material/styles';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import React from 'react';
import { CardActionArea } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function DepartmentCard({ department, requests }) {
    const theme = useTheme();
    const navigate = useNavigate();
    
    const handleClick = () => {
        navigate(`/departmentSchedule/${department.toLowerCase()}`);
    };

    return (
        <Card sx={{ display: 'flex', flexDirection: 'column', margin: 2, width: '300px' }}>
            <CardActionArea onClick={handleClick}>
                <CardContent sx={{ flex: '1 0 auto' }}>
                    <Typography component="div" variant="h5">
                        {department} Department
                    </Typography>
                    <Typography variant="subtitle1" gutterBottom>
                        Approved WFH Requests:
                    </Typography>
                    <Stack direction="row" spacing={1} wrap="wrap">
                        {requests.length > 0 ? (
                            requests.map((request, index) => (
                                <Avatar key={index} sx={{ bgcolor: theme.palette.primary.main }}>
                                    {request.employeeInitials || (request.employeeName && request.employeeName.split(' ').map(name => name[0]).join('')) || "?"}
                                </Avatar>
                            ))
                        ) : (
                            <Typography variant="body2" color="textSecondary">
                                No approved WFH requests.
                            </Typography>
                        )}
                    </Stack>
                </CardContent>
            </CardActionArea>
        </Card>
    );
}
