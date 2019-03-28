import React, { Component } from "react";
import { Route, Switch } from "react-router-dom";
import { withRouter } from "react-router-dom";
import "./App.css";
import logo from "./travlr logos/travlr02.jpg";
import Login from "./BestComponents/Login";
import Signup from "./BestComponents/Signup";
import Navbar from "./BestComponents/Navbar";
import TripContainer from "./BestComponents/TripContainer";
// import TripCardMainCityContainer from "./BestComponents/TripCardMainCityContainer";
import CityShow from "./BestComponents/CityShow";

// import WeatherApp from "./testing/WeatherApp";
// import "./animate.css";
// import LoadScript from "@react-google-maps/api/lib/LoadScript";
// import GoogleMap from "@react-google-maps/api/lib/GoogleMap";
// import FoursquareDemo from "./Components/fs";
// import Map from "./Components/Map";
// import CurrentLocation from "./Components/CurrentLocation";
// import Chat from "./Components/Chat";
// import Placesbeen from "./Components/placesbeen";
// import axios from "axios";
// import Activity from "./testing/activity";
// import HomePage from "./components/HomePage";
// import TripInfo from "./components/TripInfo";
// import AccInfo from "./AccInfo";
// import SideBar1 from "./components/SideBar1";
// import { ROOT_URL } from "./Config";
// import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

class App extends Component {
  clickHandler = () => {
    // console.log("logged out");
    localStorage.clear();
    // removeItem("accessToken");
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
              <Route
                exact
                path="/signup"
                render={() => this.checkAuthSignUp()}
              />
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
