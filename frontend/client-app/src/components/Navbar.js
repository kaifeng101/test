import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { selectUser, logout } from "../redux/userSlice";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import MailIcon from "@mui/icons-material/Mail";
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Fade from '@mui/material/Fade';
import Button from '@mui/material/Button';

const NavBar = ({ notificationsLength, getNotifications }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  let userRole = "";
  let userPosition = "";
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [anchorEl1, setAnchorEl1] = React.useState(null);
  const open = Boolean(anchorEl);
  const open1 = Boolean(anchorEl1);
  const location = useLocation(); // Track route changes

  const handleOpenClick = (events) => {
    setAnchorEl1(events.currentTarget);
  };
  const handleCloseClick = () => {
    setAnchorEl1(null);
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  if (user !== null) {
    userRole = user.role;
    userPosition = user.position;
  }

  const navigate = useNavigate();

  const handleLogout = (e) => {
    e.preventDefault();
    dispatch(logout());
    navigate("/login");
  };

  useEffect(() => {
    if (user) {
      getNotifications(); // Only call once
    }
  }, [user, location, getNotifications]); // Combine user and location as dependencies

  return (
    <nav className="bg-black text-white fixed z-50 top-0 w-full">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="text-2xl font-semibold italic">
          <Link to="/">Scrum Daddy</Link>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden text-white focus:outline-none"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"}
            />
          </svg>
        </button>

        <div
          className={`lg:flex lg:items-center lg:space-x-6 text-base ${
            isOpen ? "block" : "hidden"
          }`}
        >
          {user && (
            <>
              {" "}
              <Link to="/" className="block py-2 px-4 lg:inline-block">
                Home
              </Link>
              <Link
                to="/teamSchedule"
                className="block py-2 px-4 lg:inline-block"
              >
                View Team Schedule
              </Link>
            </>
          )}

          {userRole === 1 &&
            userPosition !== "HR Team" &&
            userPosition !== "MD" && (
              <Link
                to="/requestsPage"
                className="block py-2 px-4 lg:inline-block"
              >
                My Requests
              </Link>
            )}

          {userRole === 1 && userPosition === "MD" && (
            <>
            <Button
              id="fade-button"
              aria-controls={open1 ? 'fade-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open1 ? 'true' : undefined}
              onClick={handleOpenClick}
            >
              <span className="text-white normal-case">
                Requests
              </span>
            </Button>
            <Menu
              id="fade-menu"
              MenuListProps={{
                'aria-labelledby': 'fade-button',
              }}
              anchorEl={anchorEl1}
              open={open1}
              onClose={handleCloseClick}
              TransitionComponent={Fade}
            >
              <MenuItem onClick={handleCloseClick}>
                <Link
                  to="/jackRequestsPage"
                  className="block py-2 px-4 lg:inline-block">
                    My Employees Request
                </Link>
              </MenuItem>
              <MenuItem onClick={handleCloseClick}>
                <Link
                    to="/jackPersonalRequestsPage"
                    className="block py-2 px-4 lg:inline-block"
                  >
                    My Requests
                </Link>
              </MenuItem>
            </Menu>
          </>
          )}

          {userRole === 1 && userPosition === "HR Team" && (
            <>
            <Button
              id="fade-button"
              aria-controls={open1 ? 'fade-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open1 ? 'true' : undefined}
              onClick={handleOpenClick}
            >
              <span className="text-white normal-case">
                Requests
              </span>
            </Button>
            <Menu
              id="fade-menu"
              MenuListProps={{
                'aria-labelledby': 'fade-button',
              }}
              anchorEl={anchorEl1}
              open={open1}
              onClose={handleCloseClick}
              TransitionComponent={Fade}
            >
              <MenuItem onClick={handleCloseClick}>
                <Link
                  to="/employeeRequests"
                  className="block py-2 px-4 lg:inline-block">
                    All Employees Request
                </Link>
              </MenuItem>
              <MenuItem onClick={handleCloseClick}>
                <Link
                    to="/hrRequestsPage"
                    className="block py-2 px-4 lg:inline-block"
                  >
                    My Requests
                </Link>
              </MenuItem>
            </Menu>
          </>
          )}

          {userRole === 2 && (
            <Link
              to="/staffRequestsPage"
              className="block py-2 px-4 lg:inline-block"
            >
              Requests
            </Link>
          )}

          {userRole === 3 && (
            <>
            <Button
              id="fade-button"
              aria-controls={open1 ? 'fade-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open1 ? 'true' : undefined}
              onClick={handleOpenClick}
            >
              <span className="text-white normal-case">
                Requests
              </span>
            </Button>
            <Menu
              id="fade-menu"
              MenuListProps={{
                'aria-labelledby': 'fade-button',
              }}
              anchorEl={anchorEl1}
              open={open1}
              onClose={handleCloseClick}
              TransitionComponent={Fade}
            >
              <MenuItem onClick={handleCloseClick}>
                <Link
                  to="/managerRequestsPage"
                  className="block py-2 px-4 lg:inline-block">
                    All Employees Request
                </Link>
              </MenuItem>
              <MenuItem onClick={handleCloseClick}>
                <Link
                    to="/myManagerRequestsPage"
                    className="block py-2 px-4 lg:inline-block"
                  >
                    My Requests
                </Link>
              </MenuItem>
            </Menu>
          </>
          )}

          {user && (
            <>
              <Link
                to="/PersonalSchedule"
                className="block py-2 px-4 lg:inline-block"
              >
                My Schedule
              </Link>
              <Link
                to="/notifications"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <IconButton aria-label={notificationsLength}>
                  <Badge badgeContent={notificationsLength} color="secondary">
                    <MailIcon
                      className="text-white"
                      id="basic-button"
                      aria-controls={open ? "basic-menu" : undefined}
                      aria-haspopup="true"
                      aria-expanded={open ? "true" : undefined}
                      onClick={handleClick}
                    />
                  </Badge>
                </IconButton>
              </Link>
              <Link
                to="/auditTrail"
                className="block py-2 px-4 lg:inline-block"
              >
                Audit Trail
              </Link>
            </>
          )}

          {user ? (
            <Link
              to="/logout"
              className="block py-2 px-4 lg:inline-block"
              onClick={(e) => handleLogout(e)}
            >
              Logout
            </Link>
          ) : (
            <Link to="/login" className="block py-2 px-4 lg:inline-block">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
