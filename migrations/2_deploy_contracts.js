const { default: Web3 } = require("web3");

//const Token = artifacts.require("Token");
const Exchange = artifacts.require("Exchange");
const Factory = artifacts.require("EventTicketingFactory");
//const GAEventTickets = artifacts.require("GAEventTickets");

module.exports = async function (deployer) {
  const accounts = await web3.eth.getAccounts();
  const feeAccount = accounts[0];
  const feePercentage = 10;

  console.log("Accounts: ", accounts);

  //await deployer.deploy(Token);
  await deployer.deploy(Exchange, feeAccount, feePercentage);
  await deployer.deploy(Factory);
};
