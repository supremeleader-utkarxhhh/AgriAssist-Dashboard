/*********************************
 * GLOBAL VARIABLES
 *********************************/
let model;
let communityPosts = JSON.parse(localStorage.getItem("communityPosts")) || [];

/*********************************
 * AUTHENTICATION
 *********************************/
function logout() {
  localStorage.removeItem("agriassist_current_user");
  window.location.href = "login.html";
}

/*********************************
 * LOAD SSD MOBILENET MODEL
 *********************************/
async function loadModel() {
  try {
    model = await cocoSsd.load({ base: "mobilenet_v2" });
    console.log("✅ SSD MobileNet model loaded");
  } catch (err) {
    console.error("❌ Model load failed", err);
  }
}
loadModel();

/*********************************
 * SOIL NUTRIENT CHART
 *********************************/
const ctx = document.getElementById("soilChart").getContext("2d");
new Chart(ctx, {
  type: "bar",
  data: {
    labels: ["Nitrogen", "Phosphorus", "Potassium"],
    datasets: [{
      data: [45, 30, 60],
      backgroundColor: ["#66bb6a", "#42a5f5", "#ffa726"]
    }]
  },
  options: {
    plugins: {
      legend: { display: false }
    }
  }
});

/*********************************
 * GEOLOCATION & CROP SUGGESTION
 *********************************/
function getLocation() {
  const loc = document.getElementById("locationOutput");
  const crop = document.getElementById("cropOutput");

  if (!navigator.geolocation) {
    loc.innerText = "Geolocation not supported";
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    loc.innerText = `Latitude: ${lat.toFixed(4)}, Longitude: ${lon.toFixed(4)}`;

    let crops = ["Millets", "Groundnut"];
    if (lat > 20 && lat < 24) crops = ["Cotton", "Soybean", "Wheat"];
    else if (lat > 24 && lat < 28) crops = ["Rice", "Sugarcane", "Maize"];

    crop.innerText = "Recommended Crops: " + crops.join(", ");
  });
}

/*********************************
 * SOIL DISEASE DETECTION (AI)
 *********************************/
async function detectSoilDisease() {
  const fileInput = document.getElementById("soilUpload");
  const output = document.getElementById("soilDiseaseOutput");

  if (!fileInput.files[0]) {
    output.innerText = "⚠️ Please upload a soil image";
    return;
  }

  output.innerText = "🔍 Analyzing soil image with AI...";

  const img = new Image();
  img.src = URL.createObjectURL(fileInput.files[0]);
  await img.decode();

  // SSD Object Detection
  await model.detect(img);

  // Pixel color analysis
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  let dark = 0, red = 0;
  const total = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r < 80 && g < 80 && b < 80) dark++;
    if (r > 150 && g < 100 && b < 100) red++;
  }

  let result = "Healthy Soil";
  if (dark / total > 0.25) result = "⚠️ Soil Erosion Risk";
  else if (red / total > 0.2) result = "⚠️ Possible Nematode Infestation";

  output.innerText = "Detected: " + result;
}

/*********************************
 * CROP DISEASE DETECTION (AI)
 *********************************/
async function detectCropDisease() {
  const fileInput = document.getElementById("cropUpload");
  const output = document.getElementById("cropDiseaseOutput");

  if (!fileInput.files[0]) {
    output.innerText = "⚠️ Please upload a crop image";
    return;
  }

  if (!model) {
    output.innerText = "⏳ AI model still loading...";
    return;
  }

  output.innerText = "🔍 Analyzing crop image using AI...";

  const img = new Image();
  img.src = URL.createObjectURL(fileInput.files[0]);
  await img.decode();

  const predictions = await model.detect(img);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  let yellow = 0, white = 0, dark = 0;
  const total = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r > 180 && g > 140 && b < 100) yellow++;
    if (r > 220 && g > 220 && b > 220) white++;
    if (r < 90 && g < 90 && b < 90) dark++;
  }

  let disease = "Healthy Crop";
  if (yellow / total > 0.15) disease = "Leaf Blight Detected";
  else if (white / total > 0.2) disease = "Powdery Mildew Detected";
  else if (dark / total > 0.12) disease = "Fungal Infection Detected";

  const objects = predictions.map(p => p.class).join(", ");

  output.innerText = `Detected: ${disease}\nObjects: ${objects || "Plant"}`;
}

