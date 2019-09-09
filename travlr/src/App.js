import React, {Component} from "react";
import {Route, Switch, withRouter} from "react-router-dom";
import "./App.css";
import logo from "./Content/travlr02.jpg";
import Login from "./Components/Login";
import Signup from "./Components/Signup";
import Navbar from "./Components/Navbar";
import TripContainer from "./Components/TripContainer";
import CityShow from "./Components/CityShow";

class App extends Component {
  clickHandler = () => {
    localStorage.clear();
    this.props.history.push("/login");
  };

  checkAuth = () => {
    if (localStorage.getItem("accessToken")) {
      return <TripContainer />;
    } else {
      return <Login />;
    }
  };
  checkAuthSignUp = () => {
    if (localStorage.getItem("accessToken")) {
      return <TripContainer />;
    } else {
      return <Signup />;
    }
  };
  checkAuthTrips = () => {
    if (localStorage.getItem("accessToken")) {
      return <TripContainer />;
    } else {
      return <Login />;
    }
  };
  checkAuthTripsID = () => {
    if (localStorage.getItem("accessToken")) {
      return <CityShow />;
    } else {
      return <Login />;
    }
  };

  render() {
    return (
      <>
        <Navbar clickHandler={this.clickHandler} />
        <div className="App">
          <br />
          <img
            className="animated zoomInLeft fade delay-2s"
            src={logo}
            alt="logo"
          />
          <br />
          <br />
          <Switch>
            <Route exact path="/signup" render={() => this.checkAuthSignUp()} />
            <Route path="/cities/:id" render={() => this.checkAuthTripsID()} />
            <Route path="/trips" render={() => this.checkAuthTrips()} />
            <Route path="/" render={() => this.checkAuth()} />
          </Switch>
        </div>
      </>
    );
  }
}

export default withRouter(App);
