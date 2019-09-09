import React, {Component} from "react";
import "../App.css";
import {withRouter} from "react-router-dom";
import {Button, Icon, Input} from "semantic-ui-react";
import CityCard from "./CityCard";

class TripCardMainCityContainer extends Component {
  state = {
    city_name: "",
    cities: [],
    city_id: null
  };

  componentDidMount() {
    this.fetchCities();
  }

  fetchCities = () => {
    fetch(`/api/v1/cities/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
      }
    })
      .then(res => res.json())
      .then(json => {
        let cities =
          !!json && json.filter(city => city.trip_id === this.props.trip.id);
        this.setState({
          cities
        });
      });
  };

  createCity = () => {
    let data = {
      name: this.state.city_name,
      trip_id: this.props.trip.id
    };
    fetch("/api/v1/cities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
      },
      body: JSON.stringify(data)
    })
      .then(res => res.json())
      .then(() => {
        this.fetchCities();
        this.setState({
          city_name: ""
        });
      });
  };

  changeHandler = e => {
    this.setState({
      city_name: e.target.value
    });
  };
  onSelect = city => {
    localStorage.setItem("city_name", city.id);
  };
  deleteHandler = city => {
    fetch(`/api/v1/cities/${city.id}`, {
      method: "delete",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
      }
    }).then(this.fetchCities);
  };
  showCities = () => {
    return this.state.cities.map(city => {
      return (
        <CityCard
          key={city.id}
          city={city}
          onSelect={this.onSelect}
          deleteHandler={this.deleteHandler}
        />
      );
    });
  };

  render() {
    return (
      <div>
        <>
          <div className="App">
            <br />
            <>
              <h1 className="bigh1">{this.props.trip.destination}</h1>

              <Input
                type="text"
                placeholder="Add City Name"
                value={this.state.city_name}
              >
                <input onChange={this.changeHandler} />
                <Button
                  onClick={this.createCity}
                  icon
                  color="green"
                  labelPosition="right"
                >
                  <Icon name="plus" />
                  Add City for Trip to {this.props.trip.destination}
                </Button>
              </Input>
              <div className="ui centered cards">{this.showCities()}</div>
            </>
          </div>
        </>
      </div>
    );
  }
}

export default withRouter(TripCardMainCityContainer);
