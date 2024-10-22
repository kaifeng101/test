import React, { useState, useEffect } from "react";
import {
  TextField,
  Grid,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Divider,
  Typography,
  Card,
  CardContent,
} from "@mui/material";

const RequestModal = ({
  title,
  selectedEntries,
  open,
  onClose,
  handleSubmit,
}) => {
  // console.log(selectedEntries)
  const [request, setRequest] = useState({
    requestId: "",
    entry_ids: [],
  });

  useEffect(() => {
    if (selectedEntries && Array.isArray(selectedEntries)) {
      setRequest({
        requestId: selectedEntries[0]?.request_id,
        entry_ids: selectedEntries.map((entry) => ({
          entry_id: entry.entry_id,
          reason: "",
        })),
      });
    }
  }, [selectedEntries]);

  const handleEntryChange = (index, e) => {
    const { name, value } = e.target;
    const updatedEntries = [...request.entry_ids];
    updatedEntries[index] = {
      ...updatedEntries[index],
      [name]: value,
    };
    setRequest((prev) => ({
      ...prev,
      entry_ids: updatedEntries,
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Card sx={{ maxWidth: 800, margin: "auto" }}>
          <CardContent>
            <Grid container spacing={2}>
              {selectedEntries.requestId && (
                <Grid item xs={12}>
                  <TextField
                    label="Request ID"
                    name="request_id"
                    value={selectedEntries.requestId || ""}
                    fullWidth
                    disabled
                  />
                </Grid>
              )}

              {Array.isArray(selectedEntries) && selectedEntries.length > 0 ? (
                selectedEntries.map((entry, index) => (
                  <React.Fragment key={index}>
                    <Grid item xs={12}>
                      <Typography variant="h6">Entry {index + 1}</Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Entry ID"
                        type="text"
                        name="entry_id"
                        value={entry.entry_id}
                        fullWidth
                        disabled
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Entry Date"
                        type="text"
                        name="entry_date"
                        value={entry.entry_date}
                        fullWidth
                        disabled
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Duration"
                        type="text"
                        name="duration"
                        value={entry.duration}
                        fullWidth
                        disabled
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Reason for Request"
                        name="reason"
                        value={entry.reason}
                        fullWidth
                        disabled
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        label="Reason"
                        multiline
                        rows={3}
                        name="reason"
                        value={request.entry_ids[index]?.reason || ""}
                        onChange={(e) => handleEntryChange(index, e)}
                        fullWidth
                        required
                      />
                    </Grid>

                    {index < selectedEntries.entries.length - 1 && (
                      <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                      </Grid>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <Grid item xs={12}>
                  <Typography>No entries available.</Typography>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button
          onClick={() => handleSubmit(request)}
          variant="contained"
          color="primary"
        >
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RequestModal;
