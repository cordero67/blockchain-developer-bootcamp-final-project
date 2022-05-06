import React, { Component, Fragment } from "react";
import getWeb3 from "./getWeb3";
import Factory from "../abis/EventTicketingFactory.json";
import GAEventTicket from "../abis/GAEventTickets.json";

import Spinner from "./Spinner/Spinner";

import Logo from "./Assets/blu_mun.jpeg";

import classes from "./App.module.css";

// Completes Phase 1 of Overall Project
class App extends Component {
  state = {
    isLoading: true,
    display: "events", // events, create, myEvents, myTickets, exchange, presentation
    presentationDisplay: 0,
    modal: "none", // none, buy, create, modify, transfer
    modalSpinner: false,
    transactionSuccess: "none", // none, success, failure
    web3: null,
    accounts: null,
    networkId: null,
    factory: null,
    factoryAddress: null,
    mananger: null,
    gaTicketWarnings: {
      nameRemaining: false,
      name: "true",
      symbolRemaining: false,
      symbol: "true",
      initialRemaining: false,
      initial: "true",
      priceRemaining: false,
      price: "true",
    },
    gaTicketDetails: [
      //{
      //address: null,
      //name: null,
      //symbol: null,
      //ticketSupply: null,
      //primaryPrice: null,
      //available: null,
      //creator: null,
      //newOrder: [{ number: null, amount: null }],
      //},
    ],
    gaTransferWarnings: {
      recipientRemaining: false,
      recipient: "true",
    },
    newEvent: { name: "", symbol: "", initial: "", price: "" },
    newOrder: {},
    transferOrder: {},
    selectedEvent: [],
    myEvents: [],
    myTickets: [],
  };

  componentDidMount = async () => {
    await this.detectAccountChange();
    try {
      // creates instance of "Web3" by calling "getWeb3"
      const web3 = await getWeb3();
      this.setState({ web3: web3 });
      console.log("web3 version: ", this.state.web3.version);

      // uses "web3" instance to get user accounts associated with given provider
      const accounts = await web3.eth.getAccounts();
      this.setState({ accounts: accounts });
      console.log("Accounts: ", this.state.accounts);

      // function from "web3.eth.net" library that gets current network ID
      // for example, Rinkeby is networkId "4" and ganache-gui is "5777"
      // used to determine "deployedNetwork" and "factoryAddress"
      const networkId = await web3.eth.net.getId();
      this.setState({ networkId: networkId });
      console.log("networkId: ", this.state.networkId);

      // function from "web3.eth.net" library that gets current network
      const network = await web3.eth.net.getNetworkType();
      console.log("network: ", network);

      // extracts "networkId" field inside "networks" field inside ".json" file
      // remember "Factory = EventTicketingFactory.json"
      // for example, this equates to "EventTicketingFactory.json.networks[4]" or "EventTicketingFactory.json.networks[5777]"
      const deployedNetwork = Factory.networks[networkId];
      console.log("Deployed Network: ", deployedNetwork);

      const factoryAddress = Factory.networks[networkId].address;
      this.setState({ factoryAddress: factoryAddress });
      console.log("Factory address ", this.state.factoryAddress);

      // creates an instance of contract defined by its ABI and address
      // "new web3.eth.Contracts(abi, address)"
      // "abi" is located in root level of "EventTicketingFactory.json"
      // address is located in "address" field inside "networks[4]" or "networkd[5777]"
      const factory = new web3.eth.Contract(
        Factory.abi,
        deployedNetwork && deployedNetwork.address
      );
      this.setState({ factory: factory });
      console.log("Factory contract ", this.state.factory);

      // extract the Factory contract manager
      const manager = await factory.methods.manager().call();
      this.setState({ manager: manager });
      console.log("Factory manager ", this.state.manager);

      this.retrieveBlockData();
    } catch (err) {}
  };

  retrieveBlockData = async () => {
    this.setState({ isLoading: true });
    const { factory, web3 } = this.state;

    this.setState({ gaTicketDetails: [], myEvents: [], myTickets: [] });
    // retrieves list of launched GATicket events
    const gaTickets = await factory.methods.getDeployedGAEventTickets().call();
    console.log("gaTickets: ", gaTickets);
    if (gaTickets.length === 0) {
      this.setState({ isLoading: false });
    } else {
      let tempArray1 = [];
      let tempArray2 = [];
      let tempArray3 = [];

      // extracts specific data from each launched event
      gaTickets.map(async (item, index) => {
        const gaEvent = new web3.eth.Contract(GAEventTicket.abi, item);
        const address = gaEvent._address;
        let name = await gaEvent.methods.name().call();
        let symbol = await gaEvent.methods.symbol().call();
        let ticketSupply = await gaEvent.methods.totalSupply().call();
        let primaryPrice = await gaEvent.methods.primaryPrice().call();
        let creator = await gaEvent.methods.creator().call();
        let available = await gaEvent.methods.balanceOf(creator).call();

        let purchased = await gaEvent.methods
          .balanceOf(this.state.accounts[0])
          .call();

        let tempObject1 = {
          address: item,
          name: name,
          symbol: symbol,
          ticketSupply: ticketSupply,
          primaryPrice: primaryPrice,
          available: available,
          creator: creator,
          newOrder: [{ number: null, amount: null }],
        };

        //console.log("new event: ", tempObject1);
        //console.log("gaTicketDetails: ", this.state.gaTicketDetails);

        tempArray1.push(tempObject1);
        this.setState({ gaTicketDetails: tempArray1 });

        if (creator === this.state.accounts[0]) {
          let tempAddress = item;

          tempArray2.push(tempAddress);
          this.setState({ myEvents: tempArray2 });
        } else if (purchased > 0) {
          //console.log("I bought tickets to this event");
          let tempPurchase = {
            name: name,
            symbol: symbol,
            address: address,
            creator: creator,
            price: primaryPrice,
            amount: purchased,
          };

          tempArray3.push(tempPurchase);
          this.setState({ myTickets: tempArray3 });
        } else {
          //console.log("I did not create or buy tickets to this event");
        }

        console.log("MY tickets: ", this.state.myTickets);

        if (index === gaTickets.length - 1) {
          this.setState({ isLoading: false });
        }
      });
    }
  };

  eventButtons = (contains, item, index) => {
    const { web3 } = this.state;
    if (contains) {
      return (
        <div style={{ paddingTop: "20px", paddingBottom: "10px" }}>
          <button
            className={classes.ButtonBlueSmall}
            onClick={() => {
              this.setState({ display: "myEvents" });
            }}
          >
            MANAGE YOUR EVENT
          </button>
        </div>
      );
    } else if (item.available === "0") {
      return (
        <div
          style={{
            paddingTop: "20px",
            paddingBottom: "5px",
            fontSize: "30px",
            fontWeight: "600",
            color: "red",
          }}
        >
          SOLD OUT
        </div>
      );
    } else {
      return (
        <div style={{ paddingTop: "20px", paddingBottom: "10px" }}>
          <button
            className={classes.ButtonGreenSmall}
            onClick={async () => {
              const gaEvent = new web3.eth.Contract(
                GAEventTicket.abi,
                item.address
              );

              let newItem = { ...item };
              let available = await gaEvent.methods
                .balanceOf(item.creator)
                .call();

              newItem.index = index;
              newItem.available = available;
              newItem.quantity = 0;
              this.setState({ modal: "buy", newOrder: newItem });
            }}
          >
            BUY TICKETS
          </button>
        </div>
      );
    }
  };

