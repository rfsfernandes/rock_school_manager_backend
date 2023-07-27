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
    let ref = db.ref("device_registration_token");
    let newToken = req.body.registratioNtoken;
    if (newToken == null) { sendMissingValueResponse("registration_token", res); return; }
    ref.once("value", async function (snapshot) {
        let tokensList = snapshot.val();
        if (tokensList == null) {
            ref.child("" + 0).set(newToken, function result(a) {
                res.status(201);
                res.json({
                    result: "Success",
                    message: "Token registered"
                });
            });
        } else {
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
        }

    });
})

app.post("/userRegistration", (req, res) => {
    let body = req.body;
    let ref = db.ref("users");
    ref.once("value", async function (snapshot) {
        let users = snapshot.val()
        var foundOne = false;
        if (users != null) {
            users.forEach(element => {
                if (element.email == body.email) {
                    res.status(400);
                    res.json({
                        result: "Failure",
                        message: "Este utilizador já existe."
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
                            message: "Utilizador criado com sucesso."
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

app.post("/notifyForPayment", (req, res) => {
    let amount = req.body.amount;
    if (amount == null) { sendMissingValueResponse("amount", res); return; }
    let entity = req.body.entity;
    if (entity == null) { sendMissingValueResponse("entity", res); return; }
    let mbReference = req.body.ref;
    if (mbReference == null) { sendMissingValueResponse("ref", res); return; }
    let registToken = req.body.registrationToken;
    if (registToken == null) { sendMissingValueResponse("registrationToken", res); return; }
    let message = {
        data: {
            amount: amount,
            entity: entity,
            reference: mbReference
        },
        token: registToken
    };
    admin.messaging().send(message)
        .then((response) => {
            // Response is a message ID string.
            console.log('Successfully sent message:', response);
            res.status(200);
            res.json({
                result: "Success",
                message: "Notificação enviada com sucesso!"
            });
        })
        .catch((error) => {
            res.status(400);
            res.json(error);
        });
})

app.post("/notifyAll", (req, res) => {
    let ref = db.ref("device_registration_token");
    let messagePosted = req.body.message;
    if (messagePosted == null) { sendMissingValueResponse("message", res); return; }
    let tokensList = req.body.registrationTokenList;
    if (tokensList != null && tokensList.length != 0) {
        let message = {
            data: {
                content: messagePosted
            },
            tokens: tokensList
        };
        sendNotification(message, tokensList, admin, res)

    } else {
        ref.once("value", async function (snapshot) {
            let tokensList = snapshot.val();
            if (tokensList == null || tokensList.length === 0) {
                console.log("empty token list");
                res.status(200);
                res.json({
                    result: "Success",
                    message: "Sem dispositivos registados. Envio de notificação falhou."
                });
                return;
            }
            let message = {
                data: {
                    content: messagePosted
                },
                tokens: tokensList
            };
            sendNotification(message, tokensList, admin, res)
        });
    }

})

function isTimeEqual(object1, object2) {
    return object1.hours == object2.hours && object1.minutes == object2.minutes;
}

app.post("/newClass", (req, res) => {
    let refClasses = db.ref("classes");

    refClasses.once("value", async function (snapshot) {
        let classes = snapshot.val();
        if (snapshot.val() != null) {            
            let currentClass = req.body;
            var foundSame = false;
            classes.forEach(element => {
                if (element.teacher == currentClass.teacher && isTimeEqual(element.time, currentClass.time) && element.dayOfWeek == currentClass.dayOfWeek) {
                    foundSame = true;
                    console.log("Ja ha uma")
                    return;
                }
            })
            if (foundSame) {
                console.log("Ja ha uma")
                res.status(400);
                res.json({
                    result: "Failure",
                    message: "Já existe uma aula para este dia, hora e professor."
                });
                return;
            }
        }
        let numChildren = (snapshot == null) ? 0 : parseInt(snapshot.numChildren());
        let lastId = (classes != null) ? classes[classes.length - 1].id : 0
        let newId = lastId + 1;
        let next = (numChildren == 0) ? 0 : numChildren++;
        req.body.id = newId;
        refClasses.child("" + next).set(req.body, function result(a) {
            let students = req.body.students;
            if (students != null) {
                students.forEach(element => {
                    let refStudents = db.ref("users/" + element + "/classes");

                    refStudents.once("value", async function (snapshot) {
                        if (snapshot.val() != null) {
                            var foundIndex = -1;
                            snapshot.val().forEach(function (element, index) {
                                if (element.id == req.body.id) {
                                    foundIndex = index
                                    return
                                }
                            })

                            var next = -1;
                            if (foundIndex == -1) {
                                let numChildrenClass = (snapshot == null) ? 0 : parseInt(snapshot.numChildren());
                                next = (numChildrenClass === 0) ? 0 : numChildrenClass++;
                            } else {
                                next = foundIndex
                            }
                            refStudents.child("" + next).set(req.body, function result(a) {

                            })
                        } else {
                            refStudents.child("" + 0).set(req.body, function result(a) {

                            })
                        }
                    })
                });
            }
            res.status(201);
            res.json({
                result: "Success",
                message: "Aula criada com sucesso."
            });
        })

    })

})

function sendNotification(message, tokensList, admin, res) {
    admin.messaging().sendEachForMulticast(message)
        .then((response) => {
            console.log(response.successCount + ' messages were sent successfully');
            res.status(200);
            res.json({
                result: "Success",
                message: tokensList.length + " Notificações enviadas com sucesso!"
            });
        });
}

function sendMissingValueResponse(missingValue, res) {
    res.status(400)
    res.json({
        result: "Failure",
        message: "O campo " + missingValue + " está em falta."
    })
}

/* const job = schedule.scheduleJob("* * * * *", function () { https://crontab.guru/examples.html
    console.log("Check for payments due")
    var ref = db.ref("users");
    // ref.on for listening to changes
    ref.once("value", async function (snapshot) {
        console.log(snapshot.val());
    });
}); */

app.listen(3000, () => console.log('Example app is listening on port 3000.'));