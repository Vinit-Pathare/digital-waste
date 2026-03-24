/* ==============================
GLOBAL VARIABLES
============================== */

let currentUser = null;
let isAdmin = false;
let complaintMarkers = [];
let map;
let truckMarker;
let heatLayer;
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
        document.getElementById("authSection").style.display = "none";
        document.getElementById("mainSection").style.display = "block";
        //logout button show
        document.getElementById("logoutBtn").style.display = "block";

        // 🔴 RESET roles
        isAdmin = false;

        // ✅ ADMIN LOGIN
        if (username === "admin") {
          isAdmin = true;

          document.getElementById("adminPanel").style.display = "block";
          document.getElementById("heatmapBtn").style.display = "block";
        }

        // 🚚 DRIVER LOGIN
        if (username === "driver") {
          startDriverTracking();

          alert("Driver tracking started 🚚");

          // driver ला admin panel नको
          document.getElementById("adminPanel").style.display = "none";
          document.getElementById("heatmapBtn").style.display = "none";
        }

        // 👤 NORMAL USER
        if (username !== "admin" && username !== "driver") {
          document.getElementById("adminPanel").style.display = "none";
          document.getElementById("heatmapBtn").style.display = "none";
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
    iconUrl: "https://cdn-icons-png.flaticon.com/512/1995/1995505.png",
    iconSize: [40, 40],
  });

  truckMarker = L.marker([18.5204, 73.8567], {
    icon: truckIcon,
  }).addTo(map);

  // 🔥 REALTIME TRACKING FROM FIRESTORE (ADMIN / USER VIEW)
  db.collection("truck")
    .doc("live")
    .onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        truckMarker.setLatLng([data.lat, data.lng]);
      }
    });
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
  let query;

  if (isAdmin) {
    query = db.collection("complaints");
  } else {
    query = db.collection("complaints").where("user", "==", currentUser);
  }

  query.onSnapshot((snapshot) => {
    const list = document.getElementById("complaintList");

    list.innerHTML = "";

    complaintMarkers.forEach((m) => map.removeLayer(m));
    complaintMarkers = [];

    snapshot.forEach((doc) => {
      const c = doc.data();

      const li = document.createElement("li");

      li.innerText =
        c.text + " | " + c.category + " | " + c.status + " | User: " + c.user;

      if (isAdmin && c.status !== "Resolved") {
        // Resolve button
        const btn = document.createElement("button");
        btn.innerText = "Resolve";

        btn.onclick = function () {
          resolveComplaint(doc.id);
        };

        li.appendChild(btn);

        // ⭐ Navigate button
        const navBtn = document.createElement("button");
        navBtn.innerText = "Navigate";

        navBtn.onclick = function () {
          const url =
            "https://www.google.com/maps/dir/?api=1&destination=" +
            c.lat +
            "," +
            c.lng;

          window.open(url, "_blank");
        };

        li.appendChild(navBtn);
      }

      list.appendChild(li);

      addComplaintMarker(c);
    });

    document.getElementById("totalComplaints").innerText = snapshot.size;
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
      c.user,
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
USER COUNT
============================== */

function loadUserCount() {
  db.collection("users")
    .get()
    .then((snapshot) => {
      document.getElementById("count").innerText = snapshot.size;
    });
}

/* ==============================
PICKUP SYSTEM
============================== */

function addPickup() {
  const date = document.getElementById("pickupDate").value;
  const type = document.getElementById("pickupType").value;

  if (date === "") {
    alert("Select date");
    return;
  }

  db.collection("pickups")
    .add({
      date: date,
      type: type,
    })
    .then(() => {
      alert("Pickup reminder added");

      loadPickups();
    });
}

function loadPickups() {
  const list = document.getElementById("pickupList");

  list.innerHTML = "";

  db.collection("pickups")
    .get()
    .then((snapshot) => {
      snapshot.forEach((doc) => {
        const p = doc.data();

        const li = document.createElement("li");

        li.innerText = p.type + " | " + p.date;

        list.appendChild(li);
      });

      document.getElementById("totalPickups").innerText = snapshot.size;
    });
}

/* ==============================
PHOTO UPLOAD (TEMP)
============================== */

function uploadPhoto() {
  alert("Photo upload feature coming soon");
}

/* ==============================
LOCATION
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

function generateHeatmap() {
  let heatData = [];

  db.collection("complaints")
    .get()
    .then((snapshot) => {
      snapshot.forEach((doc) => {
        const c = doc.data();

        if (c.lat && c.lng) {
          heatData.push([c.lat, c.lng, 0.5]);
        }
      });

      if (heatLayer) {
        map.removeLayer(heatLayer);
      }

      heatLayer = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
      }).addTo(map);
    });
}

function startDriverTracking() {
  if (!navigator.geolocation) {
    alert("Geolocation not supported");
    return;
  }

  navigator.geolocation.watchPosition((position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    db.collection("truck").doc("live").set({
      lat: lat,
      lng: lng,
      updatedAt: new Date(),
    });

    console.log("Driver location:", lat, lng);
  });
}
function logoutUser() {
  currentUser = null;

  // sections toggle
  document.getElementById("mainSection").style.display = "none";
  document.getElementById("authSection").style.display = "block";

  document.getElementById("logoutBtn").style.display = "none";

  // clear inputs
  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPassword").value = "";

  document.getElementById("welcomeMessage").innerText = "";
}
