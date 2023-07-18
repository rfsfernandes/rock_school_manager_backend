const express = require('express');
const app = express();

var admin = require("firebase-admin");

var serviceAccount = require("C:\\Users\\RodrigoFernandes\\Documents\\projects\\rock_school_manager_backend\\firebase_private_key\\clavedosul-43866-firebase-adminsdk-vf4yn-41a142f068.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://clavedosul-43866-default-rtdb.europe-west1.firebasedatabase.app"
});

app.get('/', (req, res) => {
    res.send('Successful response.');
});

var db = admin.database();
var ref = db.ref("users");
ref.on("value", function (snapshot) {
    console.log(snapshot.val());
});

app.listen(3000, () => console.log('Example app is listening on port 3000.'));