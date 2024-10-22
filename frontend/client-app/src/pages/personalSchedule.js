import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import moment from "moment";
import "moment-timezone";
import axios from "axios";
import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "../redux/userSlice";
import HomeSharpIcon from "@mui/icons-material/HomeSharp";
import ApartmentSharpIcon from "@mui/icons-material/ApartmentSharp";
import LogoutSharpIcon from "@mui/icons-material/LogoutSharp";
import Popover from "@mui/material/Popover";
import Button from "@mui/material/Button";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import Typography from "@mui/material/Typography";
import { ButtonGroup } from "@mui/material";
import Avatar from "@mui/material/Avatar";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import "../index.css"; // Import your new CSS here
import WFHModal from "../components/WFHModal";

const CustomToolbar = (toolbar) => {
  const goToMonthView = () => {
    toolbar.onView("month");
  };

  const goToWeekView = () => {
    toolbar.onView("week");
  };

  const goToDayView = () => {
    toolbar.onView("day");
  };

  return (
    <div className="rbc-toolbar bg-zinc-100">
      <ButtonGroup variant="outlined" aria-label="Basic button group">
        <Button onClick={() => toolbar.onNavigate("PREV")}>
          <ArrowBackIcon />
        </Button>
        <Button onClick={() => toolbar.onNavigate("TODAY")}>Today</Button>
        <Button onClick={() => toolbar.onNavigate("NEXT")}>
          <ArrowForwardIcon />
        </Button>
      </ButtonGroup>
      <span className="rbc-toolbar-label">{toolbar.label}</span>
      <ButtonGroup>
        <Button
          onClick={goToMonthView}
          className={toolbar.view === "month" ? "rbc-active" : ""}
        >
          Month
        </Button>
        <Button
          onClick={goToWeekView}
          className={toolbar.view === "week" ? "rbc-active" : ""}
        >
          Week
        </Button>
        <Button
          onClick={goToDayView}
          className={toolbar.view === "day" ? "rbc-active" : ""}
        >
          Day
        </Button>
      </ButtonGroup>
    </div>
  );
};

