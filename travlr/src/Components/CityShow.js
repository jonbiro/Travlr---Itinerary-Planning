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

    // Display Dynamic Markers
    this.state.venues.forEach(myVenue => {
      const venueLocation = myVenue.venue.location;
      if (
        !venueLocation ||
        !Number.isFinite(venueLocation.lat) ||
        !Number.isFinite(venueLocation.lng)
      ) {
        return;
      }

      // Create A Marker
      let marker = new window.google.maps.Marker({
        position: {
          lat: venueLocation.lat,
          lng: venueLocation.lng
        },
        map: window.map,
        title: myVenue.venue.name
      });

      // Click on A Marker!
      marker.addListener("click", () => {
        const content = document.createElement("div");
        content.id = "myInfoWinDiv";

        const venueName = document.createElement("strong");
        venueName.textContent = myVenue.venue.name;
        content.appendChild(venueName);
        content.appendChild(document.createElement("br"));

        const category = document.createElement("span");
        category.textContent =
          (myVenue.venue.categories &&
            myVenue.venue.categories[0] &&
            myVenue.venue.categories[0].name) ||
          "Place";
        content.appendChild(category);
        content.appendChild(document.createElement("br"));

        const saveButton = document.createElement("button");
        saveButton.type = "button";
        saveButton.textContent = "Save";
        saveButton.dataset.lat = venueLocation.lat;
        saveButton.dataset.lng = venueLocation.lng;
        saveButton.dataset.name = myVenue.venue.name;
        saveButton.addEventListener("click", event => {
          const { lat, lng, name } = event.currentTarget.dataset;
          this.saveFunc(lat, lng, name);
        });
        content.appendChild(saveButton);

        infowindow.setContent(content);
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
