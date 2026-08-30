import React, {Component} from "react";
import {withRouter} from "react-router-dom";
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
    let id = parseInt(this.props.match.params.id);
    if (this.state.city.name === null) {
      fetch(`/api/v1/cities/${id}`, {
        method: "GET",
        headers: {
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
    const mapsKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!mapsKey || this.state.venues.length === 0) {
      return;
    }

    window.initMap = this.initMap;
    loadScript(
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        mapsKey
      )}&libraries=places&callback=initMap`
    );
  };

  getVenues = query => {
    this.fetchVenues()
      .then(json => {
        this.setState(
          {
            venues: this.venueItems(json),
            searchTerm: query
          },
          this.renderMap
        );
      })
      .catch(error => {
        this.setState({ success: error.message });
      });
  };

  getVenuesSearch = query => {
    let po = this.state.venues;
    this.fetchVenues(query || "food").then(json => {
      const venues = this.venueItems(json);
      if (venues.length > 0) {
        this.setState(
          {
            venues: venues,
            searchTerm: query
          },
          this.renderMap
        );
      } else {
        this.setState({ venues: po });
      }
    }).catch(error => this.setState({ success: error.message }));
  };

  fetchVenues = query => {
    const parameters = new URLSearchParams({ location: this.state.city.name });
    if (query) {
      parameters.set("query", query);
    }

    return fetch(`/api/v1/venues?${parameters.toString()}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
      }
    }).then(response => {
      if (!response.ok) {
        throw new Error("Venue search is unavailable right now.");
      }
      return response.json();
    });
  };

  venueItems = json =>
    (((json || {}).response || {}).groups || []).reduce(
      (items, group) => items.concat(group.items || []),
      []
    );

  saveFunc = (lat, lng, name) => {
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
      .then(json => this.setState({ places: [...this.state.places, json] }));
  };

  initMap = () => {
    if (!window.google || !this.state.venues.length) {
      return;
    }

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
    // Display Dynamic Markers
    this.state.venues.forEach(myVenue => {
      let contentString = `${myVenue.venue.name} <br> ${
        myVenue.venue.categories[0].name
      } <br>`;

      // Create A Marker
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
    let deletedObjFilter = this.state.places.filter(
      placeObj => place.id !== placeObj.id
    );
    fetch(`/api/v1/places/${place.id}`, {
      method: "delete",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
      }
    }).then(() =>
      this.setState({
        places: deletedObjFilter,
        showButton: !this.state.showButton
      })
    );
  };
  deleteButton = () => {
    this.setState({ showButton: !this.state.showButton });
  };

  render() {
    return (
      <div>
        <h1 className="bigh1">{this.state.city.name}</h1>

        <form onSubmit={this.searchInputFS}>
          <label>
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
            <CityItinerary
              places={this.state.places}
              deletePlace={this.deletePlace}
              showDelete={this.state.showButton}
              deleteButton={this.deleteButton}
            />
          </div>
        </div>
      </div>
    );
  }
}

function loadScript(url) {
  if (window.document.querySelector('script[data-travlr-maps="true"]')) {
    if (window.google && window.google.maps && window.initMap) {
      window.initMap();
    }
    return;
  }

  let index = window.document.getElementsByTagName("script")[0];
  let script = window.document.createElement("script");
  script.src = url;
  script.dataset.travlrMaps = "true";
  script.async = true;
  script.defer = true;
  index.parentNode.insertBefore(script, index);
}

export default withRouter(CityShow);
