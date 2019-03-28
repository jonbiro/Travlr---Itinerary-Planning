import React, { Component } from "react";
import { ROOT_URL } from "../Config";
import axios from "axios";
import { withRouter } from "react-router-dom";
import "./map.css";
import CityItinerary from "./CityItinerary";

class CityShow extends Component {
  state = {
    city: {
      name: null
    },
    venues: [],
    searchTerm: "attraction",
    success: "",
    places: [],
	  showButton: false
  };

  componentDidMount() {
    this.fetchCity();
  }

  fetchCity = () => {
    // let poo = window.location.pathname.split("/");
    // let poop = parseInt(poo.slice(poo.length - 1));
    let id = parseInt(this.props.match.params.id);
    if (this.state.city.name === null) {
      fetch(`/api/v1/cities/${id}`, {
        method: "GET",
        headers: {
          // Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`
        }
      })
        .then(res => res.json())
        .then(json => {
          this.setState({
            city: json,
            places: json.places
          });
        })
        .then(this.getVenues);
    }
  };

  renderMap = () => {
    loadScript(
      "https://maps.googleapis.com/maps/api/js?key=AIzaSyD1DrDBUd6GNL2EIBCxK-K0OjkTny8kbuA&&libraries=places&callback=initMap"
    );
    window.initMap = this.initMap;
  };

  getVenues = query => {
    const endPoint = "https://api.foursquare.com/v2/venues/explore?";
    const parameters = {
      client_id: "PMHC2WA1VCBHVYOPPSJ0QSBYTLRF4PNJ04OWVWV0PZJ0QFIR",
      client_secret: "CULSZZ44YAEBOWBFGPB4BF5ISRXXSNYR0EE3JV3CNE2ZWHV0",
      section: "sights",
      near: this.state.city.name,
      v: "20192503"
    };
    axios
      .get(endPoint + new URLSearchParams(parameters))
      .then(response => {
        // console.log("response" + response);
        // if (response.includes('warning')){console.log ('hey!!!')}
        // debugger
        this.setState(
          {
            venues: response.data.response.groups[0].items,
            searchTerm: query
          },
          this.renderMap()
        );
      })
      .catch(error => {
        console.log("ERROR!! " + error);
      });
  };

  getVenuesSearch = query => {
	  let po =this.state.venues
    const endPoint = "https://api.foursquare.com/v2/venues/explore?";
    const parameters = {
      client_id: "PMHC2WA1VCBHVYOPPSJ0QSBYTLRF4PNJ04OWVWV0PZJ0QFIR",
      client_secret: "CULSZZ44YAEBOWBFGPB4BF5ISRXXSNYR0EE3JV3CNE2ZWHV0",
      query: query || "food",
      near: this.state.city.name,
      v: "20192503"
    };
    axios.get(endPoint + new URLSearchParams(parameters)).then(response => {
      // console.log("response" + response);
      if (response.data.response.groups[0].items.length > 0) {
        this.setState(
          {
            venues: response.data.response.groups[0].items,
            searchTerm: query
          },
          this.renderMap()
        );
      }else {this.setState({venues: po})}
    });
  };

  saveFunc = (lat, lng, name) => {
    //problem is that i dont have access to props so I can't set the relationship required trip_id to this.props.trip.id
    // also can't do this.props.history.push("/trips");
    // console.log(this);
    // let poo = window.location.pathname.split("/");
    // let poop = parseInt(poo.slice(poo.length - 1));
    let data = {
      trip_id: this.state.city.trip_id,
      lat: lat,
      lng: lng,
      name: name,
      city_id: this.state.city.id
    };
    fetch("/api/v1/places", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
      },
      body: JSON.stringify(data)
    })
      .then(res => res.json())
      .then(
        json =>
          // console.log("poo" + json) ||
          this.setState({ places: [...this.state.places, json] })
      );
  };

  initMap = () => {
    const centerPoint = this.state.venues[0].venue.location || {
      lat: 40.7128,
      lng: -74.006
    };
    // Create A Map
    window.map = new window.google.maps.Map(document.getElementById("map"), {
      center: centerPoint,
      zoom: 12
    });
    // Create An InfoWindow
    let infowindow = new window.google.maps.InfoWindow();

    window.google.maps.event.addListener(infowindow, "domready", () => {
      document.getElementById("saveBtn").addEventListener("click", e => {
        this.saveFunc(
          e.target.dataset.lat,
          e.target.dataset.lng,
          e.target.dataset.name
        );
      });
    });
    // Display Dynamic Markers // I should use forEach instead of map
    this.state.venues.forEach(myVenue => {
      let contentString = `${myVenue.venue.name} <br> ${
        myVenue.venue.categories[0].name
      } <br>`;

      // Create A Marker
      //   console.log(myVenue.venue.location.lat)
      let marker = new window.google.maps.Marker({
        position: {
          lat: myVenue.venue.location.lat,
          lng: myVenue.venue.location.lng
        },
        map: window.map,
        title: myVenue.venue.name
      });

      // Click on A Marker!
      marker.addListener("click", function() {
        // Change the content
        infowindow.setContent(
          `<div id='myInfoWinDiv'>
            ${contentString}
            <button
            	data-lat="${myVenue.venue.location.lat}"
            	data-lng="${myVenue.venue.location.lng}"
            	data-name="${myVenue.venue.name}"
            	id="saveBtn">Save</button>
            </div>`
        );
        // Open An InfoWindow
        infowindow.open(window.map, marker);
      });
    });
  };

  searchInputFS = e => {
    e.preventDefault();
    this.getVenuesSearch(e.target.name.value);
  };

	deletePlace = place => {
		let deletedObjFilter =this.state.places.filter(placeObj => place.id !== placeObj.id);
		fetch(`/api/v1/places/${place.id}`, {
			method: "delete",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${localStorage.getItem("accessToken")}`
			}}).then(() =>this.setState({
			places: deletedObjFilter, showButton: !this.state.showButton
		}))
	};
deleteButton = () => {
	this.setState({showButton: !this.state.showButton})
}
  render() {
    return (
      <div>
        <h1 className='bigh1'>{this.state.city.name}</h1>

        <form onSubmit={this.searchInputFS}>
          <label >
            Search for something to do/eat in {this.state.city.name}:{"   "}
            <input type="text" name="name" />
          </label>
          {"   "}
          <input type="submit" value="Submit" className="navitem poo" />
        </form>
        <br />
        <div id="cityshow">
          <div id="map" className="fade" />
          <div id="itinerary">
            <CityItinerary places={this.state.places} deletePlace={this.deletePlace} showDelete={this.state.showButton} deleteButton={this.deleteButton}/>
          </div>
        </div>
      </div>
    );
  }
}

function loadScript(url) {
  let index = window.document.getElementsByTagName("script")[0];
  let script = window.document.createElement("script");
  script.src = url;
  script.async = true;
  script.defer = true;
  index.parentNode.insertBefore(script, index);
}

export default withRouter(CityShow);
