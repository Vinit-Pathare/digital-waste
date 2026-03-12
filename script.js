```javascript
/* ==============================
GLOBAL VARIABLES
============================== */

let currentUser = null;
let isAdmin = false;
let complaintMarkers = [];
let map;
let truckMarker;


/* ==============================
AUTHENTICATION
============================== */

function loginUser() {

const username = document.getElementById("loginUsername").value;
const password = document.getElementById("loginPassword").value;

if (username === "" || password === "") {
document.getElementById("loginMessage").innerText =
"Please enter username and password";
return;
}

db.collection("users")
.where("username", "==", username)
.where("password", "==", password)
.get()
.then((snapshot) => {

if (snapshot.empty) {

document.getElementById("loginMessage").innerText =
"Invalid Username or Password";

} else {

currentUser = username;

if (username === "admin") {
isAdmin = true;
}

document.getElementById("welcomeMessage").innerText =
"Welcome " + username;

loadComplaints();
}

})
.catch((error) => {
console.error("Login Error:", error);
});

}



function registerUser() {

const username = document.getElementById("username").value;
const password = document.getElementById("password").value;

if (username === "" || password === "") {

document.getElementById("message").innerText =
"Please enter username and password";

return;
}

db.collection("users")
.add({
username: username,
password: password,
createdAt: new Date(),
})
.then(() => {

document.getElementById("message").innerText =
"User Registered Successfully";

document.getElementById("username").value = "";
document.getElementById("password").value = "";

loadUserCount();

})
.catch((error) => {
console.error("Register Error:", error);
});

}



/* ==============================
PAGE LOAD
============================== */

window.onload = function () {

requestNotificationPermission();

initMap();

startVehicleTracking();

loadUserCount();

loadPickups();

};



/* ==============================
MAP SYSTEM
============================== */

function initMap() {

map = L.map("map").setView([18.5204, 73.8567], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
attribution: "© OpenStreetMap",
}).addTo(map);

}



function startVehicleTracking() {

const truckIcon = L.icon({
iconUrl:
"https://cdn-icons-png.flaticon.com/512/1995/1995505.png",
iconSize: [40, 40],
});

truckMarker = L.marker([18.5204, 73.8567], {
icon: truckIcon,
}).addTo(map);

const route = [
[18.5204, 73.8567],
[18.522, 73.86],
[18.525, 73.865],
[18.528, 73.87],
];

let i = 0;

setInterval(() => {

truckMarker.setLatLng(route[i]);

i++;

if (i >= route.length) {
i = 0;
}

}, 3000);

}



/* ==============================
COMPLAINT SYSTEM
============================== */

function addComplaint() {

if (!currentUser) {
alert("Please login first");
return;
}

const text = document.getElementById("complaintText").value;
const category = document.getElementById("category").value;

if (text === "") {
alert("Enter complaint");
return;
}

getUserLocation(function (lat, lng) {

db.collection("complaints")
.add({
text: text,
category: category,
lat: lat,
lng: lng,
status: "Pending",
user: currentUser,
date: new Date(),
})
.then(() => {

alert("Complaint submitted");

document.getElementById("complaintText").value = "";

loadComplaints();

});

});

}



function loadComplaints() {

const list = document.getElementById("complaintList");

list.innerHTML = "";

complaintMarkers.forEach((m) => map.removeLayer(m));

complaintMarkers = [];

let query;

if (isAdmin) {
query = db.collection("complaints");
} else {
query = db.collection("complaints")
.where("user", "==", currentUser);
}

query.get().then((snapshot) => {

snapshot.forEach((doc) => {

const c = doc.data();

const li = document.createElement("li");

li.innerText =
c.text +
" | " +
c.category +
" | " +
c.status +
" | User: " +
c.user;

if (isAdmin && c.status !== "Resolved") {

const btn = document.createElement("button");

btn.innerText = "Resolve";

btn.onclick = function () {
resolveComplaint(doc.id);
};

li.appendChild(btn);

}

list.appendChild(li);

addComplaintMarker(c);

});

document.getElementById("totalComplaints").innerText =
snapshot.size;

});

}



/* ==============================
MAP MARKERS
============================== */

function addComplaintMarker(c) {

const marker = L.marker([c.lat, c.lng]).addTo(map);

marker.bindPopup(
"<b>Complaint:</b> " +
c.text +
"<br><b>Category:</b> " +
c.category +
"<br><b>Status:</b> " +
c.status +
"<br><b>User:</b> " +
c.user
);

complaintMarkers.push(marker);

}



/* ==============================
ADMIN
============================== */

function resolveComplaint(id) {

db.collection("complaints")
.doc(id)
.update({
status: "Resolved",
})
.then(() => {
loadComplaints();
});

}



/* ==============================
UTILITY FUNCTIONS
============================== */

function getUserLocation(callback) {

if (navigator.geolocation) {

navigator.geolocation.getCurrentPosition((position) => {

const lat = position.coords.latitude;
const lng = position.coords.longitude;

callback(lat, lng);

});

} else {

alert("Location not supported");

}

}
```
