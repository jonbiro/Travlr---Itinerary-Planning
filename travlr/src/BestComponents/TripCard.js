import React from "react";
import { Button, Card, Icon, Image, Grid } from "semantic-ui-react";
import { Link, withRouter } from "react-router-dom";

const TripCard = props => (
  <Grid.Column style={{ marginTop: "40px", marginBottom: "20px", marginRight: '20px', marginLeft: '20px' }}>
    <Card className='ui card' raised style={{ margin: "auto" }}>
      <Link
        to={`/trips/${props.trip.id}`}
        onClick={() => props.onSelect(props.trip)}
      >
        <Card.Content>
          <h3 style={{ color: "dark grey" }}>{props.trip.destination}</h3>
        </Card.Content>
        <Image
          style={{ height: "200px" }}
          src="https://images.unsplash.com/photo-1530521954074-e64f6810b32d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1350&q=80"
        />
        <Card.Content style={{  fontSize: 14 }} extra>
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