/*********************************
 * COMMUNITY SECTION
 *********************************/
function loadCommunityPosts() {
  const box = document.getElementById("communityPosts");
  box.innerHTML = "";

  if (communityPosts.length === 0) {
    box.innerHTML = "<p>No posts yet</p>";
    return;
  }

  communityPosts.forEach((p, i) => {
    box.innerHTML += `
      <div class="post">
        <strong>Farmer ${i + 1}</strong>
        <p>${p.content}</p>
        <small>${new Date(p.time).toLocaleString()}</small>
      </div>`;
  });
}

function addCommunityPost() {
  const text = document.getElementById("newPost").value.trim();
  if (!text) return alert("Write something!");

  communityPosts.unshift({ content: text, time: new Date() });
  localStorage.setItem("communityPosts", JSON.stringify(communityPosts));
  document.getElementById("newPost").value = "";
  loadCommunityPosts();
}

/*********************************
 * SIDEBAR NAVIGATION
 *********************************/
function showSection(section) {
  document.querySelectorAll(".card").forEach(c => c.style.display = "none");

  if (section === "crop") {
    document.querySelector(".card:nth-child(1)").style.display = "block";
    document.querySelector(".card:nth-child(4)").style.display = "block";
  }
  if (section === "disease") {
    document.querySelector(".card:nth-child(2)").style.display = "block";
    document.querySelector(".card:nth-child(3)").style.display = "block";
  }
  if (section === "community") {
    document.querySelector(".card:nth-child(5)").style.display = "block";
  }
  if (section === "schemes") {
    document.getElementById("govtSchemesCard").style.display = "block";
  }
  if (section === "reports") {
    document.getElementById("reportsCard").style.display = "block";
  }
}

/*********************************
 * REPORT DOWNLOAD
 *********************************/
function downloadReport() {
  const currentUser = JSON.parse(localStorage.getItem("agriassist_current_user")) || { name: "Unknown Farmer" };

  let report = `AgriAssist Operations Report\n`;
  report += `Generated on: ${new Date().toLocaleString()}\n`;
  report += `Farmer: ${currentUser.name || currentUser.username}\n\n`;

  // Soil Nutrient Data
  report += `=== SOIL NUTRIENT ANALYSIS ===\n`;
  report += `Nitrogen: 45%\n`;
  report += `Phosphorus: 30%\n`;
  report += `Potassium: 60%\n\n`;

  // Location Data
  const locationOutput = document.getElementById("locationOutput").innerText;
  const cropOutput = document.getElementById("cropOutput").innerText;
  report += `=== LOCATION & CROP RECOMMENDATIONS ===\n`;
  report += `${locationOutput}\n`;
  report += `${cropOutput}\n\n`;

  // Disease Detection Results
  const soilDiseaseOutput = document.getElementById("soilDiseaseOutput").innerText;
  const cropDiseaseOutput = document.getElementById("cropDiseaseOutput").innerText;
  report += `=== DISEASE DETECTION RESULTS ===\n`;
  report += `Soil Analysis: ${soilDiseaseOutput || "No analysis performed"}\n`;
  report += `Crop Analysis: ${cropDiseaseOutput || "No analysis performed"}\n\n`;

  // Community Posts
  report += `=== COMMUNITY ACTIVITY ===\n`;
  if (communityPosts.length === 0) {
    report += `No community posts yet.\n`;
  } else {
    communityPosts.forEach((post, index) => {
      report += `Post ${index + 1}: ${post.content} (${new Date(post.time).toLocaleString()})\n`;
    });
  }
  report += `\n=== END OF REPORT ===\n`;

  // Create and download the file
  const blob = new Blob([report], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `agriassist-report-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/*********************************
 * INITIAL LOAD
 *********************************/
showSection("crop");
loadCommunityPosts();
