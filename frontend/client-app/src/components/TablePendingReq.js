import * as React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';
import { IconButton, TablePagination, Collapse, Box, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Chip from '@mui/material/Chip';
import TableSortLabel from '@mui/material/TableSortLabel';
import axios from 'axios';
import { useSelector } from "react-redux";
import { selectUser } from "../redux/userSlice";
import Tooltip from '@mui/material/Tooltip';
import Fade from "@mui/material/Fade";
import Snackbar from "@mui/material/Snackbar";
import { useNavigate, useLocation } from "react-router-dom"; // Import useLocation
import RequestModal from "./RequestModal";
import UndoIcon from '@mui/icons-material/Undo';
import DoneIcon from '@mui/icons-material/Done';
import CloseIcon from '@mui/icons-material/Close';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

const columns = [
  { id: 'icon', name: '' },
  { id: 'request_id', name: 'Request Id', sortable: false },
  { id: 'requester_id', name: 'Requester Id', sortable: false },
  { id: 'reporting_manager', name: 'Reporting Manager', sortable: false },
  { id: 'created_at', name: 'Created Request Date', sortable: true },
  { id: 'overall_status', name: 'Overall Status', sortable: false },
];

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.common.white,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));


const TablePendingReq = ({ fetchWFHRequests }) => {

  const user = useSelector(selectUser);

  const [openRow, setOpenRow] = React.useState({});
  const [sortConfig, setSortConfig] = React.useState({ key: '', direction: 'asc' }); //sort the created_at
  const [entrySortConfig, setEntrySortConfig] = React.useState({ key: '', direction: 'asc' });
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const [state, setState] = React.useState({
    open: false,
    Transition: Fade,
    message: '',
  });
  const [withdrawSelectedEntries, setWithdrawSelectedEntries] = React.useState({}); //withdraw
  const [rejectSelectedEntries, setRejectSelectedEntries] = React.useState({});

  const [isRejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [isWithdrawalModalOpen, setWithdrawalModalOpen] = React.useState(false);

  const navigate = useNavigate();
  const location = useLocation(); // Get the current location

  const handleClick = (Transition, message) => () => {
    setState({
      open: true,
      Transition,
      message,
    });
  };

  const handleClose = () => {
    setState({
      ...state,
      open: false,
    });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleWithdrawalClick = (request, entry) => {
    const selectedEntries = withdrawSelectedEntries[request.request_id] || [];
    const entriesToWithdraw = request.entries.filter((e) =>
      selectedEntries.includes(e.entry_id) || e.entry_id === entry.entry_id
    );
    // if (entriesToWithdraw.length > 0) {
      setWithdrawSelectedEntries((prev) => ({
        ...prev,
        [request.request_id]: entriesToWithdraw,
      }));
      setWithdrawalModalOpen(true);
    // }
  };
  
  const handleRejectClick = (request, entry) => {
    const selectedEntries = rejectSelectedEntries[request.request_id] || [];
    const entriesToReject = request.entries.filter((e) =>
      selectedEntries.includes(e.entry_id) || e.entry_id === entry.entry_id
    );
    setRejectSelectedEntries((prev) => ({
      ...prev,
      [request.request_id]: entriesToReject,
    }));
  
    // Open the rejection modal and store the current request and entry details
    setRejectModalOpen(true);
  };

  const handleToggleRow = (request_id) => {
    setOpenRow((prev) => {
      const isOpen = prev[request_id];

      // Check if the current location is jackRequestsPage
      if (location.pathname.includes("/myRequestsPage")) {
        if (!isOpen) {
          // Modify the URL by appending the request_id for jackRequestsPage
          navigate(`/myRequestsPage/${request_id}`, { replace: true });
        } else {
          // Revert to the base URL when collapsing the row.
          navigate(`/myRequestsPage`, { replace: true });
        }
      } 
      // If on jackPersonalRequestsPage, don't navigate
      else if (location.pathname.includes("/requestsPage")) {
        // Toggle the row open/collapse state without changing the URL
        if (!isOpen) {
          // Modify the URL by appending the request_id for jackRequestsPage
          navigate(`/requestsPage/${request_id}`, { replace: true });
        } else {
          // Revert to the base URL when collapsing the row.
          navigate(`/requestsPage`, { replace: true });
        }
      }

      // Toggle the row open/collapse state
      return { ...prev, [request_id]: !prev[request_id] };
    });
  };

  const handleRequestSort = (columnId) => {
    const isSortable = columns.find((col) => col.id === columnId)?.sortable;
    if (!isSortable) return;

    const isAsc = sortConfig.key === columnId && sortConfig.direction === 'asc';
    setSortConfig({ key: columnId, direction: isAsc ? 'desc' : 'asc' });
  };

  const handleCancelEntries = async (request_id, entry_id) => {
    const payload = {
      request_id: request_id,
      entry_ids: [entry_id], // Revoke only the clicked entry
    };

    try {
      // Call the API to cancel the specific entry
      await axios.put('https://scrumdaddybackend.studio/wfhRequests/cancel', payload);
  
      console.log(`Entry ${entry_id} for request ${request_id} cancelled successfully.`);
      handleClick(Fade, "Cancel Successful")();
    } catch (error) {
      console.error('Error cancelling entry:', error);
      handleClick(Fade, "Cancel Failed")();
    }
  };

  const handleRejectEntries = async (formData) => {
    const validEntriesToReject = formData.entry_ids || [];

    const payload = {
      request_id: formData.requestId,
      entry_ids: validEntriesToReject.map((entry) => ({
        entry_id: entry.entry_id,
        reason: entry.reason,
      })),
    };

    console.log("Payload:", payload);

    try {
      const response = await axios.put(
        "https://scrumdaddybackend.studio/wfhRequests/reject",
        payload
      );

      console.log("Response:", response.data);

      setRejectSelectedEntries((prev) => ({
        ...prev,
        [formData.requestId]: [],
      }));

      const requestRejectDetails = fetchWFHRequests.find(
        (req) => req.request_id === formData.requestId
      );
      const hasPendingEntries = requestRejectDetails.entries.some(
        (entry) => entry.status === "Pending"
      );

      if (!hasPendingEntries) {
        console.log(
          `Updating overall status for request ${formData.requestId} to 'Reviewed'`
        );
      }
      setRejectModalOpen(false);
      handleClick(Fade, "Rejected Successful")();
    } catch (error) {
      console.error("Error rejecting entries:", error);
      handleClick(Fade, "Rejected Failed")();
    }
  };

  const handleWithdrawalEntries = async (formData) => {
    const validEntriesToWithdraw = formData.entry_ids || [];

    const payload = {
      request_id: formData.requestId,
      entry_ids: validEntriesToWithdraw.map((entry) => ({
        entry_id: entry.entry_id,
        reason: entry.reason,
      })),
    };
    console.log(payload);
    try {
      const response = await axios.put(
        "https://scrumdaddybackend.studio/wfhRequests/withdraw",
        payload
      );
      console.log("Response:", response.data);

      setWithdrawSelectedEntries((prev) => ({
        ...prev,
        [formData.requestId]: [],
      }));

      const requestWithdrawDetails = fetchWFHRequests.find(
        (req) => req.request_id === formData.requestId
      );
      const hasPendingEntries = requestWithdrawDetails.entries.some(
        (entry) => entry.status === "Pending"
      );

      if (!hasPendingEntries) {
        console.log(
          `Updating overall status for request ${formData.requestId} to 'Reviewed'`
        );
      }
      handleClick(Fade, "Withdrawn Successful")();
    } catch (error) {
      console.error('Error withdrawing entries:', error);
      handleClick(Fade, "Withdrawn Failed")();
    }
  };

  const handleApproveEntry = async (request_id, entry_id) => {
    const payload = {
      request_id: request_id,
      entry_ids: [entry_id], // Revoke only the clicked entry
    };
  
    try {
      // Call the API to revoke the specific entry
      await axios.put('https://scrumdaddybackend.studio/wfhRequests/approve', payload);
  
      console.log(`Entry ${entry_id} for request ${request_id} approved successfully.`);
      handleClick(Fade, "Approve Successful")();
    } catch (error) {
      console.error('Error approving entry:', error);
      handleClick(Fade, "Approve Failed")();
    }
  };
  
  const handleRevokeEntry = async (request_id, entry_id) => {
    const payload = {
      request_id: request_id,
      entry_ids: [entry_id], // Revoke only the clicked entry
    };
  
    try {
      // Call the API to revoke the specific entry
      await axios.put('https://scrumdaddybackend.studio/wfhRequests/revoke', payload);
  
      console.log(`Entry ${entry_id} for request ${request_id} revoked successfully.`);
      handleClick(Fade, "Revoked Successful")();
  
      // Optionally, you can refresh the data or update the state here after the revocation
      // For example, you can clear the revoked entry from the UI or refresh the list of requests
    } catch (error) {
      console.error('Error revoking entry:', error);
      handleClick(Fade, "Revoked Failed")();
    }
  };

  const handlePendingWithdrawalEntries = async (request_id, entry_id) => {

    const payload = {
      request_id: request_id,
      entry_ids: [entry_id],
    };

    try {
      await axios.put('https://scrumdaddybackend.studio/wfhRequests/acknowledge', payload);

      // Clear selected entries after revoking
      console.log(`Entry ${entry_id} for request ${request_id} approved successfully.`);
      handleClick(Fade, "Approve Successful")();
  
      // Optionally, you can refresh the data or update the state here after the revocation
      // For example, you can clear the revoked entry from the UI or refresh the list of requests
    } catch (error) {
      console.error('Error approving entry:', error);
      handleClick(Fade, "Approve Failed")();
    }
  };

  const handleEntrySort = (request_id, columnId) => {
    const isAsc = entrySortConfig.key === columnId && entrySortConfig.direction === 'asc';
    setEntrySortConfig({ key: columnId, direction: isAsc ? 'desc' : 'asc' });

    fetchWFHRequests.forEach(request => {
      if (request.request_id === request_id) {
        request.entries.sort((a, b) => {
          const aValue = a[columnId];
          const bValue = b[columnId];

          if (aValue < bValue) return entrySortConfig.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return entrySortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }
    });
  };

  const sortedRequests = React.useMemo(() => {
    let sortedData = [...fetchWFHRequests];
    if (sortConfig.key) {
      sortedData.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortedData;
  }, [fetchWFHRequests, sortConfig]);

  const paginatedRequests = sortedRequests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <div>
      <TableContainer component={Paper}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <StyledTableCell align="right" key={column.id}>
                  {column.sortable ? (
                    <TableSortLabel
                      active={sortConfig.key === column.id}
                      direction={sortConfig.key === column.id ? sortConfig.direction : 'asc'}
                      onClick={() => handleRequestSort(column.id)}
                    >
                      {column.name}
                    </TableSortLabel>
                  ) : (
                    column.name
                  )}
                </StyledTableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRequests.map((request) => (
              <React.Fragment key={request.request_id}>
                <StyledTableRow>
                  <StyledTableCell align="right">
                    <IconButton aria-label="expand row" size="small" onClick={() => handleToggleRow(request.request_id)}>
                      {openRow[request.request_id] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </StyledTableCell>
                  <StyledTableCell align="right">{request.request_id}</StyledTableCell>
                  <StyledTableCell align="right">{request.requester_id}</StyledTableCell>
                  <StyledTableCell align="right">{request.reporting_manager}</StyledTableCell>
                  <StyledTableCell align="right">{request.created_at}</StyledTableCell>
                  <StyledTableCell align="right">
                    <Chip
                      label={request.overall_status}
                      sx={{
                        backgroundColor:
                          request.overall_status === 'Pending'
                            ? 'orange'
                            : request.overall_status === 'Approved'
                            ? 'green'
                            : request.overall_status === 'Rejected'
                            ? 'red'
                            : request.overall_status === 'Cancelled'
                            ? 'pink'
                            : request.overall_status === 'Withdrawn'
                            ? 'blue'
                            : request.overall_status === 'Reviewed'
                            ? 'purple'
                            : request.overall_status === "Pending Withdrawal"
                            ? 'grey'
                            : request.overall_status === 'Auto Rejected'
                            ? 'violet'
                            : 'default',
                        color: 'white',
                      }}
                    />
                  </StyledTableCell>
                </StyledTableRow>
                <TableCell colSpan={6} style={{ paddingBottom: 0, paddingTop: 0 }}>
                  <Collapse in={openRow[request.request_id]} timeout="auto" unmountOnExit>
                    <Box margin={1}>
                      <Typography gutterBottom component="div">
                        Entries for Request ID: {request.request_id}
                      </Typography>
                      <Table size="small" aria-label="entries">
                        <TableHead>
                          <TableRow>
                            <TableCell></TableCell>
                            <TableCell>Entry ID</TableCell>
                            <TableCell>
                            <TableSortLabel
                                  active={entrySortConfig.key === 'entry_date'}
                                  direction={entrySortConfig.key === 'entry_date' ? entrySortConfig.direction : 'asc'}
                                  onClick={() => handleEntrySort(request.request_id, 'entry_date')}
                                >
                                  Entry Date
                              </TableSortLabel>
                            </TableCell>
                            <TableCell>Reason</TableCell>
                            <TableCell>Duration</TableCell>
                            <TableCell>Action</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {request.entries.map((detail) => (
                            <TableRow key={detail.entry_id}>
                              <TableCell align="center">
                              </TableCell>
                              <TableCell>{detail.entry_id}</TableCell>
                              <TableCell>{detail.entry_date}</TableCell>
                              <TableCell>{detail.reason}</TableCell>
                              <TableCell>{detail.duration}</TableCell>
                              <TableCell>
                              {detail.status === "Pending" && //for pending req for managers to approve and reject
                                  request.reporting_manager ===
                                  user.staff_id && (
                                    <>
                                    <Tooltip title="Approve" arrow>
                                      <IconButton
                                        onClick={() => handleApproveEntry(request.request_id, detail.entry_id)}
                                        style={{ marginRight: 8, cursor: 'pointer' }} // Add spacing between buttons
                                      >
                                        <DoneIcon />
                                      </IconButton>
                                    </Tooltip>
                                  
                                    <Tooltip title="Reject" arrow>
                                      <IconButton
                                        onClick={() => handleRejectClick(request, detail)} // Pass the request and entry details
                                        style={{ marginLeft: 8 }}
                                      >
                                        <CloseIcon />
                                      </IconButton>
                                    </Tooltip>
                                  
                                    {/* Conditionally render the Reject Modal */}
                                    {isRejectModalOpen && (
                                      <RequestModal
                                        title="Reject Entries"
                                        selectedEntries={rejectSelectedEntries[request.request_id]} // Pass the selected entries for the request
                                        open={isRejectModalOpen}
                                        onClose={() => setRejectModalOpen(false)} // Close the modal
                                        handleSubmit={handleRejectEntries} // Backend update on submission
                                      />
                                    )}
                                  </>
                                )}
                              {detail.status === 'Approved' && 
                              request.requester_id === user.staff_id && ( //for requests that have been approved and staff want to revoke
                                  <Tooltip title="Revoke" arrow>
                                    <IconButton
                                    onClick={() => handleRevokeEntry(request.request_id, detail.entry_id)}
                                    >
                                      <UndoIcon />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              
                              {detail.status === 'Approved' && request.requester_id !== user.staff_id && request.reporting_manager === user.staff_id && (
                                  <>
                                  <Tooltip label="Withdraw" arrow>
                                    <IconButton 
                                      onClick={() => handleWithdrawalClick(request, detail)} // Pass the request and entry details
                                    >
                                      <SystemUpdateAltIcon />
                                    </IconButton>
                                  </Tooltip>
                                  {isWithdrawalModalOpen &&
                                    withdrawSelectedEntries[request.request_id]
                                      ?.length > 0 && (
                                      <RequestModal
                                        title="Withdraw Request"
                                        selectedEntries={
                                          withdrawSelectedEntries[request.request_id]
                                        }
                                        open={isWithdrawalModalOpen}
                                        onClose={() => setWithdrawalModalOpen(false)}
                                        handleSubmit={handleWithdrawalEntries}
                                      />
                                    )}
                                    </>
                                  )}
                               
                              {detail.status === 'Pending' && 
                                request.requester_id === user.staff_id && ( //those pending status where the requestor want to retract it
                                  <Tooltip label="Cancel" arrow> 
                                    <IconButton onClick={() => handleCancelEntries(request.request_id, detail.entry_id)}>
                                      <DeleteForeverIcon></DeleteForeverIcon>
                                    </IconButton>
                                  </Tooltip> 
                                )}
                              {(detail.status === 'Pending Withdrawal' && 
                                request.reporting_manager === user.staff_id)  && ( 
                                  //those pending withdrawal status and the reporting manager is the login user
                                  <Tooltip label="Acknowledge" arrow>
                                    <IconButton onClick={() => handlePendingWithdrawalEntries(request.request_id, detail.entry_id)}>
                                      <DoneIcon></DoneIcon>
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={detail.status}
                                  sx={{
                                    backgroundColor:
                                      detail.status === 'Pending'
                                        ? 'orange'
                                        : detail.status === 'Approved'
                                        ? 'green'
                                        : detail.status === 'Rejected'
                                        ? 'red'
                                        : detail.status === 'Cancelled'
                                        ? 'orange'
                                        : detail.status === 'Withdrawn'
                                        ? 'blue'
                                        : detail.status === 'Reviewed'
                                        ? 'purple'
                                        : detail.status === 'Pending Withdrawal'
                                        ? 'grey'
                                        : detail.status === 'Auto Rejected'
                                        ? 'violet'
                                        : 'default',
                                    color: 'white',
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  </Collapse>
                </TableCell>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={fetchWFHRequests.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
      <Snackbar
        open={state.open}
        onClose={handleClose}
        TransitionComponent={state.Transition}
        message={state.message}
        key={state.Transition.name}
        autoHideDuration={1200}
      />
    </div>
  )
};

export default TablePendingReq
