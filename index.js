const express = require('express');
const bodyParser = require("body-parser");
const https = require('https');
const cheerio = require("cheerio");
const fs = require('fs');
const $ = cheerio.load(fs.readFileSync(__dirname + '/index.html'));
const path = require('path');
const mailchimpApiKey = process.env['mailchimp_api_key'];
const listId = process.env['audience_id'];
const mailchimpServer = process.env['mailchimp_server'];
const md5 = require("md5");


const mailchimp = require("@mailchimp/mailchimp_marketing");

mailchimp.setConfig({
  apiKey: mailchimpApiKey,
  server: mailchimpServer,
});

async function run() {
  const response = await mailchimp.ping.get();
  console.log(response);
}

run();


const app = express();
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static(path.join(__dirname, 'public')));

app.get("/", (req, res) => {
  res.sendFile(__dirname + '/index.html');
});


app.post("/", (req, res) => {

  var firstName = req.body.firstName;
  var lastName = req.body.lastName;
  var email = req.body.email;

  // Check if user is already subscribed
  const subscriberHash = md5(email.toLowerCase());

  async function run() {
    try {
      const response = await mailchimp.lists.getListMember(
        listId,
        subscriberHash
      );

      console.log(`This user's subscription status is ${response.status}.`);
      $(".outcome").text("Already Subscribed").addClass("text-secondary");
      res.send($.root().html());
    } catch (e) {
      if (e.status === 404) {
        console.error(`This email is not subscribed to this list`, e);
        // Add user
        const subscribingUser = {
          firstName: firstName,
          lastName: lastName,
          email: email
        };

        async function addUser() {
          try {
            const response_2 = await mailchimp.lists.addListMember(listId, {
              email_address: subscribingUser.email,
              status: "subscribed",
              merge_fields: {
                FNAME: subscribingUser.firstName,
                LNAME: subscribingUser.lastName
              }
            });
            console.log(`Successfully added contact as an audience member. The contact's id is ${response_2.id}.`)
            $(".outcome").text("Success").addClass("text-success");
            res.send($.root().html());
          } catch (e) {
            if (e.status === 404) {
              console.log("There was a problem");
              $(".outcome").text("There was a problem").addClass("text-warning");
              res.send($.root().html());
            }
          }
        }
        addUser();
      }
    }
  }
  run();
});

// res.send($.root().html());
// res.sendFile(__dirname + '/success.html');



app.listen(3000, () => {
  console.log('server started');
});