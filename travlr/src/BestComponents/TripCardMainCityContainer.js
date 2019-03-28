import React, { Component } from "react";
import "../App.css";
import { ROOT_URL } from "../Config";
import { withRouter} from "react-router-dom";
import { Icon, Input, Button } from "semantic-ui-react";
import CityCard from "./CityCard";
// import Login from "./Login";
// import CityShow from "./CityShow";

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
        // Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
      }
    })
      .then(res => res.json())
      .then(json => {
        	let cities = !!json && json.filter(city =>city.trip_id === this.props.trip.id)
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

  // addTrip = trip => {
  //   if (this.state.trips) {
  //     this.setState({ trips: [trip, ...this.state.trips] });
  //   }
  // };
  // editTrip = newTrip => {
  //   let tripsArray = this.state.trips.map(t => {
  //     if (t.id === newTrip.id) {
  //       return newTrip;
  //     }
  //     return t;
  //   });
  //   this.setState({ trips: tripsArray });
  // };
  //
  // deleteTrip = id => {
  //   let trips = this.state.trips.filter(t => t.id !== id);
  //   this.setState({ trips: trips });
  // };

  // findTrip = id => {
  //   return this.state.trips.filter(t => t.id === id);
  // };

  // changeTripId = id => {
  //   this.setState({ trip_id: id });
  // };

  changeHandler = e => {
    // console.log(e.target.value);
    this.setState({
      city_name: e.target.value
    });
  };
	onSelect = city => {
		// console.log("setnewtrip", trip);
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
		// let showEvent= this.state.trips.map(atrip => {
		//   return <Trip key={atrip.id} trip={atrip} onSelect={this.onSelect} deleteHandler={this.deleteHandler}/>;
		// });
		// return showEvent
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

	// checkAuthCityCard = routerProps => {
	// 	debugger
	// 	let paramId = routerProps.match.params.id;
	// 	let city = this.state.cities.find(
	// 		cityObj => cityObj.id === parseInt(paramId)
	// 	);
	// 	console.log("this " + city.id);
	//
	// 	if (localStorage.getItem("accessToken")) {
	// 		return <CityShow city={city} />;
	// 	} else {
	// 		return <Login />;
	// 	}
	// };

  render() {
    return (
    	<div>
	    {/*<Switch>*/}
		    {/*<Route*/}
			    {/*path={"/cities/:id"}*/}
			    {/*render={routerProps => (*/}
				    {/*<>*/}
					    {/*{this.state.cities.length > 0*/}
						    {/*? this.checkAuthCityCard(routerProps)*/}
						    {/*: "Loading"}*/}
				    {/*</>*/}
			    {/*)}*/}
		    {/*/></Switch>*/}
        <>
          <div className="App">
            <br />
            <>
              <h1 className='bigh1'>{this.props.trip.destination}</h1>

              <Input
                type="text"
                placeholder= "Add City Name"
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
	            <div className='ui centered cards' >{this.showCities()}</div>
            </>
          </div>

      </>
	    </div>
    );
  }
}

export default withRouter(TripCardMainCityContainer);