const PersonalCalendar = () => {
  const user = useSelector(selectUser);
  const staffId = user.staff_id;
  const firstName = user.staff_fname;
  const lastName = user.staff_lname;
  const position = user.position;
  const department = user.dept;

  const localizer = momentLocalizer(moment);

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const handlePopoverClose = () => {
    setAnchorEl(null);
    setSelectedEvent(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "event-popover" : undefined;

  const [WFHModalOpen, setWFHModalOpen] = useState(false);
  const [userWFHInfo, setUserWFHInfo] = useState({
    totalWFHDays: 0, // Initially 0, will be updated by fetched data
    todayArrangement: "", // "WFH" or "Office"
    tomorrowArrangement: "", // "WFH" or "Office"
  });
  const [wfhrequests, setWFHRequests] = useState([]); // Initialize with an empty array

  const openWFHModal = () => setWFHModalOpen(true);
  const closeWFHModal = () => setWFHModalOpen(false);

  const fetchWFHRequests = async () => {
    try {
      const response = await axios.get(
        `https://scrumdaddybackend.studio/wfhRequests/requester/${staffId}`
      );
      const wfhrequests = response.data.data;
      setWFHRequests(wfhrequests);

      const today = moment();
      const startOfWeek = today.clone().startOf("week");
      const endOfWeek = today.clone().endOf("week");

      const entries = wfhrequests.flatMap((request) => request.entries);

      const totalWFHDays = entries
        .filter((entry) => entry.status === "Approved")
        .filter((entry) => {
          const entryDate = moment(entry.entry_date);
          return entryDate.isBetween(startOfWeek, endOfWeek, null, "[]");
        }).length;

      const todayEntry = entries.find((entry) =>
        moment(entry.entry_date).isSame(today, "day")
      );
      const tomorrowEntry = entries.find((entry) =>
        moment(entry.entry_date).isSame(today.clone().add(1, "day"), "day")
      );

      const isWeekend = today.day() === 0 || today.day() === 6;

      let todayArrangement;
      let tomorrowArrangement;

      if (isWeekend) {
        todayArrangement = "Weekends";
        tomorrowArrangement = "Weekends";
      } else {
        todayArrangement = todayEntry ? todayEntry.status : "Office";
        tomorrowArrangement = tomorrowEntry ? tomorrowEntry.status : "Office";
      }

      setUserWFHInfo({
        totalWFHDays,
        todayArrangement:
          todayArrangement === "Approved" ? "WFH" : todayArrangement,
        tomorrowArrangement:
          tomorrowArrangement === "Approved" ? "WFH" : tomorrowArrangement,
      });
    } catch (error) {
      console.log("Error fetching WFH requests and user WFH info:", error);
    }
  };

  useEffect(() => {
    fetchWFHRequests();
  }); // Only fetch once on component mount

  const events = useMemo(() => {
    const allEvents =
      wfhrequests.length > 0
        ? wfhrequests.flatMap((request) =>
            request.entries
              .filter((entry) => entry.status === "Approved")
              .map((entry) => {
                let start, end;

                if (entry.duration === "Full Day") {
                  start = moment
                    .tz(entry.entry_date, "Asia/Singapore")
                    .set({ hour: 8, minute: 0 })
                    .toDate();
                  end = moment
                    .tz(entry.entry_date, "Asia/Singapore")
                    .set({ hour: 17, minute: 0 })
                    .toDate();
                } else if (entry.duration === "AM") {
                  start = moment
                    .tz(entry.entry_date, "Asia/Singapore")
                    .set({ hour: 8, minute: 0 })
                    .toDate();
                  end = moment
                    .tz(entry.entry_date, "Asia/Singapore")
                    .set({ hour: 12, minute: 0 })
                    .toDate();
                } else if (entry.duration === "PM") {
                  start = moment
                    .tz(entry.entry_date, "Asia/Singapore")
                    .set({ hour: 13, minute: 0 })
                    .toDate();
                  end = moment
                    .tz(entry.entry_date, "Asia/Singapore")
                    .set({ hour: 17, minute: 0 })
                    .toDate();
                }

                return {
                  request_id: entry.request_id,
                  start,
                  end,
                  description: entry.reason || "No reason provided",
                };
              })
          )
        : [];

    const uniqueEvents = [];
    const seenKeys = new Set();

    allEvents.forEach((event) => {
      const key = `${event.start}-${event.end}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueEvents.push(event);
      }
    });

    return uniqueEvents;
  }, [wfhrequests]);

  const EventComponent = ({ event }) => {
    const startTime = moment(event.start).format("h:mm A");
    const endTime = moment(event.end).format("h:mm A");

    return (
      <span style={{ fontSize: "15px" }}>
        {startTime} - {endTime}
      </span>
    );
  };

  const eventPropGetter = (event) => {
    const startHour = moment(event.start).hour();
    const endHour = moment(event.end).hour();

    let backgroundColor = "grey";

    if (startHour >= 8 && endHour <= 12) {
      backgroundColor = "blue"; // 8AM to 12PM
    } else if (startHour >= 13 && endHour <= 17) {
      backgroundColor = "green"; // 1PM to 5PM
    } else if (startHour === 8 && endHour === 17) {
      backgroundColor = "orange"; // 8AM to 5PM
    }

    return {
      style: {
        backgroundColor,
      },
    };
  };

  const dayPropGetter = (date) => {
    const day = moment(date).day();
    if (day === 0 || day === 6) {
      // 0 is Sunday, 6 is Saturday
      return {
        className: "rbc-off-range",
        style: { backgroundColor: "#f0f0f0" }, // Optional: give a light gray background
      };
    }
    return {};
  };

  return (
    <div className="flex justify-end pt-16">
      <div
        className="w-1/5 p-4 overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 100px)" }}
      >
        <div className="bg-slate-100 shadow-md rounded-lg p-4 mb-4 flex items-center">
          <Avatar
            alt="User Avatar"
            src="" // Add the image source here if available
            sx={{ width: 40, height: 40, marginRight: 2 }}
          />
          <div>
            <Typography>
              Name: {firstName} {lastName}
            </Typography>
            <Typography>Department: {department}</Typography>
            <Typography>Position: {position}</Typography>
          </div>
        </div>

        <div className="bg-sky-100 shadow-md rounded-lg p-4 mb-4">
          <HomeSharpIcon /> Work From Home
          <p className="text-l text-blue-500">
            <span className="font-bold underline">
              {userWFHInfo.totalWFHDays}{" "}
            </span>
            days taken this week
          </p>
          <ApartmentSharpIcon /> Work In Office
          <p className="text-l text-blue-500">
            <span className="font-bold underline">
              {userWFHInfo.totalWFHDays}{" "}
            </span>
            days in office this week
          </p>
          <LogoutSharpIcon /> On Leave
          <p className="text-l text-blue-500">
            <span className="font-bold underline">
              {userWFHInfo.totalWFHDays}{" "}
            </span>
            days on leave this week
          </p>
        </div>

        <div className="bg-cyan-100 shadow-md rounded-lg p-4 mb-4">
          <CalendarMonthIcon />
          <span className="text-l font-bold"> Today</span>
          <p className="text-l">Status: {userWFHInfo.todayArrangement}</p>

          <CalendarMonthIcon />
          <span className="text-l font-bold"> Tomorrow</span>
          <p className="text-l">Status: {userWFHInfo.tomorrowArrangement}</p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-4 mb-4">
          <Button onClick={openWFHModal}>Apply For WFH</Button>
          {/* </div> */}

          {openWFHModal && (
            <WFHModal open={WFHModalOpen} onClose={closeWFHModal} />
          )}
        </div>
      </div>
      <div className="calendar w-4/5 p-4" style={{ padding: "10px" }}>
        <Calendar
          localizer={localizer}
          startAccessor={"start"}
          endAccessor={"end"}
          events={events}
          style={{ height: "calc(100vh - 100px)" }}
          eventPropGetter={eventPropGetter}
          dayPropGetter={dayPropGetter}
          onSelectEvent={(event, e) => {
            setAnchorEl(e.currentTarget);
            setSelectedEvent(event);
          }}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          components={{
            event: EventComponent,
            toolbar: CustomToolbar,
          }}
        />
        <Popover
          id={id}
          open={open}
          anchorEl={anchorEl}
          onClose={handlePopoverClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "center",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "center",
          }}
          PaperProps={{
            width: "25%",
            margin: "0 auto",
            padding: "5px",
          }}
        >
          <div style={{ padding: "10px" }}>
            {selectedEvent && (
              <Typography>
                <span className="text-base">
                  Reason: {selectedEvent.description}
                </span>
              </Typography>
            )}
          </div>
        </Popover>
      </div>
    </div>
  );
};

export default PersonalCalendar;
