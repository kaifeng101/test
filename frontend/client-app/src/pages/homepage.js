import * as React from 'react';
import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';



const Home = () => {
    const navigate = useNavigate();
    const handleClick = () => {
        navigate('/attendance');  // Navigate to the attendance page
    };
    
   
    return (
        <div className='pt-16'>
            
            <Button variant="contained" onClick={handleClick}>Check Attendance</Button>
        </div>
        
    )
  
};




export default Home;
  