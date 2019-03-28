import React, { Component } from "react";
import { Icon, Input, Button } from "semantic-ui-react";
// import ProfileButton from './ProfileButton'

export default class NewTripForm extends Component {
  // state = { activeItem: 'home' }
  //
  // handleItemClick = (e, { name }) => this.setState({ activeItem: name })

  render() {
    return (
    	<>

          <Input
            type="text"
            placeholder="Create a trip!"
            value={this.props.destination}
          >
            <input onChange={this.props.changeHandler} />
            <Button
              onClick={this.props.createTrip}
              icon
              color="green"
              labelPosition="right"
            >
              <Icon name="plus" />
              Create
            </Button>
          </Input>

	    </>
    );
  }
}
