import React from "react";
import { Link, withRouter } from "react-router-dom";
import "../App.css";
// import { slide as Menu } from 'react-burger-menu'

const Navbar = props => {
  // var styles = {
  //   bmBurgerButton: {
  //     position: "fixed",
  //     width: "36px",
  //     height: "30px",
  //     left: "36px",
  //     top: "36px"
  //   },
  //   bmBurgerBars: {
  //     background: "#373a47"
  //   },
  //   bmBurgerBarsHover: {
  //     background: "#a90000"
  //   },
  //   bmCrossButton: {
  //     height: "24px",
  //     width: "24px"
  //   },
  //   bmCross: {
  //     background: "#bdc3c7"
  //   },
  //   bmMenuWrap: {
  //     position: "fixed",
  //     height: "100%"
  //   },
  //   bmMenu: {
  //     background: "#373a47",
  //     padding: "2.5em 1.5em 0",
  //     fontSize: "1.15em"
  //   },
  //   bmMorphShape: {
  //     fill: "#373a47"
  //   },
  //   bmItemList: {
  //     color: "#b8b7ad",
  //     padding: "0.8em"
  //   },
  //   bmItem: {
  //     display: "inline-block"
  //   },
  //   bmOverlay: {
  //     background: "rgba(0, 0, 0, 0.3)"
  //   }
  // };

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
      {/*<Menu styles={ styles } >*/}
      {/*<ul className="navbar">*/}
      {/*<Link to="/">*/}
      {/*<button className="navitem bouncy" >Home</button>*/}
      {/*</Link><br/>*/}
      {/*<Link to="/trips">*/}
      {/*<button className="navitem bouncy" style={{animationDelay:'0.07s'}}>Trips</button>*/}
      {/*</Link><br/>*/}
      {/*<Link to="/login">*/}
      {/*<button className="navitem bouncy" style={{animationDelay:'0.14s'}}>Log In</button>*/}
      {/*</Link><br/>*/}
      {/*<Link to="/signup">*/}
      {/*<button className="navitem bouncy" style={{animationDelay:'0.21s'}}>Sign Up</button>*/}
      {/*</Link><br/>*/}
      {/*<button className="navitem bouncy"  style={{animationDelay:'0.28s'}} onClick={props.clickHandler}>Log Out</button>*/}
      {/*</ul>*/}
      {/*</Menu>*/}
    </>
  );
};

export default withRouter(Navbar);
