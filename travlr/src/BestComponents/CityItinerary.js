import React, { Component } from "react";
import { ROOT_URL } from "../Config";

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
        // Accept: "application/json",
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
  showButton = (place) => {
  	this.props.deleteButton()
    this.setState({  placeToDelete: place });
  };
  deleteButton = () => {
    return (
      <>
        <br />
        <button onClick={() => this.props.deletePlace(this.state.placeToDelete)} className="navitem">
          Delete
        </button>
      </>
    );
  };

	//     }}).then(console.log).then(() =>this.setState({
	//     showDelete: !this.state.showDelete, placeToDelete: {}, places: deletedObjFilter
  //   }))
  // };

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
    // console.log(this.state)
    return (
      <div>
        <h1 className='mediumh1'>Itinerary:</h1>

        {/*{console.log(this.state.places)}*/}
        {this.props.places.length === 0 ? null : this.placesMapped()}
        {this.props.showDelete ? this.deleteButton() : null}
      </div>
    );
  }
}

export default CityItinerary;
