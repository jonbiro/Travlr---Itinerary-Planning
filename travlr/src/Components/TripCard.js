import React from "react";
import {Button, Card, Grid, Icon, Image} from "semantic-ui-react";
import {Link, withRouter} from "react-router-dom";
import logo from "../Content/travelabroad.png";

const TripCard = props => (
  <Grid.Column
    style={{
      marginTop: "40px",
      marginBottom: "20px",
      marginRight: "20px",
      marginLeft: "20px"
    }}
  >
    <Card className="ui card" raised style={{ margin: "auto" }}>
      <Link
        to={`/trips/${props.trip.id}`}
        onClick={() => props.onSelect(props.trip)}
      >
        <Card.Content>
          <h3 style={{ color: "dark grey" }}>{props.trip.destination}</h3>
        </Card.Content>
        <Image style={{ height: "200px" }} src={logo} />
        <Card.Content style={{ fontSize: 14 }} extra>
          <Icon name="user" /> Going With David
        </Card.Content>
      </Link>
      <Button
        fluid
        color="blue"
        animated="vertical"
        onClick={() => props.deleteHandler(props.trip)}
      >
        <Button.Content visible>Delete</Button.Content>
        <Button.Content hidden>
          <Icon name="trash alternate outline" />
        </Button.Content>
      </Button>
    </Card>
  </Grid.Column>
);

export default withRouter(TripCard);
