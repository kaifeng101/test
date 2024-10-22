import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { login, logout } from "../redux/userSlice";
import {
  TextField,
  Button,
  Container,
  Typography,
  Box,
  Alert,
} from "@mui/material";
import axios from "axios";

const LoginComponent = () => {
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user);

  // Function to authenticate employee
  const authenticateEmployee = async (staffId) => {
    try {
      const response = await axios.get(
        `https://scrumdaddybackend.studio/employees/auth`,
        {
          params: { staff_id: staffId },
        }
      );

      if (response.data.status_code === 200) {
        console.log(response.data.data);
        return response.data.data;
      } else {
        console.error("Employee not found:", response.data.message);
        setError("Employee not found.");
        return null;
      }
    } catch (error) {
      console.error(
        "Error fetching staff:",
        error.response ? error.response.data : error.message
      );
      setError("Error fetching staff.");
      return null;
    }
  };

  // Function to fetch employee from backend
  const fetchEmployee = async (staffId) => {
    try {
      const response = await axios.get(
        `https://scrumdaddybackend.studio/employees/`,
        {
          params: { staff_id: staffId, dept: "" },
        }
      );
      console.log(response.data.data[0]);
      return response.data.data[0];
    } catch (error) {
      console.error("Error fetching staff:", error);
      setError("Error fetching staff. ");
      return null;
    }
  };

  const handleLogin = async () => {
    setError("");

    if (!staffId) {
      setError("Please enter a staff ID.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      console.log("Attempting to authenticate employee...");
      const authenticate = await authenticateEmployee(staffId);
      console.log("Authenticate response:", authenticate);

      console.log("Fetching employee...");
      const foundUser = await fetchEmployee(parseInt(staffId));
      console.log("Found user response:", foundUser);

      if (foundUser && authenticate) {
        if (parseInt(password) === authenticate) {
          const userInfo = foundUser;
          dispatch(login(userInfo));
          setError("");
          setStaffId("");
          setPassword("");
        } else {
          setError("Invalid format. Please try again.");
        }
      } else {
        setError("Invalid credentials. Please try again.");
      }
    } catch (error) {
      // console.error("An error occurred during login:", error);
      setError("An error occurred. Please try again.");
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    alert("Successfully Logged Out.");
  };

  return (
    <Container maxWidth="sm" className="flex justify-center pt-16">
      <Box
        sx={{
          mt: 5,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {user.isLoggedIn ? (
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h4" gutterBottom>
              Welcome, {user.userInfo.Staff_ID}
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Box>
        ) : (
          <Box sx={{ width: "100%" }}>
            <Typography variant="h5" gutterBottom>
              Staff Login
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              fullWidth
              label="Staff ID"
              variant="outlined"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              placeholder="Enter your Staff ID"
              sx={{ mb: 2 }}
              type="number"
            />
            <TextField
              fullWidth
              type="password"
              label="Password"
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your Password"
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleLogin}
            >
              Login
            </Button>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default LoginComponent;
