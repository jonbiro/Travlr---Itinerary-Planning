import React, {Component} from "react";

class CityItinerary extends Component {
  state = {
    places: [],
    showDelete: this.props.showDelete,
    placeToDelete: {}
  };

  componentDidMount() {
    this.fetchPlaces();
  }

  fetchPlaces = () => {
    let getpath = window.location.pathname.split("/");
    let id = parseInt(getpath.slice(getpath.length - 1));
    fetch(`/api/v1/cities/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
      }
    })
      .then(res => res.json())
      .then(res => {
        this.setState({
          places: res.places
        });
      });
  };
  showButton = place => {
    this.props.deleteButton();
    this.setState({ placeToDelete: place });
  };
  deleteButton = () => {
    return (
      <>
        <br />
        <button
          onClick={() => this.props.deletePlace(this.state.placeToDelete)}
          className="navitem"
        >
          Delete
        </button>
      </>
    );
  };

  placesMapped = () => {
    if (this.props.places.length > 0) {
      return this.props.places.map(place => {
        return (
          <li key={place.id} onClick={() => this.showButton(place)}>
            {place.name}
          </li>
        );
      });
    } else {
      this.fetchPlaces();
    }
  };

  render() {
    return (
      <div>
        <h1 className="mediumh1">Itinerary:</h1>
        {this.props.places.length === 0 ? null : this.placesMapped()}
        {this.props.showDelete ? this.deleteButton() : null}
      </div>
    );
  }
}

export default CityItinerary;
