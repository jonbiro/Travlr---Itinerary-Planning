import React from "react";
import {Link, withRouter} from "react-router-dom";
import "../App.css";

const Navbar = props => {
  return (
    <>
      {" "}
      <ul className="navbar">
        <Link to="/">
          <button className="navitem bouncy">Home</button>
        </Link>
        <Link to="/trips">
          <button
            className="navitem bouncy"
            style={{ animationDelay: "0.07s" }}
          >
            Trips
          </button>
        </Link>
        <Link to="/login">
          <button
            className="navitem bouncy"
            style={{ animationDelay: "0.14s" }}
          >
            Log In
          </button>
        </Link>
        <Link to="/signup">
          <button
            className="navitem bouncy"
            style={{ animationDelay: "0.21s" }}
          >
            Sign Up
          </button>
        </Link>
        <button
          className="navitem bouncy"
          style={{ animationDelay: "0.28s" }}
          onClick={props.clickHandler}
        >
          Log Out
        </button>
      </ul>
    </>
  );
};

export default withRouter(Navbar);
