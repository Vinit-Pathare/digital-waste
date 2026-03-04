/* ---------- GLOBAL VARIABLES ---------- */
let users = [];
let currentUser = null;
let complaints = [];
let pickups = [];
let complaintMarkers = [];
let garbageIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/565/565491.png",
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});
let pendingIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/565/565491.png",
  iconSize: [35, 35],
  iconAnchor: [17, 35],
});

let resolvedIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/190/190411.png",
  iconSize: [35, 35],
  iconAnchor: [17, 35],
});
let liveLat = null;
let liveLng = null;

/* ---------- PAGE LOAD ---------- */
window.onload = function () {
  initMap();
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      liveLat = position.coords.latitude;
      liveLng = position.coords.longitude;

      map.setView([liveLat, liveLng], 16);

      L.marker([liveLat, liveLng])
        .addTo(map)
        .bindPopup("You are here")
        .openPopup();
    });
  } else {
    alert("Geolocation not supported!");
  }

  // Load users
  const savedUsers = localStorage.getItem("users");
  if (savedUsers) {
    users = JSON.parse(savedUsers);
  }
  document.getElementById("count").innerText = users.length;

  // Load complaints
  const savedComplaints = localStorage.getItem("complaints");
  if (savedComplaints) {
    try {
      complaints = JSON.parse(savedComplaints);
      if (!Array.isArray(complaints)) complaints = [];
    } catch (e) {
      complaints = [];
    }
    renderComplaints();
  }

  // Load pickups
  const savedPickups = localStorage.getItem("pickups");
  if (savedPickups) {
    try {
      pickups = JSON.parse(savedPickups);
      if (!Array.isArray(pickups)) pickups = [];
    } catch (e) {
      pickups = [];
    }
    renderPickups();
  }

  // Load current user
  const savedCurrentUser = localStorage.getItem("currentUser");
  if (savedCurrentUser) {
    currentUser = savedCurrentUser;
    document.getElementById("welcomeMessage").innerText =
      currentUser === "admin" ? "Welcome Admin" : "Welcome, " + currentUser;

    if (currentUser === "admin") showAdminPanel();
  }
};

/* ---------- MAP ---------- */
/* ---------- MAP ---------- */
let map;
let vehicleMarker;
let route = [
  [18.5204, 73.8567],
  [18.522, 73.8585],
  [18.5245, 73.86],
  [18.5265, 73.8625],
  [18.528, 73.865],
];

let currentPoint = 0;
let progress = 0;

