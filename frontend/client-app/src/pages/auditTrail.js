import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "../redux/userSlice";
import axios from "axios";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import {
  IconButton,
  TablePagination,
  Collapse,
  Box,
  Typography,
} from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

const AuditTrail = () => {
  const user = useSelector(selectUser);
  const [outerAudit, setOuterAudit] = useState({});
  const [innerAudit, setInnerAudit] = useState([]);
  const [employeeDetails, setEmployeeDetails] = useState({});
  const [loading, setLoading] = useState(true); // Loading state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [open, setOpen] = useState({});
  const [secondOpen, setSecondOpen] = useState({});
  const [tabValue, setTabValue] = useState(0); // Track which tab is selected
  const [deleOuterAudit, setDeleOuterAudit] = useState([]);
  const [deleInnerAudit, setDeleInnerAudit] = useState([]);

  const getEmployeeByStaffID = useCallback(async (staff_id) => {
    try {
      const response = await axios.get(
        `https://scrumdaddybackend.studio/employees/`,
        {
          params: { staff_id },
        }
      );
      if (response?.data?.data) {
        return response.data.data[0]; // Assuming the API returns an array of employees
      }
    } catch (error) {
      console.error(
        `Error fetching employee with staff_id ${staff_id}:`,
        error
      );
    }
    return null; // Return null if no data
  }, []);

  const getOuterAudit = useCallback(async () => {
    try {
      const staff_id = user.staff_id;
      let response = null;
      if (user.role === 1) {
        response = await axios.get(
          `https://scrumdaddybackend.studio/wfhRequests`
        );
      } else {
        response = await axios.get(
          `https://scrumdaddybackend.studio/wfhRequests/staff/${staff_id}`
        );
      }

      if (response) {
        const auditTrailData = response.data.data;
        setOuterAudit(auditTrailData);

        const employeePromises = [];
        const staffIds = new Set();

        auditTrailData.forEach((eachAuditTrail) => {
          const { requester_id, reporting_manager } = eachAuditTrail;

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
      console.error(`Error fetching audit trail`);
    } finally {
      setLoading(false); // Stop loading after data is fetched
    }
  }, [user, getEmployeeByStaffID]);

  const getInnerAudit = async (request_id) => {
    try {
      setInnerAudit([]);
      const response = await axios.get(
        `https://scrumdaddybackend.studio/wfhRequests/getAuditTrail/${request_id}`
      );

      if (response) {
        console.log(response.data.data);
        setInnerAudit(response.data.data);
      }
    } catch (error) {
      console.error(`Error fetching employee with`);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleToggleRow = (request_id) => {
    setOpen((prevOpen) => (prevOpen === request_id ? null : request_id));
    getInnerAudit(request_id);
  };

  const handleSecondToggleRow = (request_id) => {
    setSecondOpen((prevSecondOpen) =>
      prevSecondOpen === request_id ? null : request_id
    );
    getDeleInnerAudit(request_id);
  };

  const handleChangeTab = (event, newValue) => {
    setTabValue(newValue); // Change active tab
    setLoading(true);

    setPage(0);
    setRowsPerPage(5);

    setOpen({});
    setSecondOpen({});

    if (newValue === 1) {
      getDeleOuterAudit();
    } else {
      getOuterAudit();
    }
  };

  const getDeleOuterAudit = async () => {
    try {
      console.log(user.role);
      const staff_id = user.staff_id;
      let response = null;

      if (user.role === 1) {
        response = await axios.get(
          `https://scrumdaddybackend.studio/employees/delegate`
        );
      } else {
        response = await axios.get(
          `https://scrumdaddybackend.studio/employees/delegate/${staff_id}`
        );
      }
      if (response) {
        console.log(response.data.data);
        const delegateData = response.data.data;
        setDeleOuterAudit(delegateData);

        const employeePromises = [];
        const newEmployeeDetails = { ...employeeDetails }; // Start with existing employee details

        delegateData.forEach((delegate) => {
          const { delegate_from, delegate_to } = delegate;

          // Check if delegate_from exists in employeeDetails
          if (!newEmployeeDetails[delegate_from]) {
            employeePromises.push(
              getEmployeeByStaffID(delegate_from).then((details) => {
                if (details) {
                  return { [delegate_from]: details };
                }
                return null;
              })
            );
          }

          // Check if delegate_to exists in employeeDetails
          if (!newEmployeeDetails[delegate_to]) {
            employeePromises.push(
              getEmployeeByStaffID(delegate_to).then((details) => {
                if (details) {
                  return { [delegate_to]: details };
                }
                return null;
              })
            );
          }
        });

        // Wait for all employee details to resolve
        const employeeDetailsArray = await Promise.all(employeePromises);
        const updatedEmployeeDetails = employeeDetailsArray.reduce(
          (acc, detail) => {
            if (detail) {
              return { ...acc, ...detail };
            }
            return acc;
          },
          {}
        );

        // Update employeeDetails state with new data
        setEmployeeDetails((prevDetails) => ({
          ...prevDetails,
          ...updatedEmployeeDetails,
        }));
      }
    } catch (error) {
      console.error(`Error fetching employee with`);
    } finally {
      setLoading(false); // Stop loading after data is fetched
    }
  };

  const getDeleInnerAudit = async (request_id) => {
    try {
      setDeleInnerAudit([]);
      const response = await axios.get(
        `https://scrumdaddybackend.studio/employees/delegate-status-history/${request_id}`
      );

      if (response) {
        console.log(response.data.data);
        setDeleInnerAudit(response.data.data);
      }
    } catch (error) {
      console.error(`Error fetching employee with`);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB"); // 'en-GB' formats the date as DD/MM/YYYY
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);

    // Extract the components
    const day = String(date.getDate()).padStart(2, "0"); // Get day and pad with zero if needed
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Get month (0-based)
    const year = date.getFullYear(); // Get full year
    const hours = String(date.getHours()).padStart(2, "0"); // Get hours
    const minutes = String(date.getMinutes()).padStart(2, "0"); // Get minutes
    const seconds = String(date.getSeconds()).padStart(2, "0"); // Get seconds

    // Format the date and time
    return `${day}-${month}-${year}, ${hours}:${minutes}:${seconds}`;
  };

  useEffect(() => {
    if (user) {
      getOuterAudit();
    }
  }, [user, getOuterAudit]);

  return (
    <div className="pt-16 p-10">
      {/* Tabs for WFH and Delegation Requests */}
      <Box
        sx={{ borderBottom: 1, borderColor: "divider", marginBottom: "16px" }}
      >
        <Tabs
          value={tabValue}
          onChange={handleChangeTab}
          aria-label="Audit Tabs"
        >
          <Tab label="WFH Requests Audit" />
          {user.role !== 2 && <Tab label="Delegation Requests Audit" />}
        </Tabs>
      </Box>

      {/* Show loading spinner while loading */}
      {loading ? (
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
          {/* WFH Requests Audit Tab */}
          {tabValue === 0 && (
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }} aria-label="WFH requests table">
                <TableHead>
                  <TableRow className="bg-gray-200">
                    <TableCell />
                    <TableCell>S/N</TableCell>
                    <TableCell>Requester</TableCell>
                    <TableCell>Reporting Manager</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Created at</TableCell>
                    <TableCell>Overall Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {outerAudit
                    ?.slice(
                      page * rowsPerPage,
                      page * rowsPerPage + rowsPerPage
                    )
                    .map((eachAudit, index) => {
                      let requesterName =
                        employeeDetails[eachAudit.requester_id]?.staff_fname;
                      let reportingManagerName =
                        employeeDetails[eachAudit.reporting_manager]
                          ?.staff_fname;
                      const serialNumber = page * rowsPerPage + index + 1;

                      if (requesterName === user.staff_fname) {
                        requesterName = "Me";
                      }
                      if (reportingManagerName === user.staff_fname) {
                        reportingManagerName = "Me";
                      }

                      return (
                        <React.Fragment key={eachAudit.request_id}>
                          <TableRow
                            sx={{
                              "&:last-child td, &:last-child th": { border: 0 },
                            }}
                          >
                            <TableCell>
                              <IconButton
                                aria-label="expand row"
                                size="small"
                                onClick={() =>
                                  handleToggleRow(eachAudit.request_id)
                                }
                              >
                                {open === eachAudit.request_id ? (
                                  <KeyboardArrowUpIcon />
                                ) : (
                                  <KeyboardArrowDownIcon />
                                )}
                              </IconButton>
                            </TableCell>
                            <TableCell>{serialNumber}</TableCell>
                            <TableCell>{requesterName}</TableCell>
                            <TableCell>{reportingManagerName}</TableCell>
                            <TableCell>{eachAudit.department}</TableCell>
                            <TableCell>
                              {formatDateTime(eachAudit.created_at)}
                            </TableCell>
                            <TableCell>{eachAudit.overall_status}</TableCell>
                          </TableRow>
                          {/* Collapsible row */}
                          <TableRow>
                            <TableCell
                              style={{ paddingBottom: 0, paddingTop: 0 }}
                              colSpan={7}
                            >
                              <Collapse
                                in={open === eachAudit.request_id}
                                timeout="auto"
                                unmountOnExit
                              >
                                <Box margin={1}>
                                  <Typography
                                    variant="h6"
                                    gutterBottom
                                    component="div"
                                  >
                                    Audit Trail for WFH Request ID{" "}
                                    {eachAudit.request_id}
                                  </Typography>
                                  {innerAudit && (
                                    <Table>
                                      <TableHead>
                                        <TableRow>
                                          <TableCell>S/N</TableCell>
                                          <TableCell>Request ID</TableCell>
                                          <TableCell>Entry ID</TableCell>
                                          <TableCell>Requested Date</TableCell>
                                          <TableCell>Reason for WFH</TableCell>
                                          <TableCell>Status</TableCell>
                                          <TableCell>Action Reason</TableCell>
                                          <TableCell>Modified at</TableCell>
                                          <TableCell>Modified by</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {innerAudit.map((eachIAudit, index) => {
                                          // const reportingManagerName = employeeDetails[eachIAudit.reporting_manager]?.staff_fname;
                                          let requesterName =
                                            employeeDetails[
                                              eachIAudit.requester_id
                                            ]?.staff_fname;
                                          let reportingManagerName =
                                            employeeDetails[
                                              eachIAudit.reporting_manager
                                            ]?.staff_fname;

                                          let displayName;

                                          if (eachIAudit.status === "Pending") {
                                            displayName = requesterName; // Use requesterName if status is pending
                                          } else {
                                            displayName = reportingManagerName; // Use reportingManagerName otherwise
                                          }

                                          // Check if the names correspond to the user and change to "Me"
                                          if (
                                            displayName === user.staff_fname
                                          ) {
                                            displayName = "Me";
                                          } else if (
                                            displayName === user.staff_fname
                                          ) {
                                            displayName = "Me";
                                          }

                                          return (
                                            <TableRow key={eachIAudit.entry_id}>
                                              <TableCell>{index + 1}</TableCell>
                                              <TableCell>
                                                {eachIAudit.request_id || "-"}
                                              </TableCell>
                                              <TableCell>
                                                {eachIAudit.entry_id || "-"}
                                              </TableCell>
                                              <TableCell>
                                                {eachIAudit.entry_date
                                                  ? formatDate(
                                                      eachIAudit.entry_date
                                                    )
                                                  : "-"}
                                              </TableCell>
                                              <TableCell>
                                                {eachIAudit.reason || "-"}
                                              </TableCell>
                                              <TableCell>
                                                {eachIAudit.status || "-"}
                                              </TableCell>
                                              <TableCell>
                                                {eachIAudit.action_reason ||
                                                  "-"}
                                              </TableCell>
                                              <TableCell>
                                                {eachIAudit.created_at
                                                  ? formatDateTime(
                                                      eachIAudit.created_at
                                                    )
                                                  : "-"}
                                              </TableCell>
                                              <TableCell>
                                                {displayName || "-"}
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  )}
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    })}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={outerAudit?.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </TableContainer>
          )}

          {/* Delegation Requests Audit Tab */}
          {tabValue === 1 && (
            <TableContainer component={Paper}>
              <Table
                sx={{ minWidth: 650 }}
                aria-label="delegation requests table"
              >
                <TableHead>
                  <TableRow className="bg-gray-200">
                    <TableCell />
                    <TableCell>S/N</TableCell>
                    <TableCell>Requester</TableCell>
                    <TableCell>Delegatee</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>End Date</TableCell>
                    <TableCell>Overall Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deleOuterAudit
                    ?.slice(
                      page * rowsPerPage,
                      page * rowsPerPage + rowsPerPage
                    )
                    .map((eachDeleAudit, index) => {
                      let requesterName =
                        employeeDetails[eachDeleAudit.delegate_from]
                          ?.staff_fname;
                      let reportingManagerName =
                        employeeDetails[eachDeleAudit.delegate_to]?.staff_fname;
                      const serialNumber = page * rowsPerPage + index + 1;

                      if (requesterName === user.staff_fname) {
                        requesterName = "Me";
                      }
                      if (reportingManagerName === user.staff_fname) {
                        reportingManagerName = "Me";
                      }

                      return (
                        <React.Fragment key={eachDeleAudit.delegate_id}>
                          <TableRow
                            sx={{
                              "&:last-child td, &:last-child th": { border: 0 },
                            }}
                          >
                            <TableCell>
                              <IconButton
                                aria-label="expand row"
                                size="small"
                                onClick={() =>
                                  handleSecondToggleRow(
                                    eachDeleAudit.delegate_id
                                  )
                                }
                              >
                                {secondOpen === eachDeleAudit.delegate_id ? (
                                  <KeyboardArrowUpIcon />
                                ) : (
                                  <KeyboardArrowDownIcon />
                                )}
                              </IconButton>
                            </TableCell>
                            <TableCell>{serialNumber}</TableCell>
                            <TableCell>{requesterName}</TableCell>
                            <TableCell>{reportingManagerName}</TableCell>
                            <TableCell>{eachDeleAudit.department}</TableCell>
                            <TableCell>{eachDeleAudit.reason}</TableCell>
                            <TableCell>
                              {formatDate(eachDeleAudit.start_date)}
                            </TableCell>
                            <TableCell>
                              {formatDate(eachDeleAudit.end_date)}
                            </TableCell>
                            <TableCell>
                              {eachDeleAudit.status.charAt(0).toUpperCase() +
                                eachDeleAudit.status.slice(1)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell
                              style={{ paddingBottom: 0, paddingTop: 0 }}
                              colSpan={9}
                            >
                              <Collapse
                                in={secondOpen === eachDeleAudit.delegate_id}
                                timeout="auto"
                                unmountOnExit
                              >
                                <Box margin={1}>
                                  <Typography
                                    variant="h6"
                                    gutterBottom
                                    component="div"
                                  >
                                    Audit Trail for Delegate Request ID{" "}
                                    {eachDeleAudit.delegate_id}
                                  </Typography>
                                  {deleInnerAudit && (
                                    <Table>
                                      <TableHead>
                                        <TableRow>
                                          <TableCell colSpan={2}></TableCell>
                                          <TableCell>S/N</TableCell>
                                          <TableCell>Status</TableCell>
                                          <TableCell>Modified at</TableCell>
                                          <TableCell>Modified by</TableCell>
                                          <TableCell colSpan={3}></TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {deleInnerAudit.map(
                                          (eachDAudit, index) => {
                                            let requesterName =
                                              employeeDetails[
                                                eachDAudit.delegate_from
                                              ]?.staff_fname;
                                            let reportingManagerName =
                                              employeeDetails[
                                                eachDAudit.delegate_to
                                              ]?.staff_fname;

                                            let displayName;

                                            if (
                                              eachDAudit.status === "pending"
                                            ) {
                                              displayName = requesterName; // Use requesterName if status is pending
                                            } else {
                                              displayName =
                                                reportingManagerName; // Use reportingManagerName otherwise
                                            }

                                            // Check if the names correspond to the user and change to "Me"
                                            if (
                                              displayName === user.staff_fname
                                            ) {
                                              displayName = "Me";
                                            } else if (
                                              displayName === user.staff_fname
                                            ) {
                                              displayName = "Me";
                                            }

                                            return (
                                              <TableRow
                                                key={eachDAudit.delegate_id}
                                              >
                                                <TableCell
                                                  colSpan={2}
                                                ></TableCell>
                                                <TableCell>
                                                  {index + 1}
                                                </TableCell>
                                                <TableCell>
                                                  {eachDAudit.status
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    eachDAudit.status.slice(1)}
                                                </TableCell>
                                                <TableCell>
                                                  {formatDateTime(
                                                    eachDAudit.updated_on
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  {displayName}
                                                </TableCell>
                                                <TableCell
                                                  colSpan={3}
                                                ></TableCell>
                                              </TableRow>
                                            );
                                          }
                                        )}
                                      </TableBody>
                                    </Table>
                                  )}
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    })}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={deleOuterAudit?.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </TableContainer>
          )}
        </>
      )}
    </div>
  );
};

export default AuditTrail;
