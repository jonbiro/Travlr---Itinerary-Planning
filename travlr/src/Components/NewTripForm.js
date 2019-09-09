import React, {Component} from "react";
import {Button, Icon, Input} from "semantic-ui-react";

export default class NewTripForm extends Component {
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