function initMap() {
  map = L.map("map").setView([18.5204, 73.8567], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  vehicleMarker = L.marker(route[0]).addTo(map);

  L.polyline(route, { color: "green" }).addTo(map);

  animateVehicle();
}

function animateVehicle() {
  setInterval(() => {
    let start = route[currentPoint];
    let end = route[currentPoint + 1];

    if (!end) {
      currentPoint = 0;
      progress = 0;
      return;
    }

    progress += 0.02; // smoothness speed (increase for faster)

    let lat = start[0] + (end[0] - start[0]) * progress;
    let lng = start[1] + (end[1] - start[1]) * progress;

    vehicleMarker.setLatLng([lat, lng]);

    if (progress >= 1) {
      progress = 0;
      currentPoint++;
    }
  }, 100); // smaller = smoother
}

/* ---------- REGISTER ---------- */
function registerUser() {
  const name = document.getElementById("username").value.trim();
  if (!name) return showMessage("message", "Enter name.");

  if (users.includes(name))
    return showMessage("message", "User already exists!");

  users.push(name);
  localStorage.setItem("users", JSON.stringify(users));

  document.getElementById("count").innerText = users.length;
  showMessage("message", "Registered Successfully!");
  document.getElementById("username").value = "";
}

/* ---------- LOGIN ---------- */
function loginUser() {
  const name = document.getElementById("loginUsername").value.trim();
  if (!name) return showMessage("loginMessage", "Enter username!");

  if (name === "admin") {
    currentUser = "admin";
    localStorage.setItem("currentUser", currentUser);
    document.getElementById("welcomeMessage").innerText = "Welcome Admin";
    showMessage("loginMessage", "Admin Login Successful!");
    showAdminPanel();
    return;
  }

  if (!users.includes(name))
    return showMessage("loginMessage", "User not found!");

  currentUser = name;
  localStorage.setItem("currentUser", currentUser);
  document.getElementById("welcomeMessage").innerText =
    "Welcome, " + currentUser;

  showMessage("loginMessage", "Login Successful!");
  document.getElementById("adminPanel").style.display = "none";
}

/* ---------- ADD COMPLAINT ---------- */
function addComplaint() {
  if (!currentUser) return alert("Login first!");

  const text = document.getElementById("complaintText").value.trim();
  const category = document.getElementById("category").value;
  if (!text) return showMessage("complaintMsg", "Enter complaint.");

  // Random location near route (demo sathi)
  const randomLat = 18.52 + Math.random() * 0.01;
  const randomLng = 73.85 + Math.random() * 0.01;

  const newComplaint = {
    text,
    category,
    user: currentUser,
    time: new Date().toISOString(),
    lat: randomLat,
    lng: randomLng,
  };

  complaints.push(newComplaint);
  localStorage.setItem("complaints", JSON.stringify(complaints));

  renderComplaints();
  addComplaintMarker(newComplaint);

  document.getElementById("complaintText").value = "";
  showMessage("complaintMsg", "Complaint Submitted!");
}

/* ---------- RENDER COMPLAINTS ---------- */
function renderComplaints() {
  const list = document.getElementById("complaintList");
  list.innerHTML = "";

  complaints.forEach((c, index) => {
    const li = document.createElement("li");

    li.setAttribute("data-user", c.user);
    li.setAttribute("data-time", c.time);

    li.innerHTML = `
      ${c.text} | ${c.category} | ${c.time}
      | by: ${c.user}
      | Status: ${c.status}
      ${
        currentUser === "admin"
          ? `<button onclick="toggleStatus(${index})">Change Status</button>`
          : ""
      }
      <button onclick="deleteComplaint(${index})">Delete</button>
    `;

    list.appendChild(li);
  });

  updateComplaintCounter();

  // Clear old markers
  complaintMarkers.forEach((m) => map.removeLayer(m));
  complaintMarkers = [];

  // Re-add markers
  complaints.forEach((c) => {
    if (c.lat && c.lng) {
      addComplaintMarker(c);
    }
  });
}

/* ---------- DELETE COMPLAINT ---------- */
function deleteComplaint(index) {
  const c = complaints[index];

  if (currentUser === "admin" || currentUser === c.user) {
    complaints.splice(index, 1);
    localStorage.setItem("complaints", JSON.stringify(complaints));
    renderComplaints();
  } else {
    alert("You can delete only your own complaints!");
  }
}

/* ---------- ADD PICKUP ---------- */
function addComplaint() {
  if (!currentUser) return alert("Login first!");

  const text = document.getElementById("complaintText").value.trim();
  const category = document.getElementById("category").value;
  const photoFile = document.getElementById("photoInput").files[0];

  if (!text) return alert("Enter complaint!");
  if (!liveLat || !liveLng) return alert("Location not detected yet!");
  if (!photoFile) return alert("Please upload photo for proof!");

  const reader = new FileReader();

  reader.onload = function (e) {
    const photoData = e.target.result; // 🔥 VERY IMPORTANT LINE

    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${liveLat}&lon=${liveLng}`,
    )
      .then((res) => res.json())
      .then((data) => {
        const address =
          data && data.display_name ? data.display_name : "Location captured";

        const newComplaint = {
          text,
          category,
          user: currentUser,
          time: new Date().toISOString(),
          lat: liveLat,
          lng: liveLng,
          address: address,
          photo: photoData,
          status: "Pending",
        };

        complaints.push(newComplaint);
        localStorage.setItem("complaints", JSON.stringify(complaints));

        renderComplaints();
        updateDashboardCounts();

        alert("Complaint Submitted!");
      })
      .catch((error) => {
        console.log("Address fetch error:", error);

        const newComplaint = {
          text,
          category,
          user: currentUser,
          time: new Date().toISOString(),
          lat: liveLat,
          lng: liveLng,
          address: "Location captured (address unavailable)",
          photo: photoData,
          status: "Pending",
        };

        complaints.push(newComplaint);
        localStorage.setItem("complaints", JSON.stringify(complaints));

        renderComplaints();
        updateDashboardCounts();

        alert("Complaint Submitted (Address unavailable)");
      });
  };

  reader.readAsDataURL(photoFile);
}
/* ---------- RENDER PICKUPS ---------- */
function renderPickups() {
  const list = document.getElementById("pickupList");
  list.innerHTML = "";

  pickups.forEach((p, index) => {
    const li = document.createElement("li");

    li.innerHTML = `
      ${p.date} | ${p.type} | by: ${p.user}
      <button onclick="deletePickup(${index})">Delete</button>
    `;

    list.appendChild(li);
  });

  updatePickupCounter();
}

/* ---------- DELETE PICKUP ---------- */
function deletePickup(index) {
  if (currentUser === "admin" || pickups[index].user === currentUser) {
    pickups.splice(index, 1);
    localStorage.setItem("pickups", JSON.stringify(pickups));
    renderPickups();
  } else {
    alert("You can delete only your own pickups!");
  }
}

/* ---------- ADMIN PANEL ---------- */
function showAdminPanel() {
  document.getElementById("adminPanel").style.display = "block";
  document.getElementById("adminUsers").innerText = users.length;
  document.getElementById("adminComplaints").innerText = complaints.length;
  document.getElementById("adminPickups").innerText = pickups.length;

  const filter = document.getElementById("userFilter");
  filter.innerHTML = '<option value="all">Show All</option>';

  users.forEach((user) => {
    const option = document.createElement("option");
    option.value = user;
    option.textContent = user;
    filter.appendChild(option);
  });
}

/* ---------- COUNTERS ---------- */
function updateComplaintCounter() {
  document.getElementById("totalComplaints").innerText = complaints.length;
  if (currentUser === "admin")
    document.getElementById("adminComplaints").innerText = complaints.length;
}

function updatePickupCounter() {
  document.getElementById("totalPickups").innerText = pickups.length;
  if (currentUser === "admin")
    document.getElementById("adminPickups").innerText = pickups.length;
}

/* ---------- HELPER ---------- */
function showMessage(id, msg) {
  document.getElementById(id).innerText = msg;
}
//Complaintmarker
function addComplaintMarker(c) {
  if (!map || !c.lat || !c.lng) return;

  // Status icon select
  const iconToUse = c.status === "Resolved" ? resolvedIcon : pendingIcon;

  // Marker create
  const marker = L.marker([c.lat, c.lng], {
    icon: iconToUse,
  }).addTo(map);

  // Photo check
  const photoHTML = c.photo
    ? `<img src="${c.photo}" width="160" style="border-radius:8px;"><br><br>`
    : `<i>No photo uploaded</i><br><br>`;

  // Address check
  const addressText = c.address ? c.address : "Address not available";

  // Popup content
  const popupContent = `
    <div style="width:200px;">
      <b>Category:</b> ${c.category} <br>
      <b>Description:</b> ${c.text} <br>
      <b>By:</b> ${c.user} <br>
      <b>Status:</b> ${c.status} <br><br>

      <b>Address:</b><br>
      ${addressText} <br><br>

      ${photoHTML}

      <a href="https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}" 
         target="_blank"
         style="color:blue; font-weight:bold;">
         🚗 Navigate
      </a>
    </div>
  `;

  marker.bindPopup(popupContent);

  complaintMarkers.push(marker);
}
//togglestatus
function toggleStatus(index) {
  complaints[index].status =
    complaints[index].status === "Pending" ? "Resolved" : "Pending";

  localStorage.setItem("complaints", JSON.stringify(complaints));

  renderComplaints();
}
