const express = require('express');
const app = express();
var bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const schedule = require('node-schedule');
var admin = require("firebase-admin");


var serviceAccount = require("C:\\Users\\RodrigoFernandes\\Documents\\projects\\rock_school_manager_backend\\firebase_private_key\\clavedosul-43866-firebase-adminsdk-vf4yn-41a142f068.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://clavedosul-43866-default-rtdb.europe-west1.firebasedatabase.app"
});
var db = admin.database();

/* cron.schedule("* * * * *", () => {
    
}).start(); */

app.post("/deviceRegistration", (req, res) => {
    var ref = db.ref("device_registration_token");
    ref.once("value", async function (snapshot) {
        let newToken = req.body.registration_token;
        let tokensList = snapshot.val();
        if (tokensList.includes(newToken)) {
            res.status(400);
            res.json({
                result: "Failure",
                message: "Token already exists"
            });
        } else {
            let numChildren = parseInt(snapshot.numChildren());
            let next = (numChildren == 0) ? 0 : numChildren++
            ref.child("" + next).set(req.body.registration_token, function result(a) {
                res.status(201);
                res.json({
                    result: "Success",
                    message: "Token registered"
                });
            });
        }
    });
})

app.post("/userRegistration", (req, res) => {
    let body = req.body;
    var ref = db.ref("users");
    ref.once("value", async function (snapshot) {
        let users = snapshot.val()
        var foundOne = false;
        if (users != null) {
            users.forEach(element => {
                if (element.email == body.email) {
                    res.status(400);
                    res.json({
                        result: "Failure",
                        message: "User already exists"
                    });
                    foundOne = true
                    return;
                }
            });
        }
        
        if (!foundOne) {
            admin.auth()
                .createUser({
                    email: req.body.email,
                    emailVerified: false,
                    phoneNumber: req.body.phoneNumber,
                    password: 'secretPassword',
                    displayName: req.body.name + req.body.surname,
                    disabled: false,
                })
                .then((userRecord) => {
                    // See the UserRecord reference doc for the contents of userRecord.
                    console.log('Successfully created new user:', userRecord.uid);
                    let numChildren = parseInt(snapshot.numChildren());
                    let next = (numChildren == 0) ? 0 : numChildren++
                    ref.child("" + next).set(req.body, function result(a) {
                        res.status(201);
                        res.json({
                            result: "Success",
                            message: "User created"
                        });
                    })
                })
                .catch((error) => {
                    res.status(400);
                        res.json(error);
                });

        }

    });
})

/* const job = schedule.scheduleJob("* * * * *", function () { https://crontab.guru/examples.html
    console.log("Check for payments due")
    var ref = db.ref("users");
    // ref.on for listening to changes
    ref.once("value", async function (snapshot) {
        console.log(snapshot.val());
    });
}); */

app.listen(3000, () => console.log('Example app is listening on port 3000.'));