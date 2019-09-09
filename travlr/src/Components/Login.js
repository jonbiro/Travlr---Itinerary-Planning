import React, {Component} from "react";
import {Button, Card, Form, Grid, Header, Image, Message, Segment} from "semantic-ui-react";
import {Link, withRouter} from "react-router-dom";
import logo from "../Content/dogetravlr.png";

class LoginForm extends Component {
  state = {
    username: "",
    password: ""
  };

  login = () => {
    fetch("/api/v1/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.state)
    })
      .then(res => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error("Invalid Login");
        }
      })
      .then(data => {
        // console.log(data);
        localStorage.setItem("accessToken", data.jwt);
        localStorage.setItem("user_id", data.user.id);
        localStorage.setItem("username", data.user.username);
        this.props.history.push("/trips");
      })
      .catch(error => {
        alert("Invalid Login", error);
      });
  };

  nameHandle = e => {
    this.setState({
      username: e.target.value
    });
  };

  passHandle = e => {
    this.setState({
      password: e.target.value
    });
  };

  render() {
    return (
      <div
        style={{ backgroundColor: "transparent" }}
        className="animated bounce delay-3s"
      >
        <style>{`
          body > div,
          body > div > div,
          body > div > div > div.login-form {
            height: 100%;
          }
        `}</style>
        <Grid
          textAlign="center"
          style={{ height: "100%" }}
          verticalAlign="middle"
        >
          <Grid.Column style={{ maxWidth: 450 }}>
            <Header color="teal" textAlign="center">
              <Card style={{ margin: "auto" }}>
                <div>
                  <Image src={logo} />
                </div>
              </Card>
              <div
                style={{
                  color: "#ffffff",
                  fontFamily: "'Baloo Thambi', cursive",
                  marginTop: "10px"
                }}
              >
                Log-in to your account
              </div>
            </Header>
            <Form size="large">
              <Segment stacked>
                <Form.Input
                  onChange={this.nameHandle}
                  fluid
                  icon="user"
                  iconPosition="left"
                  placeholder="Username"
                />
                <Form.Input
                  onChange={this.passHandle}
                  fluid
                  icon="lock"
                  iconPosition="left"
                  placeholder="Password"
                  type="password"
                />

                <Button onClick={this.login} color="blue" fluid size="large">
                  Login
                </Button>
              </Segment>
            </Form>
            <Message>
              New to us? <Link to={"/signup"}>Sign Up </Link>
            </Message>
          </Grid.Column>
        </Grid>
      </div>
    );
  }
}

export default withRouter(LoginForm);
