import React, {Component} from "react";
import Trip from "./TripCard";
import NewTripForm from "./NewTripForm";
import {Route, Switch, withRouter} from "react-router-dom";
import Login from "./Login";
import TripCardMainCityContainer from "./TripCardMainCityContainer";


class TripContainer extends Component {
  state = {
    destination: "",
    trips: []
  };

  componentDidMount() {
    this.fetchTrips();
  }

  fetchTrips = () => {
    return fetch("/api/v1/trips", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
      }
    })
      .then(res => res.json())
      .then(trips => {
        let results = trips.data;
        this.setState({
          trips: results
        });
      });
  };

  createTrip = () => {
    let data = {
      destination: this.state.destination
    };
    fetch("/api/v1/trips", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
      },
      body: JSON.stringify(data)
    })
      .then(res => res.json())
      .then(trips => {
        this.fetchTrips();
        this.setState({
          destination: ""
        });
      });
  };

  changeHandler = e => {
    this.setState({
      destination: e.target.value
    });
  };

  onSelect = trip => {
    localStorage.setItem("destination", trip.id);
  };

  deleteHandler = trip => {
    fetch(`/api/v1/trips/${trip.id}`, {
      method: "delete",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
      }
    }).then(this.fetchTrips);
  };

  showTrips = () => {
    return this.state.trips.map(aTrip => {
      return (
        <Trip
          key={aTrip.id}
          trip={aTrip}
          onSelect={this.onSelect}
          deleteHandler={this.deleteHandler}
        />
      );
    });
  };

  checkAuthTripCard = routerProps => {
    let paramId = routerProps.match.params.id;
    let trip = this.state.trips.find(
      tripObj => tripObj.id === parseInt(paramId)
    );
    if (localStorage.getItem("accessToken")) {
      return <TripCardMainCityContainer trip={trip} />;
    } else {
      return <Login />;
    }
  };

  render() {
    return (
      <div>
        <Switch>
          <Route
            path={"/trips/:id"}
            render={routerProps => (
              <>
                {this.state.trips.length > 0
                  ? this.checkAuthTripCard(routerProps)
                  : "Loading"}
              </>
            )}
          />
          <Route
            path={"/"}
            render={() => {
              return (
                <>
                  <NewTripForm
                    changeHandler={this.changeHandler}
                    destination={this.state.destination}
                    createTrip={this.createTrip}
                  />
                  <div className="ui centered cards">{this.showTrips()}</div>
                </>
              );
            }}
          />
        </Switch>
      </div>
    );
  }
}

export default withRouter(TripContainer);