  eventList = () => {
    const { isLoading, gaTicketDetails } = this.state;

    if (isLoading) {
      return <div style={{ fontSize: "22px" }}>Loading information...</div>;
    } else if (!(gaTicketDetails.length === 0)) {
      return (
        <Fragment>
          {gaTicketDetails.map((item, index) => {
            let contains = false;
            if (this.state.myEvents.includes(item.address)) {
              contains = true;
            }
            return (
              <article key={index} className={classes.Event}>
                <div
                  className={classes.EventTitle}
                  style={{ fontSize: "24px" }}
                >
                  {item.name}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "50% 48%",
                    columnGap: "2%",
                  }}
                >
                  <div style={{ textAlign: "right" }}>
                    <div>Ticket Symbol:</div>
                    <div>Tickets Available:</div>
                    <div>Ticket Price:</div>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div>{item.symbol}</div>
                    <div>{item.available}</div>
                    <div>{item.primaryPrice} wei</div>
                  </div>
                </div>

                {this.eventButtons(contains, item, index)}
                <div style={{ paddingTop: "10px", fontWeight: "600" }}>
                  Ticket Address
                </div>
                <div>{item.address}</div>
                <div style={{ paddingTop: "10px", fontWeight: "600" }}>
                  Event Creator
                </div>
                <div>{item.creator}</div>
              </article>
            );
          })}
        </Fragment>
      );
    } else {
      return (
        <div
          style={{
            paddingTop: "30px",
            paddingBottom: "20px",
            paddingLeft: "40px",
          }}
        >
          <div
            style={{
              fontSize: "22px",
              fontWeight: "600",
              color: "rblack",
            }}
          >
            There are no events available
          </div>
        </div>
      );
    }
  };

  myEventsList = () => {
    const { gaTicketDetails, myEvents } = this.state;
    if (this.state.isLoading) {
      return <div style={{ fontSize: "22px" }}>Loading information...</div>;
    } else if (!(myEvents.length === 0)) {
      return (
        <Fragment>
          {gaTicketDetails.map((item, index) => {
            let match = false;
            myEvents.forEach((item2, index) => {
              if (item2 === item.address) {
                match = true;
              }
            });
            if (match) {
              return (
                <div style={{ paddingBottom: "30px" }}>
                  <div
                    className={classes.EventTitle}
                    style={{ fontSize: "24px" }}
                  >
                    {`${gaTicketDetails[index].name} (${gaTicketDetails[index].symbol})`}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "280px 300px",
                      columnGap: "5px",
                      fontSize: "16px",
                    }}
                  >
                    <div style={{ textAlign: "right" }}>
                      Initial Ticket Issuance:
                    </div>
                    <div style={{ textAlign: "left" }}>{item.ticketSupply}</div>
                    <div style={{ textAlign: "right" }}>
                      Current Ticket Availability:
                    </div>
                    <div style={{ textAlign: "left" }}>{item.available}</div>
                    <div style={{ textAlign: "right" }}>Ticket Price:</div>
                    <div style={{ textAlign: "left" }}>
                      {item.primaryPrice} wei
                    </div>
                    <div style={{ textAlign: "right" }}>Ticket Address:</div>
                    <div style={{ textAlign: "left" }}>{item.address}</div>
                  </div>
                  <div
                    style={{
                      paddingLeft: "160px",
                      paddingTop: "20px",
                      paddingBottom: "30px",
                    }}
                  >
                    <button
                      className={classes.ButtonBlueSmall}
                      onClick={() => {
                        let newItem = {
                          transferring: 0,
                          recipient: "",
                          address: item.address,
                          amount: item.available,
                          creator: item.creator,
                          name: item.name,
                          price: item.primaryPrice,
                          symbol: item.symbol,
                        };
                        this.setState({
                          modal: "transfer",
                          transferOrder: newItem,
                        });
                        console.log(
                          "transfer Order: ",
                          this.state.transferOrder
                        );
                      }}
                    >
                      TRANSFER TICKETS
                    </button>
                  </div>
                  <hr style={{ width: "100%", backgroundColor: "#666" }} />
                </div>
              );
            } else return null;
          })}
        </Fragment>
      );
    } else {
      return (
        <div
          style={{
            paddingTop: "30px",
            paddingBottom: "20px",
            paddingLeft: "40px",
          }}
        >
          <div
            style={{
              fontSize: "22px",
              fontWeight: "600",
              color: "rblack",
            }}
          >
            You do not have any active events
          </div>
        </div>
      );
    }
  };

  myTicketsList = () => {
    const { myTickets } = this.state;
    if (this.state.isLoading) {
      return <div style={{ fontSize: "22px" }}>Loading information...</div>;
    } else if (!(myTickets.length === 0)) {
      return (
        <Fragment>
          {myTickets.map((item, index) => {
            console.log("item: ", item);
            return (
              <div style={{ paddingBottom: "30px" }}>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "600",
                    paddingBottom: "10px",
                  }}
                >
                  {item.name} ({item.symbol})
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "180px 300px",
                    columnGap: "5px",
                    fontSize: "16px",
                  }}
                >
                  <div style={{ textAlign: "right" }}>Ticket address:</div>
                  <div style={{ textAlign: "left" }}>{item.address}</div>
                  <div style={{ textAlign: "right" }}>Event creator:</div>
                  <div style={{ textAlign: "left" }}>{item.creator}</div>
                  <div style={{ textAlign: "right" }}>Tickets owned:</div>
                  <div style={{ textAlign: "left" }}>{item.amount}</div>
                </div>
                <div
                  style={{
                    paddingLeft: "160px",
                    paddingTop: "20px",
                    paddingBottom: "30px",
                  }}
                >
                  <button
                    className={classes.ButtonBlueSmall}
                    onClick={() => {
                      let newItem = { ...item };
                      newItem.transferring = 0;
                      newItem.recipient = "";
                      this.setState({
                        modal: "transfer",
                        transferOrder: newItem,
                      });
                      console.log("transfer Order: ", this.state.transferOrder);
                    }}
                  >
                    TRANSFER TICKETS
                  </button>
                </div>
                <hr style={{ width: "100%", backgroundColor: "#666" }} />
              </div>
            );
          })}
        </Fragment>
      );
    } else {
      return (
        <div
          style={{
            paddingTop: "30px",
            paddingBottom: "20px",
            paddingLeft: "40px",
          }}
        >
          <div
            style={{
              fontSize: "22px",
              fontWeight: "600",
              color: "rblack",
            }}
          >
            You do not have any active tickets
          </div>
        </div>
      );
    }
  };

  onClick = async () => {
    const { factory, web3 } = this.state;
    const { name, symbol, initial, price } = this.state.newEvent;

    // use "web3" instance to get user accounts associated with given provider
    const accounts = await web3.eth.getAccounts();
    this.setState({ accounts: accounts });
    console.log("Accounts: ", this.state.accounts);

    // launches a GATicket event
    await factory.methods
      .createGATickets(name, symbol, initial, price)
      .send({ from: accounts[0] });

    this.setState({
      newEvent: { name: "", symbol: "", initial: "", price: "" },
      gaTicketWarnings: {
        nameRemaining: false,
        name: "true",
        symbolRemaining: false,
        symbol: "true",
        initialRemaining: false,
        initial: "true",
        priceRemaining: false,
        price: "true",
      },
    });

    // updates gaTicketDetails
    this.retrieveBlockData();
  };

  updateNewEvent = (event) => {
    let newEvent = { ...this.state.newEvent };
    newEvent[event.target.name] = event.target.value;
    this.setState({ newEvent: newEvent });
  };

  updateTransferOrder = (event) => {
    let newOrder = { ...this.state.transferOrder };
    newOrder[event.target.name] = event.target.value;
    this.setState({ transferOrder: newOrder });
  };

  updateGaTicketWarnings = (event) => {
    let symbolRegex1 = /^[a-zA-Z0-9]{0,6}$/;
    let symbolRegex2 = /^[a-zA-Z0-9]{3,6}$/;
    let initialRegex = /^[1,2,3,4,5,6,7,8,9][0-9]{0,5}$/;
    let priceRegex = /^[1,2,3,4,5,6,7,8,9][0-9]{0,18}$/;

    let name = event.target.name;
    let value = event.target.value;
    let test = true;

    let tempWarnings = { ...this.state.gaTicketWarnings };

    if (name === "name") {
      if (value.length === 0) {
        tempWarnings.name = "true";
      } else {
        tempWarnings.name = "";
      }
    } else if (name === "symbol") {
      test = symbolRegex2.test(value);
      if (value.length === 0) {
        tempWarnings.symbol = "true";
      } else if (!test) {
        test = symbolRegex1.test(value);
        if (!test) {
          tempWarnings.symbol = "can only contain letters and numbers";
        } else {
          tempWarnings.symbol = "minimum 3 characters required";
        }
      } else {
        tempWarnings.symbol = "";
      }
    } else if (name === "initial") {
      test = initialRegex.test(value);
      if (value.length === 0) {
        tempWarnings.initial = "true";
      } else if (!test) {
        tempWarnings.initial = "not a valid number";
      } else if (value > 100000) {
        tempWarnings.initial = "maximum amount is 100,000";
      } else {
        tempWarnings.initial = "";
      }
    } else if (name === "price") {
      test = priceRegex.test(value);
      if (value.length === 0) {
        tempWarnings.price = "true";
      } else if (!test) {
        tempWarnings.price = "not a valid number";
      } else if (value > 1000000000000000000) {
        tempWarnings.price = "maximum amount is 1,000,000,000,000,000,000 wei";
      } else {
        tempWarnings.price = "";
      }
    }
    this.setState({ gaTicketWarnings: tempWarnings });
  };

  updateGaTransferWarnings = (event) => {
    let addressRegex = /^0x[a-fA-F0-9]{40}$/;

    let name = event.target.name;
    let value = event.target.value;
    let test = true;

    let tempWarnings = { ...this.state.gaTransferWarnings };

    if (name === "recipient") {
      test = addressRegex.test(value);
      console.log("Test result: ", test);
      if (value.length === 0) {
        tempWarnings.recipient = "true";
      } else if (!test) {
        console.log("Not a valid address");
        tempWarnings.recipient = "not a valid address";
      } else {
        tempWarnings.recipient = "";
        console.log("ALL GOOD");
      }
    }
    this.setState({ gaTransferWarnings: tempWarnings });
  };

  warningMessage = (message) => {
    return (
      <div
        style={{
          paddingLeft: "10px",
          height: "14px",
          fontSize: "10px",
          color: "red",
          fontWeight: "700",
        }}
      >
        {message}
      </div>
    );
  };

  remainingMessage = (limit, warning, variable) => {
    if (variable && variable.length >= limit) {
      return (
        <div
          style={{
            paddingLeft: "10px",
            height: "14px",
            fontSize: "10px",
            color: "red",
            fontWeight: "700",
          }}
        >
          Maximum characters used
        </div>
      );
    } else if (variable && variable.length >= limit - warning) {
      return (
        <div
          style={{
            paddingLeft: "10px",
            height: "14px",
            fontSize: "10px",
            color: "red",
          }}
        >
          Remaining characters allowed: {limit - variable.length}
        </div>
      );
    } else if (variable) {
      return (
        <div
          style={{
            paddingLeft: "10px",
            height: "14px",
            fontSize: "10px",
            color: "black",
          }}
        >
          Remaining characters allowed: {limit - variable.length}
        </div>
      );
    } else {
      return (
        <div
          style={{
            paddingLeft: "10px",
            height: "14px",
            fontSize: "10px",
            color: "black",
          }}
        >
          Remaining characters allowed: {limit}
        </div>
      );
    }
  };

  disableTicketButton = () => {
    if (
      this.state.gaTicketWarnings.name ||
      this.state.gaTicketWarnings.symbol ||
      this.state.gaTicketWarnings.initial ||
      this.state.gaTicketWarnings.price
    ) {
      return true;
    } else {
      return false;
    }
  };

  disableTransferButton = () => {
    if (
      this.state.gaTransferWarnings.recipient ||
      parseInt(this.state.transferOrder.transferring) === 0
    ) {
      return true;
    } else {
      return false;
    }
  };

  createGATickets = () => {
    return (
      <div className={classes.TicketCreationPane}>
        <div className={classes.TicketCreationTitle}>
          General Admission Tickets
        </div>
        <div>
          <div className={classes.InputBoxLabel}>
            Event Title<span style={{ color: "red" }}>*</span>
          </div>
          <div className={classes.InputBox}>
            <input
              className={
                this.state.gaTicketWarnings.name
                  ? classes.InputBoxContentError
                  : classes.InputBoxContent
              }
              onFocus={() => {
                let tempWarnings = { ...this.state.gaTicketWarnings };
                tempWarnings.nameRemaining = true;
                this.setState({ gaTicketWarnings: tempWarnings });
              }}
              onBlur={() => {
                let tempWarnings = { ...this.state.gaTicketWarnings };
                tempWarnings.nameRemaining = false;
                this.setState({ gaTicketWarnings: tempWarnings });
              }}
              type="text"
              maxLength="64"
              placeholder="limit 64 alphanumeric characters"
              name="name"
              value={this.state.newEvent.name}
              onChange={(event) => {
                this.updateNewEvent(event);
                this.updateGaTicketWarnings(event);
              }}
            ></input>

            {this.state.gaTicketWarnings.nameRemaining
              ? this.remainingMessage(64, 10, this.state.newEvent.name)
              : null}
          </div>
        </div>
        <div>
          <div className={classes.InputBoxLabel}>
            Ticket Symbol<span style={{ color: "red" }}>*</span>
          </div>
          <div className={classes.InputBox}>
            <input
              className={
                this.state.gaTicketWarnings.symbol
                  ? classes.InputBoxContentError
                  : classes.InputBoxContent
              }
              onFocus={() => {
                let tempWarnings = { ...this.state.gaTicketWarnings };
                tempWarnings.symbolRemaining = true;
                this.setState({ gaTicketWarnings: tempWarnings });
              }}
              onBlur={() => {
                let tempWarnings = { ...this.state.gaTicketWarnings };
                tempWarnings.symbolRemaining = false;
                this.setState({ gaTicketWarnings: tempWarnings });
              }}
              type="text"
              maxLength="6"
              placeholder="3 to 6 alphanumeric characters"
              name="symbol"
              value={this.state.newEvent.symbol}
              onChange={(event) => {
                this.updateNewEvent(event);
                this.updateGaTicketWarnings(event);
              }}
            ></input>
            {this.state.gaTicketWarnings.symbol &&
            this.state.gaTicketWarnings.symbol !== "true"
              ? this.warningMessage(this.state.gaTicketWarnings.symbol)
              : this.state.gaTicketWarnings.symbolRemaining
              ? this.remainingMessage(6, 3, this.state.newEvent.symbol)
              : null}
          </div>
        </div>
        <div>
          <div className={classes.InputBoxLabel}>
            Ticket Quantity<span style={{ color: "red" }}>*</span>
          </div>
          <div className={classes.InputBox}>
            <input
              className={
                this.state.gaTicketWarnings.initial
                  ? classes.InputBoxContentError
                  : classes.InputBoxContent
              }
              onFocus={() => {
                let tempWarnings = { ...this.state.gaTicketWarnings };
                tempWarnings.initialRemaining = true;
                this.setState({ gaTicketWarnings: tempWarnings });
              }}
              onBlur={() => {
                let tempWarnings = { ...this.state.gaTicketWarnings };
                tempWarnings.initialRemaining = false;
                this.setState({ gaTicketWarnings: tempWarnings });
              }}
              type="text"
              maxLength="6"
              placeholder="max 100,000 tickets"
              name="initial"
              value={this.state.newEvent.initial}
              onChange={(event) => {
                this.updateNewEvent(event);
                this.updateGaTicketWarnings(event);
              }}
            ></input>
            {this.state.gaTicketWarnings.initial &&
            this.state.gaTicketWarnings.initial !== "true"
              ? this.warningMessage(this.state.gaTicketWarnings.initial)
              : this.state.gaTicketWarnings.initialRemaining
              ? this.remainingMessage(6, 3, this.state.newEvent.initial)
              : null}
          </div>
        </div>
        <div>
          <div className={classes.InputBoxLabel}>
            Ticket Price (in Wei)<span style={{ color: "red" }}>*</span>
          </div>
          <div className={classes.InputBox}>
            <input
              className={
                this.state.gaTicketWarnings.price
                  ? classes.InputBoxContentError
                  : classes.InputBoxContent
              }
              onFocus={() => {
                let tempWarnings = { ...this.state.gaTicketWarnings };
                tempWarnings.priceRemaining = true;
                this.setState({ gaTicketWarnings: tempWarnings });
              }}
              onBlur={() => {
                let tempWarnings = { ...this.state.gaTicketWarnings };
                tempWarnings.priceRemaining = false;
                this.setState({ gaTicketWarnings: tempWarnings });
              }}
              type="text"
              maxLength="19"
              placeholder="max 1,000,000,000,000,000,000 wei"
              name="price"
              value={this.state.newEvent.price}
              onChange={(event) => {
                this.updateNewEvent(event);
                this.updateGaTicketWarnings(event);
              }}
            ></input>
            <div>
              {this.state.gaTicketWarnings.price &&
              this.state.gaTicketWarnings.price !== "true"
                ? this.warningMessage(this.state.gaTicketWarnings.price)
                : this.state.gaTicketWarnings.priceRemaining
                ? this.remainingMessage(19, 6, this.state.newEvent.price)
                : null}
            </div>
          </div>
        </div>
        <div style={{ paddingTop: "20px" }}>
          <button
            className={
              this.disableTicketButton()
                ? classes.ButtonGreenOpac
                : classes.ButtonGreen
            }
            disabled={this.disableTicketButton()}
            onClick={() => {
              this.setState({ modal: "create" });
              //this.onClick();
            }}
          >
            CREATE GENERAL ADMISSION TICKETS
          </button>
        </div>
      </div>
    );
  };

  createASTickets = () => {
    return (
      <div className={classes.TicketCreationPane}>
        <div className={classes.TicketCreationTitle}>
          Assigned Seating Tickets
          <div
            style={{ paddingTop: "20px", paddingLeft: "40px", color: "red" }}
          >
            Coming soon!
          </div>
        </div>
      </div>
    );
  };

  createEventNFTs = () => {
    return (
      <div className={classes.TicketCreationPane}>
        <div className={classes.TicketCreationTitle}>
          Event NFTs
          <div
            style={{ paddingTop: "20px", paddingLeft: "40px", color: "red" }}
          >
            Coming soon!
          </div>
        </div>
      </div>
    );
  };

  ticketExchange = () => {
    return (
      <div
        style={{
          paddingTop: "30px",
          paddingBottom: "20px",
          paddingLeft: "40px",
        }}
      >
        <div
          style={{
            paddingBottom: "10px",
            fontSize: "22px",
            fontWeight: "600",
            color: "red",
          }}
        >
          Coming soon!
        </div>
      </div>
    );
  };

  changeDisplay = (view) => {
    this.setState({ display: view });
  };

  header = (
    <header
      style={{
        paddingLeft: "20px",
        paddingRight: "60px",
        height: "80px",
        width: "100%",
        boxSizing: "border-box",
        zIndex: "200",
        display: "grid",
        gridTemplateColumns: "80px 400px auto",
        backgroundColor: "#000",
        position: "fixed",
      }}
    >
      <div>
        <img
          className={classes.ImageBox}
          src={Logo}
          alt="No logo available"
          onerror="onerror=null;src='../../assets/Get_Your_Tickets.png'"
          onClick={() => {
            this.changeDisplay("presentation");
          }}
        />
      </div>
      <div
        style={{
          paddingTop: "10px",
          listStyleType: "none",
          fontSize: "36px",
          fontWeight: "600",
          color: "#4792F7", //#76AFF9
        }}
      >
        Blü Mün Event Tickets
      </div>
      <div
        style={{
          textAlign: "center",
        }}
      >
        <ul
          style={{
            display: "grid",
            gridTemplateColumns: "auto 100px 120px 110px 160px 160px",
            columnGap: "20px",
          }}
        >
          <li></li>
          <li
            onClick={() => {
              console.log("display: ", this.state.display);
              this.changeDisplay("events");
            }}
            className={
              this.state.display === "events"
                ? classes.HeaderItemSelected
                : classes.HeaderItem
            }
          >
            All Events
          </li>
          <li
            onClick={() => {
              this.changeDisplay("create");
            }}
            className={
              this.state.display === "create"
                ? classes.HeaderItemSelected
                : classes.HeaderItem
            }
          >
            Issue Tickets
          </li>
          <li
            onClick={() => {
              this.changeDisplay("myEvents");
            }}
            className={
              this.state.display === "myEvents"
                ? classes.HeaderItemSelected
                : classes.HeaderItem
            }
          >
            My Events
          </li>
          <li
            onClick={() => {
              console.log(
                "display before myTicket click: ",
                this.state.display
              );
              this.changeDisplay("myTickets");
              console.log("display after myTicket click: ", this.state.display);
            }}
            className={
              this.state.display === "myTickets"
                ? classes.HeaderItemSelected
                : classes.HeaderItem
            }
          >
            My Ticket Wallet
          </li>
          <li
            className={
              this.state.display === "exchange"
                ? classes.HeaderItemSelected
                : classes.HeaderItem
            }
            onClick={() => {
              this.changeDisplay("exchange");
            }}
          >
            Ticket Exchange
          </li>
        </ul>
      </div>
    </header>
  );

  accountHeader = () => {
    if (this.state.isLoading) {
      return <div className={classes.AccountHeader}>Who are you?</div>;
    } else if (this.state.display !== "presentation") {
      return (
        <div className={classes.AccountHeader}>
          Hello account: {this.state.accounts[0]}
        </div>
      );
    } else {
      return <div className={classes.AccountHeader}></div>;
    }
  };

  issueTicketsDisplay = () => {
    if (this.state.display === "create") {
      return (
        <div className={classes.PageDisplay}>
          <div className={classes.PageTitle}>Issue Tickets</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "480px 480px 480px",
              columnGap: "20px",
            }}
          >
            <div>{this.createGATickets()}</div>
            <div>{this.createASTickets()}</div>
            <div>{this.createEventNFTs()}</div>
          </div>
        </div>
      );
    } else return null;
  };

  presentationDisplay = () => {
    if (this.state.display === "presentation") {
      return (
        <div className={classes.PageDisplay}>
          <div
            style={{
              paddingTop: "30px",
              paddingRight: "40px",
              paddingBottom: "30px",
              paddingLeft: "40px",
            }}
          >
            <div
              style={{
                paddingTop: "10px",
                listStyleType: "none",
                fontSize: "36px",
                fontWeight: "600",
                textAlign: "center",
                color: "#4792F7", //#76AFF9
              }}
              onClick={() => {
                console.log("New screen");
                if (parseInt(this.state.presentationDisplay) === 20) {
                  this.setState({ presentationDisplay: 0 });
                } else {
                  this.setState({
                    presentationDisplay:
                      parseInt(this.state.presentationDisplay) + 1,
                  });
                }
                console.log(
                  "presentation display: ",
                  this.state.presentationDisplay
                );
              }}
            >
              Blü Mün Event Tickets
            </div>

            {this.state.presentationDisplay > 0 ? (
              <div
                style={{
                  paddingTop: "40px",
                  listStyleType: "none",
                  fontSize: "28px",
                  fontWeight: "600",
                  textAlign: "center",
                  color: "#0000FF",
                }}
              >
                A blockchain based ticketing application
              </div>
            ) : null}

            {this.state.presentationDisplay > 1 &&
            this.state.presentationDisplay < 4 ? (
              <div
                style={{
                  paddingTop: "40px",
                  fontSize: "28px",
                  textAlign: "center",
                }}
              >
                Allows event creators to issue tickets and maintain complete
                control over its entire journey.
              </div>
            ) : null}

            {this.state.presentationDisplay > 2 &&
            this.state.presentationDisplay < 4 ? (
              <div
                style={{
                  paddingTop: "40px",
                  fontSize: "28px",
                  textAlign: "center",
                }}
              >
                Both the primary and secondary markets.
              </div>
            ) : null}

            {this.state.presentationDisplay > 3 &&
            this.state.presentationDisplay < 11 ? (
              <div
                style={{
                  paddingTop: "40px",
                  fontSize: "28px",
                  textAlign: "center",
                }}
              >
                Why Blockchain?
              </div>
            ) : null}

            {this.state.presentationDisplay > 4 &&
            this.state.presentationDisplay < 11 ? (
              <div
                style={{
                  paddingTop: "40px",
                  paddingLeft: "350px",
                  fontSize: "24px",
                  textAlign: "left",
                }}
              >
                Benefits for Event Creators.
              </div>
            ) : null}

            {this.state.presentationDisplay > 5 &&
            this.state.presentationDisplay < 11 ? (
              <div
                style={{
                  paddingTop: "20px",
                  paddingLeft: "400px",
                  fontSize: "24px",
                  textAlign: "left",
                }}
              >
                to mitigate the act of ticket scalping
              </div>
            ) : null}

            {this.state.presentationDisplay > 6 &&
            this.state.presentationDisplay < 11 ? (
              <div
                style={{
                  paddingTop: "20px",
                  paddingLeft: "400px",
                  fontSize: "24px",
                  textAlign: "left",
                }}
              >
                participate in any price markup realized in the secondary market
              </div>
            ) : null}

            {this.state.presentationDisplay > 7 &&
            this.state.presentationDisplay < 11 ? (
              <div
                style={{
                  paddingTop: "80px",
                  paddingLeft: "350px",
                  fontSize: "24px",
                  textAlign: "left",
                }}
              >
                Benefits for Ticket Buyers.
              </div>
            ) : null}

            {this.state.presentationDisplay > 8 &&
            this.state.presentationDisplay < 11 ? (
              <div
                style={{
                  paddingTop: "20px",
                  paddingLeft: "400px",
                  fontSize: "24px",
                  textAlign: "left",
                }}
              >
                eliminate any secondary market fees
              </div>
            ) : null}

            {this.state.presentationDisplay > 9 &&
            this.state.presentationDisplay < 11 ? (
              <div
                style={{
                  paddingTop: "20px",
                  paddingLeft: "400px",
                  fontSize: "24px",
                  textAlign: "left",
                }}
              >
                potentially reduced secondary market ticket prices
              </div>
            ) : null}

            {this.state.presentationDisplay > 10 &&
            this.state.presentationDisplay < 21 ? (
              <div
                style={{
                  paddingTop: "40px",
                  fontSize: "28px",
                  textAlign: "center",
                }}
              >
                Application overview
              </div>
            ) : null}

            {this.state.presentationDisplay > 11 &&
            this.state.presentationDisplay < 16 ? (
              <div
                style={{
                  fontSize: "24px",
                  textAlign: "left",
                  paddingTop: "40px",
                  paddingLeft: "350px",
                }}
              >
                Final application will allow event creators to:
              </div>
            ) : null}

            {this.state.presentationDisplay > 12 &&
            this.state.presentationDisplay < 16 ? (
              <div
                style={{
                  fontSize: "24px",
                  textAlign: "left",
                  paddingTop: "20px",
                  paddingLeft: "400px",
                }}
              >
                issue, sell and manage general admission tickets (fungible
                ERC20)
              </div>
            ) : null}

            {this.state.presentationDisplay > 13 &&
            this.state.presentationDisplay < 16 ? (
              <div
                style={{
                  fontSize: "24px",
                  textAlign: "left",
                  paddingTop: "20px",
                  paddingLeft: "400px",
                }}
              >
                issue, sell and manage assigned seating tickets (non-fungible
                ERC721)
              </div>
            ) : null}

            {this.state.presentationDisplay > 14 &&
            this.state.presentationDisplay < 16 ? (
              <div
                style={{
                  fontSize: "24px",
                  textAlign: "left",
                  paddingTop: "20px",
                  paddingLeft: "400px",
                }}
              >
                control the parameters around the reselling of tickets purchased
              </div>
            ) : null}

            {this.state.presentationDisplay > 15 &&
            this.state.presentationDisplay < 21 ? (
              <div
                style={{
                  fontSize: "24px",
                  textAlign: "left",
                  paddingTop: "40px",
                  paddingLeft: "350px",
                }}
              >
                Phase 1 consists of four different user screens:
              </div>
            ) : null}

            {this.state.presentationDisplay > 16 &&
            this.state.presentationDisplay < 21 ? (
              <div
                style={{
                  fontSize: "24px",
                  textAlign: "left",
                  paddingTop: "20px",
                  paddingLeft: "400px",
                }}
              >
                All Events: Ticket buyer can purchase general admission tickets
              </div>
            ) : null}

            {this.state.presentationDisplay > 17 &&
            this.state.presentationDisplay < 21 ? (
              <div
                style={{
                  fontSize: "24px",
                  textAlign: "left",
                  paddingTop: "20px",
                  paddingLeft: "400px",
                }}
              >
                Issue Tickets: Event creator can generate a general admission
                ticket offering
              </div>
            ) : null}

            {this.state.presentationDisplay > 18 &&
            this.state.presentationDisplay < 21 ? (
              <div
                style={{
                  fontSize: "24px",
                  textAlign: "left",
                  paddingTop: "20px",
                  paddingLeft: "400px",
                }}
              >
                My Events: Event creator is provided a list of all ticket
                offerings they have created
              </div>
            ) : null}

            {this.state.presentationDisplay > 19 &&
            this.state.presentationDisplay < 21 ? (
              <div
                style={{
                  fontSize: "24px",
                  textAlign: "left",
                  paddingTop: "20px",
                  paddingLeft: "400px",
                }}
              >
                My Ticket Wallet: Ticket buyer is provided a list of all the
                tickets they have purchased
              </div>
            ) : null}
          </div>
        </div>
      );
    } else return null;
  };

  eventsDisplay = () => {
    if (this.state.display === "events") {
      return (
        <div className={classes.PageDisplay}>
          <div className={classes.PageTitle}>All Events</div>
          <div
            style={{
              paddingTop: "30px",
              paddingRight: "40px",
              paddingBottom: "30px",
              paddingLeft: "40px",
            }}
          >
            <section className={classes.Events}>{this.eventList()}</section>
          </div>
        </div>
      );
    } else return null;
  };

  exchangeDisplay = () => {
    if (this.state.display === "exchange") {
      return (
        <div className={classes.PageDisplay}>
          <div className={classes.PageTitle}>Ticket Exchange</div>
          <div>{this.ticketExchange()}</div>
        </div>
      );
    } else return null;
  };

  myTicketsDisplay = () => {
    if (this.state.display === "myTickets") {
      return (
        <div className={classes.PageDisplay}>
          <div className={classes.PageTitle}>
            My Ticket Wallet{" "}
            <span style={{ fontSize: "20px", color: "red" }}>
              (does not include tickets from events you created)
            </span>
          </div>
          <div
            style={{
              width: "800px",
              paddingTop: "30px",
              paddingRight: "40px",
              paddingBottom: "30px",
              paddingLeft: "40px",
            }}
          >
            {this.myTicketsList()}
          </div>
        </div>
      );
    } else return null;
  };

  myEventsDisplay = () => {
    if (this.state.display === "myEvents") {
      return (
        <div className={classes.PageDisplay}>
          <div className={classes.PageTitle}>My Events</div>
          <div
            style={{
              width: "800px",
              paddingTop: "30px",
              paddingRight: "40px",
              paddingBottom: "30px",
              paddingLeft: "40px",
            }}
          >
            {this.myEventsList()}
          </div>
        </div>
      );
    } else return null;
  };

  transferModalBody = () => {
    const { web3, accounts, transferOrder } = this.state;
    const gaEvent = new web3.eth.Contract(
      GAEventTicket.abi,
      transferOrder.address
    );

    let ticketsArray = [0];
    for (let i = 1; i <= transferOrder.amount; i++) {
      ticketsArray.push(i);
    }

    if (this.state.modalSpinner) {
      return (
        <Fragment>
          <div style={{ fontSize: "20px", paddingTop: "60px" }}>
            Your tickets are being transferred
          </div>
          <div style={{ height: "80px", paddingTop: "10px" }}>
            <Spinner />
          </div>
          <div style={{ fontSize: "20px", paddingTop: "100px" }}>
            This can take up to 60 seconds
          </div>
        </Fragment>
      );
    } else if (this.state.transactionSuccess === "none") {
      return (
        <Fragment>
          <div style={{ fontSize: "34px" }}>Ticket Transfer</div>
          <div style={{ fontSize: "24px" }}>{transferOrder.name}</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "50% 48%",
              columnGap: "2%",
              fontSize: "16px",
            }}
          >
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "16px" }}>Ticket Symbol:</div>
              <div style={{ fontSize: "16px" }}>Tickets Owned:</div>
              <div style={{ fontSize: "16px" }}>Ticket Price:</div>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "16px" }}>{transferOrder.symbol}</div>
              <div style={{ fontSize: "16px" }}>{transferOrder.amount}</div>
              <div style={{ fontSize: "16px" }}>{transferOrder.price} wei</div>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "60% 38%",
              columnGap: "2%",
              paddingTop: "15px",
            }}
          >
            <div
              style={{
                fontSize: "20px",
                textAlign: "right",
                paddingTop: "8px",
              }}
            >
              # Tickets to Transfer
            </div>
            <div style={{ fontSize: "20px", textAlign: "left" }}>
              <select
                style={{
                  padding: "9px 5px",
                  border: "1px solid lightgrey",
                  boxSizing: "borderBox",
                  width: "105px",
                  lineHeight: "1.75",
                  cursor: "pointer",
                }}
                type="text"
                id="input box time selection"
                value={transferOrder.transferring}
                name="transferring"
                onChange={(event) => {
                  this.updateTransferOrder(event);
                  this.updateGaTransferWarnings(event);
                  console.log("transfer order: ", this.state.transferOrder);
                }}
                required
              >
                {ticketsArray.map((number) => (
                  <option>{number}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <div className={classes.InputBoxLabel}>
              Recipient address<span style={{ color: "red" }}>*</span>
            </div>
            <div className={classes.InputBox}>
              <input
                className={
                  this.state.gaTransferWarnings.recipient
                    ? classes.InputBoxContentSmallError
                    : classes.InputBoxContentSmall
                }
                onFocus={() => {
                  let tempWarnings = { ...this.state.gaTransferWarnings };
                  tempWarnings.recipientRemaining = true;
                  this.setState({ gaTransferWarnings: tempWarnings });
                }}
                onBlur={() => {
                  let tempWarnings = { ...this.state.gaTransferWarnings };
                  tempWarnings.recipientRemaining = false;
                  this.setState({ gaTransferWarnings: tempWarnings });
                }}
                type="text"
                maxLength="42"
                placeholder="42 hexadecimal address starting with 0x"
                name="recipient"
                value={this.state.transferOrder.recipient}
                onChange={(event) => {
                  this.updateTransferOrder(event);
                  this.updateGaTransferWarnings(event);
                  console.log("transfer order: ", this.state.transferOrder);
                }}
              ></input>
              <div>
                {this.state.gaTransferWarnings.recipient &&
                this.state.gaTransferWarnings.recipient !== "true"
                  ? this.warningMessage(this.state.gaTransferWarnings.recipient)
                  : this.state.gaTransferWarnings.recipientRemaining
                  ? this.remainingMessage(
                      42,
                      10,
                      this.state.transferOrder.recipient
                    )
                  : null}
              </div>
            </div>
          </div>

          <div style={{ paddingTop: "20px" }}>
            <button
              className={
                this.disableTransferButton()
                  ? classes.ButtonBlueSmallOpac
                  : classes.ButtonBlueSmall
              }
              disabled={this.disableTransferButton()}
              onClick={async () => {
                this.setState({ modalSpinner: true });
                console.log(
                  "transferOrder: ",
                  this.state.transferOrder.transferring
                );

                try {
                  await gaEvent.methods
                    .transfer(
                      this.state.transferOrder.recipient,
                      this.state.transferOrder.transferring
                    )
                    .send({ from: accounts[0] });
                  this.setState({
                    modalSpinner: false,
                    transactionSuccess: "success",
                  });
                } catch (error) {
                  console.log("Something happened");
                  this.setState({
                    modalSpinner: false,
                    transactionSuccess: "failure",
                  });
                }
              }}
            >
              EXECUTE TRANSFER
            </button>
          </div>
          <div style={{ paddingTop: "20px" }}>
            <button
              className={classes.ButtonGreySmall}
              onClick={() => {
                this.setState({
                  transferOrder: {},
                  modal: "none",
                  modalSpinner: false,
                });
              }}
            >
              CANCEL TRANSFER
            </button>
          </div>
        </Fragment>
      );
    } else if (this.state.transactionSuccess === "failure") {
      return (
        <div
          style={{
            fontSize: "20px",
            paddingTop: "80px",
            paddingBottom: "40px",
          }}
        >
          Your tickets were not transferred
          <div style={{ paddingTop: "40px" }}>
            <button
              className={classes.ButtonGreySmall}
              onClick={() => {
                this.setState({
                  transferOrder: {},
                  modal: "none",
                  modalSpinner: false,
                  transactionSuccess: "none",
                });
              }}
            >
              CONTINUE
            </button>
          </div>
        </div>
      );
    } else {
      return (
        <div
          style={{
            fontSize: "20px",
            paddingTop: "80px",
            paddingBottom: "40px",
          }}
        >
          Your transfer was successfull
          <div style={{ paddingTop: "40px" }}>
            <button
              className={classes.ButtonGreySmall}
              onClick={async () => {
                this.retrieveBlockData();
                this.setState({
                  transferOrder: {},
                  modal: "none",
                  modalSpinner: false,
                  transactionSuccess: "none",
                });
              }}
            >
              CONTINUE
            </button>
          </div>
        </div>
      );
    }
  };

  orderModalBody = () => {
    const { web3, accounts, newOrder } = this.state;
    const gaEvent = new web3.eth.Contract(GAEventTicket.abi, newOrder.address);

    let ticketsArray = [0];
    for (let i = 1; i <= newOrder.available; i++) {
      ticketsArray.push(i);
    }

    if (this.state.modalSpinner) {
      return (
        <Fragment>
          <div style={{ fontSize: "20px", paddingTop: "60px" }}>
            Your order is being processed
          </div>
          <div style={{ height: "80px", paddingTop: "10px" }}>
            <Spinner />
          </div>
          <div style={{ fontSize: "20px", paddingTop: "100px" }}>
            This can take up to 60 seconds
          </div>
        </Fragment>
      );
    } else if (this.state.transactionSuccess === "none") {
      return (
        <Fragment>
          <div style={{ fontSize: "34px" }}>Ticket Order</div>
          <div style={{ fontSize: "20px" }}>{newOrder.name}</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "50% 48%",
              columnGap: "2%",
            }}
          >
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "16px" }}>Ticket Symbol:</div>
              <div style={{ fontSize: "16px" }}>Tickets Available:</div>
              <div style={{ fontSize: "16px" }}>Ticket Price:</div>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "16px" }}>{newOrder.symbol}</div>
              <div style={{ fontSize: "16px" }}>{newOrder.available}</div>
              <div style={{ fontSize: "16px" }}>
                {newOrder.primaryPrice} wei
              </div>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "60% 38%",
              columnGap: "2%",
              paddingTop: "15px",
            }}
          >
            <div
              style={{
                fontSize: "20px",
                textAlign: "right",
                paddingTop: "8px",
              }}
            >
              Select Ticket Quantity
            </div>
            <div style={{ fontSize: "20px", textAlign: "left" }}>
              <select
                style={{
                  padding: "9px 5px",
                  border: "1px solid lightgrey",
                  boxSizing: "borderBox",
                  width: "105px",
                  lineHeight: "1.75",
                  cursor: "pointer",
                }}
                type="text"
                id="input box time selection"
                value={newOrder.quantity}
                name="tickets"
                onChange={(event) => {
                  let tempOrder = { ...newOrder };
                  tempOrder.quantity = event.target.value;
                  this.setState({ newOrder: tempOrder });
                }}
                required
              >
                {ticketsArray.map((number) => (
                  <option>{number}</option>
                ))}
              </select>
            </div>

            <div style={{ fontSize: "20px", textAlign: "right" }}>
              Purchase Amount:
            </div>
            <div style={{ fontSize: "20px", textAlign: "left" }}>
              {newOrder.quantity * newOrder.primaryPrice} wei
            </div>
          </div>
          <div style={{ paddingTop: "20px" }}>
            <button
              className={
                parseInt(this.state.newOrder.quantity) === 0
                  ? classes.ButtonGreenSmallOpac
                  : classes.ButtonGreenSmall
              }
              disabled={parseInt(this.state.newOrder.quantity) === 0}
              onClick={async () => {
                this.setState({ modalSpinner: true });
                let tempOrder = { ...this.state.newOrder };

                let value = tempOrder.quantity * tempOrder.primaryPrice;

                try {
                  await gaEvent.methods
                    .primaryTransfer(tempOrder.quantity)
                    .send({ from: accounts[0], value: value });
                  this.setState({
                    modalSpinner: false,
                    transactionSuccess: "success",
                  });
                } catch (error) {
                  console.log("Something happened");
                  this.setState({
                    modalSpinner: false,
                    transactionSuccess: "failure",
                  });
                }
              }}
            >
              SUBMIT ORDER
            </button>
          </div>
          <div style={{ paddingTop: "20px" }}>
            <button
              className={classes.ButtonGreySmall}
              onClick={() => {
                this.setState({
                  newOrder: {},
                  modal: "none",
                  modalSpinner: false,
                });
              }}
            >
              CANCEL ORDER
            </button>
          </div>
        </Fragment>
      );
    } else if (this.state.transactionSuccess === "failure") {
      return (
        <div
          style={{
            fontSize: "20px",
            paddingTop: "80px",
            paddingBottom: "40px",
          }}
        >
          Your transaction was not successfull
          <div style={{ paddingTop: "40px" }}>
            <button
              className={classes.ButtonGreySmall}
              onClick={() => {
                this.setState({
                  newOrder: {},
                  modal: "none",
                  modalSpinner: false,
                  transactionSuccess: "none",
                });
              }}
            >
              CONTINUE
            </button>
          </div>
        </div>
      );
    } else {
      return (
        <div
          style={{
            fontSize: "20px",
            paddingTop: "80px",
            paddingBottom: "40px",
          }}
        >
          Your transaction was successfull
          <div style={{ paddingTop: "40px" }}>
            <button
              className={classes.ButtonGreySmall}
              onClick={async () => {
                this.retrieveBlockData();
                this.setState({
                  newOrder: {},
                  display: "myTickets",
                  modal: "none",
                  modalSpinner: false,
                  transactionSuccess: "none",
                });
              }}
            >
              CONTINUE
            </button>
          </div>
        </div>
      );
    }
  };

  createModalBody = () => {
    const { accounts, factory, newEvent } = this.state;
    if (this.state.modalSpinner) {
      return (
        <Fragment>
          <div style={{ fontSize: "20px", paddingTop: "60px" }}>
            Your order is being processed
          </div>
          <div style={{ height: "80px", paddingTop: "10px" }}>
            <Spinner />
          </div>
          <div style={{ fontSize: "20px", paddingTop: "100px" }}>
            This can take up to 60 seconds
          </div>
        </Fragment>
      );
    } else if (this.state.transactionSuccess === "none") {
      return (
        <Fragment>
          <div style={{ fontSize: "30px" }}>GA Ticket Creation</div>
          <div style={{ fontSize: "26px" }}>{newEvent.name}</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "50% 48%",
              columnGap: "2%",
              paddingTop: "5px",
              fontSize: "16px",
            }}
          >
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "20px" }}>Ticket Symbol:</div>
              <div style={{ fontSize: "20px" }}>Ticket Quantity:</div>
              <div style={{ fontSize: "20px" }}>Ticket Price:</div>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "20px" }}>{newEvent.symbol}</div>
              <div style={{ fontSize: "20px" }}>{newEvent.initial}</div>
              <div style={{ fontSize: "20px" }}>{newEvent.price} wei</div>
            </div>
          </div>
          <div style={{ paddingTop: "20px" }}>
            <button
              className={classes.ButtonGreenSmall}
              disabled={false}
              onClick={async () => {
                this.setState({ modalSpinner: true });
                let tempEvent = { ...this.state.newEvent };

                // use "web3" instance to get user accounts associated with given provider
                //const accounts = await web3.eth.getAccounts();
                //this.setState({ accounts: accounts });
                //console.log("Accounts: ", this.state.accounts);

                try {
                  // launches a GATicket event
                  await factory.methods
                    .createGATickets(
                      tempEvent.name,
                      tempEvent.symbol,
                      tempEvent.initial,
                      tempEvent.price
                    )
                    .send({ from: accounts[0] });
                  this.setState({
                    modalSpinner: false,
                    transactionSuccess: "success",
                  });
                } catch (error) {
                  console.log("Something happened");
                  this.setState({
                    modalSpinner: false,
                    transactionSuccess: "failure",
                  });
                }
              }}
            >
              EXECUTE TICKET CREATION
            </button>
          </div>
          <div style={{ paddingTop: "20px" }}>
            <button
              className={classes.ButtonRedSmall}
              onClick={() => {
                this.setState({ modal: "none", modalSpinner: false });
              }}
            >
              EDIT TICKET CREATION
            </button>
          </div>
          <div style={{ paddingTop: "20px" }}>
            <button
              className={classes.ButtonGreySmall}
              onClick={() => {
                this.setState({
                  newEvent: { name: "", symbol: "", initial: "", price: "" },
                  gaTicketWarnings: {
                    nameRemaining: false,
                    name: "true",
                    symbolRemaining: false,
                    symbol: "true",
                    initialRemaining: false,
                    initial: "true",
                    priceRemaining: false,
                    price: "true",
                  },
                  modal: "none",
                  modalSpinner: false,
                  transactionSuccess: "none",
                });
              }}
            >
              CANCEL TICKET CREATION
            </button>
          </div>
        </Fragment>
      );
    } else if (this.state.transactionSuccess === "failure") {
      return (
        <div
          style={{
            fontSize: "20px",
            paddingTop: "80px",
            paddingBottom: "40px",
          }}
        >
          Your transaction was not successfull
          <div style={{ paddingTop: "40px" }}>
            <button
              className={classes.ButtonGreySmall}
              onClick={() => {
                this.setState({
                  newEvent: { name: "", symbol: "", initial: "", price: "" },
                  gaTicketWarnings: {
                    nameRemaining: false,
                    name: "true",
                    symbolRemaining: false,
                    symbol: "true",
                    initialRemaining: false,
                    initial: "true",
                    priceRemaining: false,
                    price: "true",
                  },
                  modal: "none",
                  modalSpinner: false,
                  transactionSuccess: "none",
                });
              }}
            >
              CONTINUE
            </button>
          </div>
        </div>
      );
    } else {
      return (
        <div
          style={{
            fontSize: "20px",
            paddingTop: "80px",
            paddingBottom: "40px",
          }}
        >
          Your transaction was successfull
          <div style={{ paddingTop: "40px" }}>
            <button
              className={classes.ButtonGreySmall}
              onClick={async () => {
                this.retrieveBlockData();
                this.setState({
                  newEvent: { name: "", symbol: "", initial: "", price: "" },
                  display: "myEvents",
                  modal: "none",
                  transactionSuccess: "none",
                  modalSpinner: false,
                  gaTicketWarnings: {
                    nameRemaining: false,
                    name: "true",
                    symbolRemaining: false,
                    symbol: "true",
                    initialRemaining: false,
                    initial: "true",
                    priceRemaining: false,
                    price: "true",
                  },
                });
              }}
            >
              CONTINUE
            </button>
          </div>
        </div>
      );
    }
  };

  createModal = () => {
    if (this.state.modal === "create") {
      return (
        <Fragment>
          <div className={classes.Backdrop}></div>
          <div
            style={{
              transform:
                this.state.modal === "create"
                  ? "translateY(0)"
                  : "translateY(-100vh)",
              opacity: this.state.modal === "create" ? "1" : "0",
              height: "450px",
            }}
            className={classes.Modal}
          >
            {this.createModalBody()}
          </div>
        </Fragment>
      );
    } else return null;
  };

  orderModal = () => {
    if (this.state.modal === "buy") {
      return (
        <Fragment>
          <div className={classes.Backdrop}></div>
          <div
            style={{
              transform:
                this.state.modal === "buy"
                  ? "translateY(0)"
                  : "translateY(-100vh)",
              opacity: this.state.modal === "buy" ? "1" : "0",
              height: "450px",
            }}
            className={classes.Modal}
          >
            {this.orderModalBody()}
          </div>
        </Fragment>
      );
    } else return null;
  };

  transferModal = () => {
    if (this.state.modal === "transfer") {
      console.log("transfer order: ", this.state.transferOrder);
      return (
        <Fragment>
          <div className={classes.Backdrop}></div>
          <div
            style={{
              transform:
                this.state.modal === "transfer"
                  ? "translateY(0)"
                  : "translateY(-100vh)",
              opacity: this.state.modal === "transfer" ? "1" : "0",
              height: "500px",
            }}
            className={classes.Modal}
          >
            {this.transferModalBody()}
          </div>
        </Fragment>
      );
    } else return null;
  };

  render() {
    return (
      <Fragment>
        {this.header}
        <div>{this.accountHeader()}</div>
        <div>{this.createModal()}</div>
        <div>{this.orderModal()}</div>
        <div>{this.transferModal()}</div>
        <div className={classes.MainDisplay}>
          {this.presentationDisplay()}
          {this.eventsDisplay()}
          {this.issueTicketsDisplay()}
          {this.myEventsDisplay()}
          {this.myTicketsDisplay()}
          {this.exchangeDisplay()}
        </div>
      </Fragment>
    );
  }
}

export default App;
