import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../redux/userSlice";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import axios from "axios";
import { TablePagination, Box, Button } from "@mui/material";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";

const Notification = ({ getNotifications }) => {
  const [employeeDetails, setEmployeeDetails] = useState({});
  const [allNotifications, setAllNotifications] = useState();
  const [deleNotifications, setDeleNotifications] = useState();
  const [loading, setLoading] = useState(true); // Loading state
  const user = useSelector(selectUser);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [tabValue, setTabValue] = useState(0); // Track which tab is selected
  const navigate = useNavigate(); // Initialize the useNavigate hook

  const getEmployeeByStaffID = async (staff_id) => {
    try {
      const response = await axios.get(
        `https://scrumdaddybackend.studio/employees/`,
        {
          params: { staff_id },
        }
      );
      if (response && response.data && response.data.data) {
        return response.data.data[0]; // Assuming the API returns an array of employees
      }
    } catch (error) {
      console.error(
        `Error fetching employee with staff_id ${staff_id}:`,
        error
      );
    }
    return null; // Return null if no data
  };

  const getAllNotifications = useCallback(async () => {
    try {
      const response = await axios.get(
        `https://scrumdaddybackend.studio/wfhRequests/getAll/${user?.staff_id}`
      );
      if (response) {
        const notifications = response.data.data;
        setAllNotifications(notifications);

        const employeePromises = [];
        const staffIds = new Set();

        notifications.forEach((notification) => {
          const { requester_id, reporting_manager } = notification;

          if (requester_id && !staffIds.has(requester_id)) {
            staffIds.add(requester_id);
            employeePromises.push(
              getEmployeeByStaffID(requester_id).then((requestorDetails) => {
                if (requestorDetails) {
                  return { [requester_id]: requestorDetails };
                }
                return null;
              })
            );
          }

          if (reporting_manager && !staffIds.has(reporting_manager)) {
            staffIds.add(reporting_manager);
            employeePromises.push(
              getEmployeeByStaffID(reporting_manager).then(
                (reportingManagerDetails) => {
                  if (reportingManagerDetails) {
                    return { [reporting_manager]: reportingManagerDetails };
                  }
                  return null;
                }
              )
            );
          }
        });

        const employeeDetailsArray = await Promise.all(employeePromises);
        const newEmployeeDetails = employeeDetailsArray.reduce(
          (acc, detail) => {
            if (detail) {
              return { ...acc, ...detail };
            }
            return acc;
          },
          {}
        );

        setEmployeeDetails((prevDetails) => ({
          ...prevDetails,
          ...newEmployeeDetails,
        }));
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false); // Stop loading after data is fetched
      getNotifications();
    }
  }, [user?.staff_id, getNotifications]);

  const getDeleNotifications = useCallback(async () => {
    try {
      const response = await axios.get(
        `https://scrumdaddybackend.studio/employees/getAllDeleNoti/${user?.staff_id}`
      );
      if (response) {
        const notifications = response.data.data;
        setDeleNotifications(notifications);

        const employeePromises = [];
        const staffIds = new Set();

        notifications.forEach((notification) => {
          const { delegate_from, delegate_to } = notification;

          // Check if delegate_from exists in employeeDetails and skip if it does
          if (
            delegate_from &&
            !staffIds.has(delegate_from) &&
            !employeeDetails[delegate_from]
          ) {
            staffIds.add(delegate_from);
            employeePromises.push(
              getEmployeeByStaffID(delegate_from).then((requestorDetails) => {
                if (requestorDetails) {
                  return { [delegate_from]: requestorDetails };
                }
                return null;
              })
            );
          }

          // Check if delegate_to exists in employeeDetails and skip if it does
          if (
            delegate_to &&
            !staffIds.has(delegate_to) &&
            !employeeDetails[delegate_to]
          ) {
            staffIds.add(delegate_to);
            employeePromises.push(
              getEmployeeByStaffID(delegate_to).then(
                (reportingManagerDetails) => {
                  if (reportingManagerDetails) {
                    return { [delegate_to]: reportingManagerDetails };
                  }
                  return null;
                }
              )
            );
          }
        });

        const employeeDetailsArray = await Promise.all(employeePromises);
        const newEmployeeDetails = employeeDetailsArray.reduce(
          (acc, detail) => {
            if (detail) {
              return { ...acc, ...detail };
            }
            return acc;
          },
          {}
        );

        setEmployeeDetails((prevDetails) => ({
          ...prevDetails,
          ...newEmployeeDetails,
        }));
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false); // Stop loading after data is fetched
      getNotifications();
    }
  }, [user?.staff_id, getNotifications, employeeDetails]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleChangeTab = (event, newValue) => {
    setTabValue(newValue); // Change active tab
    setLoading(true);

    setPage(0);
    setRowsPerPage(10);

    if (newValue === 1) {
      getDeleNotifications();
    } else {
      getAllNotifications();
    }
  };

  const handleButtonClick = () => {
    navigate("/personalSchedule"); // Navigate to the /personalSchedule page
  };

  useEffect(() => {
    if (user) {
      getAllNotifications();
    }
  }, [user, getAllNotifications]);

  return (
    <div className="p-10 pt-26 ">
      <Box
        sx={{ borderBottom: 1, borderColor: "divider", marginBottom: "16px" }}
      >
        <Tabs
          value={tabValue}
          onChange={handleChangeTab}
          aria-label="Notifications Tabs"
        >
          <Tab label="WFH Requests Notifications" />
          {user.role !== 2 && <Tab label="Delegation Requests Notifications" />}
        </Tabs>
      </Box>
      {loading ? ( // Show loading spinner while loading
        <Stack
          spacing={2}
          direction="row"
          justifyContent="center"
          alignItems="center"
          sx={{ height: "80vh" }}
        >
          <CircularProgress />
        </Stack>
      ) : (
        <>
          {tabValue === 0 && (
            <div>
              <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="simple table">
                  <TableHead>
                    <TableRow className="bg-gray-200">
                      <TableCell>
                        <span className="font-bold">
                          Total: ({allNotifications.length})
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allNotifications
                      ?.slice(
                        page * rowsPerPage,
                        page * rowsPerPage + rowsPerPage
                      )
                      .map((notification) => {
                        const requesterName =
                          employeeDetails[notification.requester_id]
                            ?.staff_fname;
                        const reportingManagerName =
                          employeeDetails[notification.reporting_manager]
                            ?.staff_fname;
                        let message;
                        let NotificationIcon = NotificationsNoneOutlinedIcon;

                        if (notification.reporting_manager === user?.staff_id) {
                          if (
                            [
                              "Delivered",
                              "Edited",
                              "Auto Rejected",
                              "Withdrawn",
                            ].includes(notification.last_notification_status)
                          ) {
                            message = `${requesterName} has requested for a WFH arrangement.`;
                          } else if (
                            ["Cancelled", "Self-Withdrawn"].includes(
                              notification.last_notification_status
                            )
                          ) {
                            message = `${requesterName} has ${notification.last_notification_status.toLowerCase()} their WFH request.`;
                          } else if (
                            ["Acknowledged"].includes(
                              notification.last_notification_status
                            )
                          ) {
                            message = `${requesterName} has self-withdrawn their WFH request.`;
                          }
                        } else if (
                          notification.requester_id === user?.staff_id
                        ) {
                          if (
                            ["Edited", "Self-Withdrawn"].includes(
                              notification.last_notification_status
                            )
                          ) {
                            message = `${reportingManagerName} has reviewed your WFH request.`;
                          } else if (
                            notification.last_notification_status ===
                            "Acknowledged"
                          ) {
                            message = `${reportingManagerName} has acknowledged the withdrawal of your WFH request.`;
                          } else if (
                            notification.last_notification_status ===
                            "Auto Rejected"
                          ) {
                            message = `The system has auto-rejected your WFH request.`;
                          } else if (
                            notification.last_notification_status ===
                            "Withdrawn"
                          ) {
                            message = `${reportingManagerName} has withdrawn your WFH request.`;
                          }
                        }

                        return (
                          <TableRow
                            key={notification.request_id}
                            sx={{
                              "&:last-child td, &:last-child th": { border: 0 },
                            }}
                          >
                            <TableCell component="th" scope="row">
                              <NotificationIcon
                                style={{ marginRight: "8px" }}
                              />{" "}
                              <strong>
                                Request ID: {notification.request_id} |{" "}
                              </strong>{" "}
                              {message} <Button size="small">See more</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={allNotifications?.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </div>
          )}
          {tabValue === 1 && (
            <div>
              <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="simple table">
                  <TableHead>
                    <TableRow className="bg-gray-200">
                      <TableCell>
                        <span className="font-bold">
                          Total: ({deleNotifications.length})
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {deleNotifications
                      ?.slice(
                        page * rowsPerPage,
                        page * rowsPerPage + rowsPerPage
                      )
                      .map((notification) => {
                        const requesterName =
                          employeeDetails[notification.delegate_from]
                            ?.staff_fname;
                        const reportingManagerName =
                          employeeDetails[notification.delegate_to]
                            ?.staff_fname;
                        let message;
                        let NotificationIcon = PersonAddAltOutlinedIcon;

                        if (notification.delegate_to === user?.staff_id) {
                          message = `You have a delegation request from ${requesterName}`;
                        } else if (
                          notification.delegate_from === user?.staff_id
                        ) {
                          if (
                            ["accepted", "rejected"].includes(
                              notification.status
                            )
                          ) {
                            message = `${reportingManagerName} has ${notification.status} your delegation request.`;
                          }
                        }

                        return (
                          <TableRow
                            key={notification.request_id}
                            sx={{
                              "&:last-child td, &:last-child th": { border: 0 },
                            }}
                          >
                            <TableCell component="th" scope="row">
                              <NotificationIcon
                                style={{ marginRight: "8px" }}
                              />{" "}
                              <strong>
                                Delegate ID: {notification.delegate_id} |{" "}
                              </strong>{" "}
                              {message}
                              <Button size="small" onClick={handleButtonClick}>
                                See more
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={allNotifications?.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Notification;
