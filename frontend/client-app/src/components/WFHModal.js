import axios from "axios";
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "../redux/userSlice";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Grid,
  Typography,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Snackbar,
  Alert,
  Slide,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

function SlideTransition(props) {
  return <Slide {...props} direction="down" />;
}

const WFHModal = ({open, onClose}) => {
  const user = useSelector(selectUser);

  const fullName = `${user.staff_fname} ${user.staff_lname}`;

  const [errors, setErrors] = useState([]);
  const [formData, setFormData] = useState({
    requester_id: user.staff_id,
    reporting_manager: user.reporting_manager,
    department: user.dept,
    entries: [{ entry_date: "", duration: "", reason: "" }],
  });
  const [reportingManager, setReportingManager] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false); // Snackbar state
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success"); // success, error, warning, info

  useEffect(() => {
    const getManager = async () => {
      const managerName = await fetchReportingManagerName(
        user.reporting_manager
      );
      if (managerName) {
        setReportingManager(managerName);
      }
    };

    if (user.reporting_manager) {
      getManager();
    }
  }, [user.reporting_manager]);
  useEffect(() => {
    // Clear snackbar message after a successful submission or when the error is fixed
  }, [openSnackbar]);

  const fetchReportingManagerName = async (staffId) => {
    try {
      const response = await axios.get(
        `https://scrumdaddybackend.studio/employees/`,
        {
          params: { staff_id: staffId, dept: "" },
        }
      );
      console.log(response.data.data[0]);
      return (
        response.data.data[0].staff_fname +
        " " +
        response.data.data[0].staff_lname
      );
    } catch (error) {
      console.error("Error fetching reporting manager:", error);
      return null;
    }
  };

  const handleInputChange = (index, field, value) => {
    const updatedEntries = [...formData.entries];
    updatedEntries[index][field] = value;
    setFormData({
      ...formData,
      entries: updatedEntries,
    });
    validateField(index, field, value);
  };

  const validateField = (index, field, value) => {
    const newErrors = [...errors];
    const error = {};
    const today = new Date();
    const selectedDate = new Date(formData.entries[index].entry_date);

    // Helper function to determine the next working day
    const getNextWorkingDay = (date) => {
      const dayOfWeek = date.getDay();

      if (dayOfWeek === 5) {
        // If it's Friday, skip to the next Monday
        date.setDate(date.getDate() + 3);
      } else {
        // Otherwise, just add one day
        date.setDate(date.getDate() + 1);
      }

      return date;
    };

    const nextWorkingDay = getNextWorkingDay(new Date(today));

    if (field === "entry_date" || field === "reason" || field === "duration") {
      if (field === "reason") {
        if (!value.trim()) {
          error.reason = "Reason cannot be blank";
        } else {
          error.reason = "";
        }
      }

      if (field === "entry_date") {
        if (!value.trim()) {
          error.entry_date = "Date must be selected";
        } else if (selectedDate.getDay() === 0 || selectedDate.getDay() === 6) {
          // Check if the selected date falls on a weekend
          error.entry_date =
            "Work-from-home requests cannot be made for weekends";
        } else if (selectedDate <= nextWorkingDay) {
          // Ensure the selected date is at least one working day in advance
          error.entry_date = "Date must be at least one working day in advance";
        } else {
          error.entry_date = "";
        }
      }

      if (field === "duration") {
        if (!value.trim()) {
          error.duration = "Duration must be selected";
        } else {
          error.duration = "";
        }
      }
    }

    newErrors[index] = { ...newErrors[index], ...error };
    setErrors(newErrors);
  };

  const validateAllRequests = () => {
    // Helper function to determine the next working day
    const getNextWorkingDay = (date) => {
      const dayOfWeek = date.getDay();

      if (dayOfWeek === 5) {
        // If it's Friday, skip to the next Monday
        date.setDate(date.getDate() + 3);
      } else {
        // Otherwise, just add one day
        date.setDate(date.getDate() + 1);
      }

      return date;
    };

    const today = new Date();
    const nextWorkingDay = getNextWorkingDay(new Date(today)); // Get the next working day
    const newErrors = formData.entries.map((request, index) => {
      const selectedDate = new Date(request.entry_date);
      const isWeekend =
        selectedDate.getDay() === 0 || selectedDate.getDay() === 6; // Check if it's weekend
      const isReasonValid = request.reason.trim() !== "";
      const isDurationValid = request.duration.trim() !== "";

      const error = {};
      if (!isReasonValid) error.reason = "Reason cannot be blank";
      if (!request.entry_date.trim()) {
        error.entry_date = "Date must be selected";
      } else if (isWeekend) {
        error.entry_date =
          "Work-from-home requests cannot be made for weekends"; // Add weekend validation
      } else if (selectedDate < nextWorkingDay) {
        // Ensure the selected date is at least one working day in advance
        error.entry_date = "Date must be at least one working day in advance";
      }
      if (!isDurationValid) error.duration = "Duration must be selected";

      return error;
    });

    setErrors(newErrors);
    return newErrors.every((error) => Object.keys(error).length === 0);
  };

  const addMoreDates = () => {
    setFormData({
      ...formData,
      entries: [
        ...formData.entries,
        { entry_date: "", duration: "", reason: "" },
      ],
    });
    setErrors([...errors, {}]);
  };

  const deleteRequest = (index) => {
    const updatedEntries = formData.entries.filter((_, i) => i !== index);
    setFormData((prevFormData) => ({
      ...prevFormData,
      entries: updatedEntries,
    }));
    const newErrors = errors.filter((_, i) => i !== index);
    setErrors(newErrors);
  };

  const checkExistingRequests = async () => {
    try {
      const response = await axios.get(
        `https://scrumdaddybackend.studio/wfhRequests/staff/${user.staff_id}`
      );
      const existingRequests = response.data.data;

      for (let entry of formData.entries) {
        const matchedRequest = existingRequests.find((request) =>
          request.entries.some(
            (r) =>
              r.entry_date === entry.entry_date &&
              (r.status === "Pending" || r.status === "Approved")
          )
        );
        if (matchedRequest) {
          setSnackbarMessage(
            `You already have a pending or approved request for this date: ${entry.entry_date}`
          );
          setSnackbarSeverity("error");
          setOpenSnackbar(true);
          return false; // If match is found, stop submission.
        }
      }
      return true; // If no matches found, allow submission.
    } catch (error) {
      console.error("Error checking existing requests:", error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isValid = validateAllRequests();
    const canSubmit = await checkExistingRequests();

    if (isValid && canSubmit) {
      try {
        // Prepare form data for submission
        const updatedFormData = {
          ...formData,
          entries: formData.entries.map((entry) => ({
            ...entry,
            entry_date: `${entry.entry_date} 00:00:00`, // Append the time part
          })),
        };

        console.log(updatedFormData);
        const response = await axios.post(
          "https://scrumdaddybackend.studio/wfhRequests",
          updatedFormData
        );
        console.log("Request submitted successfully:", response.data);

        setFormData({
          requester_id: user.staff_id,
          reporting_manager: user.reporting_manager,
          department: user.dept,
          entries: [{ entry_date: "", duration: "", reason: "" }],
        });

        // Show Snackbar notification
        onClose();
        setSnackbarMessage("Request submitted successfully!");
        setSnackbarSeverity("success");
        setOpenSnackbar(true);
        
      } catch (error) {
        console.error("Error submitting WFH request:", error);
        setSnackbarMessage("Error submitting request, please try again.");
        setSnackbarSeverity("error");
        setOpenSnackbar(true);
      }
    } else if (!isValid) {
      console.log("Validation failed.");
      setSnackbarMessage("Submission failed. Please check form for errors.");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    } else {
      console.log("Validation failed or duplicate request detected.");
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setOpenSnackbar(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Request Form</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Typography variant="body1">
              <strong>Name:</strong> {fullName}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body1">
              <strong>Department/Team:</strong> {user.dept}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body1">
              <strong>Employee ID:</strong> {user.staff_id}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body1">
              <strong>Reporting Manager:</strong> {reportingManager}
            </Typography>
          </Grid>
        </Grid>

        {formData.entries.map((request, index) => (
          <Box key={index} sx={{ mb: 2, padding: 2, border: "1px solid #ccc" }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Request {index + 1}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date"
                  type="date"
                  value={request.entry_date}
                  onChange={(e) =>
                    handleInputChange(index, "entry_date", e.target.value)
                  }
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  required
                  error={!!errors[index]?.entry_date}
                  helperText={errors[index]?.entry_date || ""}
                  // Disable past dates by setting the minimum date to today
                  inputProps={{
                    min: new Date().toISOString().split("T")[0],
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Duration</InputLabel>
                  <Select
                    value={request.duration}
                    onChange={(e) =>
                      handleInputChange(index, "duration", e.target.value)
                    }
                    label="Duration"
                  >
                    <MenuItem value="AM">AM</MenuItem>
                    <MenuItem value="PM">PM</MenuItem>
                    <MenuItem value="Full Day">Full Day</MenuItem>
                  </Select>
                  {errors[index]?.duration && (
                    <Typography color="error" variant="body2">
                      {errors[index].duration}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Reason for Request"
                  multiline
                  rows={3}
                  value={request.reason}
                  onChange={(e) =>
                    handleInputChange(index, "reason", e.target.value)
                  }
                  fullWidth
                  required
                  error={!!errors[index]?.reason}
                  helperText={errors[index]?.reason || ""}
                />
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" justifyContent="flex-end">
                  <IconButton
                    onClick={() => deleteRequest(index)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Grid>
            </Grid>
          </Box>
        ))}

        <Button onClick={addMoreDates} variant="contained" sx={{ mt: 2 }}>
          Add More Dates
        </Button>
      </DialogContent>

      <DialogActions>
        <Box mt={3}>
          <Button variant="outlined" color="secondary" onClick={onClose}>
            Cancel
          </Button>
        </Box>
        <Box mt={3}>
          <Button variant="contained" color="primary" onClick={handleSubmit}>
            Submit Request
          </Button>
        </Box>
      </DialogActions>

      {/* Snackbar for notifications */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default WFHModal;
