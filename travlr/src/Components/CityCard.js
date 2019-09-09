import React from "react";
import {Button, Card, Grid, Icon, Image} from "semantic-ui-react";
import {Link, withRouter} from "react-router-dom";
import logo from "../Content/travelingstockimage.jpeg";

const CityCard = props => (
  <Grid.Column
    style={{
      marginTop: "40px",
      marginBottom: "20px",
      marginRight: "20px",
      marginLeft: "20px"
    }}
  >
    <Card raised style={{ margin: "auto" }}>
      <Link to={`/cities/${props.city.id}`}>
        <Card.Content>
          <h3 style={{ color: "dark grey" }}>{props.city.name}</h3>
        </Card.Content>
        <Image style={{ height: "200px" }} src={logo} />
        <Card.Content style={{ color: "dark grey", fontSize: 14 }} extra>
          <Icon name="user" /> Going with Friends
        </Card.Content>
      </Link>
      <Button
        fluid
        color="blue"
        animated="vertical"
        onClick={() => props.deleteHandler(props.city)}
      >
        <Button.Content visible>Delete</Button.Content>
        <Button.Content hidden>
          <Icon name="trash alternate outline" />
        </Button.Content>
      </Button>
    </Card>
  </Grid.Column>
);

export default withRouter(CityCard);
