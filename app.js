var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors')

const { addDoc, orderBy, getDocs } = require('@firebase/firestore');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBdtuKdg4tN3XNH8IddEc9B6Ad6eTnsxJ4",
  authDomain: "swiot-backend.firebaseapp.com",
  projectId: "swiot-backend",
  storageBucket: "swiot-backend.appspot.com",
  messagingSenderId: "436810103863",
  appId: "1:436810103863:web:121902b9e3e51c30c893b2",
  measurementId: "G-S7Q04KBLL4"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp)
const dbRef = collection(db, "measurements");
var count = 0;

const addData = (payload) => {
  if(payload) {
    try {
      addDoc(dbRef, {payload})
      .then(docRef => {
        count++;
        console.log("Document No. " + count + " has been added successfully")
      })
    } catch (error) {
      console.log("There was an error adding document: ", error)
    }
  }
}

var app = express();

// view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors({
  origin: '*'
}))

app.listen(4000, () => {
  ClientRunner();
  console.log("Node Backend is up and running!")
})

app.get("/data", cors(), async (req, res) => {
  const dataCollection = [];
  console.log("Measurement Data has been requested!")

  const snapshot = await getDocs(dbRef, orderBy('timestamp', 'desc'));

  if (!snapshot) {
    console.log("No such document...")
  } else {
    snapshot.docs.map(doc => {
      dataCollection.push(doc.data())
  })

    // console.log(dataCollection)
    res.send(dataCollection);
  }
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

async function ClientRunner() {
  var mqtt = require('mqtt')

const data = {
  timestamp: null,
  temperature: 0.0,
  humidity: 0.0
}


var options = {
  host: '71f8087751ae4fc6b20ce20b4820d6e9.s2.eu.hivemq.cloud',
  port: 8883,
  protocol: 'mqtts',
  username: 'swiot',
  password: 'Mysecretpassword!',
  keepAlive: true
}
var client = mqtt.connect(options);

// setup the callbacks
client.on('connect', function () {
  console.log('✅ Connected to the HiveMQ Broker!');
});

client.on('error', function (error) {
  console.log('🚨 ' + error);
});

client.subscribe("data/temperature") //have the backend subscribe to temp
client.subscribe("data/humidity") //have the backend subscript to humidity

client.on('message', function (topic, message) {
    var unix_time = Timestamp.fromDate(new Date())
    data.timestamp = timeConverter(unix_time.seconds)
    handleTopic(topic, message)
    addData(data);
});

function timeConverter(UNIX_timestamp){
  var a = new Date(UNIX_timestamp * 1000);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = a.getMinutes();
  if(min < 10) {min = "0" + min;}
  var sec = a.getSeconds();
  if(sec < 10) {sec = "0" + sec;}
  var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
  return time;
}

  const handleTopic = (topic, message) => {
    switch (topic) {
      case 'data/humidity': 
          data.humidity = (parseFloat(message.toString()))     
          console.log("Humidity: ", parseFloat(message.toString()) + "%" )
          break;
      case 'data/temperature': 
          data.temperature = (parseFloat(message.toString()))
          console.log("Temperature: ", parseFloat(message.toString()) + "°C")
          break;
      }
  }
}

module.exports = app;
