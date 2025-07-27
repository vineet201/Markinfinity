// Firebase Configuration and Initialization is now in index.html

// Connection state
let isConnected = false;
let myToken = '';
let partnerToken = '';

// Check for existing connection
const savedConnection = localStorage.getItem('weatherConnection');
if (savedConnection) {
  const connection = JSON.parse(savedConnection);
  myToken = connection.myToken;
  partnerToken = connection.partnerToken;
  document.getElementById('myToken').value = myToken;
  document.getElementById('partnerToken').value = partnerToken;
  connectWithPartner(true);
}

// Modal functions
function openConnectModal() {
  const modal = document.getElementById('connect-modal');
  modal.classList.remove('hidden');
  modal.classList.add('show');
  modal.onclick = function(e) {
    if (e.target === modal) {
      closeConnectModal();
    }
  };
}

function closeConnectModal() {
  const modal = document.getElementById('connect-modal');
  modal.classList.remove('show');
  setTimeout(() => modal.classList.add('hidden'), 300);
}

// Connection handling
async function connectWithPartner(autoConnect = false) {
  const myTokenInput = document.getElementById('myToken');
  const partnerTokenInput = document.getElementById('partnerToken');
  const statusDiv = document.getElementById('connectionStatus');
  
  myToken = myTokenInput.value;
  partnerToken = partnerTokenInput.value;

  if (!myToken || !partnerToken) {
    statusDiv.textContent = 'Please enter both tokens';
    return;
  }

  try {
    const { collection, doc, setDoc, onSnapshot, query, orderBy, limit } = window.firestoreCollections;
    
    // Store connection in Firestore
    const connectionsRef = doc(collection(window.db, 'connections'), myToken);
    await setDoc(connectionsRef, {
      partnerToken: partnerToken,
      lastUpdated: new Date()
    });

    // Save connection locally
    localStorage.setItem('weatherConnection', JSON.stringify({ myToken, partnerToken }));
    
    // Set up real-time listener for notifications
    const notificationsRef = collection(doc(collection(window.db, 'notifications'), myToken), 'messages');
    const notificationsQuery = query(notificationsRef, orderBy('timestamp', 'desc'), limit(1));
    
    onSnapshot(notificationsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = change.doc.data();
          showNotification(notification.title, notification.message);
        }
      });
    });

    isConnected = true;
    statusDiv.textContent = 'Connected!';
    if (!autoConnect) {
      setTimeout(closeConnectModal, 1500);
    }
  } catch (error) {
    console.error('Connection error:', error);
    statusDiv.textContent = 'Connection failed. Please try again.';
  }
}

// Show notification
function showNotification(title, message) {
  if ('Notification' in window) {
    Notification.requestPermission().then(function(permission) {
      if (permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/icon-192x192.png'
        });
      }
    });
  }

  // Also show in-app notification
  const notification = document.createElement('div');
  notification.className = 'in-app-notification';
  notification.innerHTML = `
    <h4>${title}</h4>
    <p>${message}</p>
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }, 100);
}

// Send notification to partner
async function sendNotificationToPartner(type) {
  if (!isConnected) {
    alert('Please connect with your partner first');
    return;
  }

  try {
    const { collection, doc, addDoc } = window.firestoreCollections;
    
    const messages = {
      'sunny': '☀️ Your partner sent you a sunny day alert!',
      'rain': '🌧️ Your partner sent you a rainy day alert!',
      'storm': '⛈️ Your partner sent you a storm alert!'
    };

    // Add notification to partner's collection
    const notificationsRef = collection(doc(collection(window.db, 'notifications'), partnerToken), 'messages');
    await addDoc(notificationsRef, {
      title: 'Weather Alert',
      message: messages[type],
      type: type,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    alert('Failed to send notification');
  }
}

// Enhanced weather map with romantic locations
const weatherMap = {
  ranchi: { temp: "26°C", condition: "Cloudy", icon: "⛅", wind: "8km/h", humidity: "45%", theme: "#e0f7fa", bg: "fog.gif" },
  dhanbad: { temp: "29°C", condition: "Sunny", icon: "☀️", wind: "10km/h", humidity: "30%", theme: "#fff0b3", bg: "sunny.gif" },
  bokaro: { temp: "27°C", condition: "Rainy", icon: "🌧️", wind: "7km/h", humidity: "55%", theme: "#cce5ff", bg: "rain.gif" },
  hazaribagh: { temp: "24°C", condition: "Fog", icon: "🌫️", wind: "5km/h", humidity: "60%", theme: "#ccc", bg: "fog.gif" },
  default: { temp: "25°C", condition: "Cloudy", icon: "🌥️", wind: "10km/h", humidity: "50%", theme: "#f0f0f0", bg: "cloudy.gif" }
};

// Enhanced alert system with messaging
function sendAlert(type) {
  sendNotificationToPartner(type);
}

// Mood system
function sendMood(type) {
  const moodMessages = {
    'happy': '😊 High pressure system - optimal conditions',
    'tired': '😴 Low energy atmospheric patterns',
    'loved': '😍 Perfect romantic weather alignment',
    'missing': '😢 Emotional low pressure front moving in'
  };
  
  // Try to send to backend, but work offline if needed
  try {
    fetch(`${backendUrl}/send?type=${type}&mood=true`).catch(() => {
      console.log('Backend unavailable - mood stored locally');
    });
  } catch (e) {
    console.log('Offline mode - moods stored locally');
  }
  
  showWeatherNotification(moodMessages[type]);
}

// Weather icon interaction
function tapWeather() {
  const icon = document.getElementById("weather-icon");
  icon.style.transform = "scale(1.1) rotate(5deg)";
  setTimeout(() => icon.style.transform = "scale(1)", 200);
}

// Secret animations system
function triggerSecretAnimation(type) {
  const container = document.getElementById("floating-animations");
  
  switch(type) {
    case 'hearts':
      createFloatingHearts();
      break;
    case 'sparkles':
      createFloatingSparkles();
      break;
    case 'rain-hearts':
      createRainHearts();
      break;
  }
}

function createFloatingHearts() {
  for(let i = 0; i < 5; i++) {
    setTimeout(() => {
      const heart = document.createElement("div");
      heart.innerHTML = "💖";
      heart.className = "floating-element heart";
      heart.style.left = Math.random() * 100 + "%";
      heart.style.animationDelay = Math.random() * 2 + "s";
      document.getElementById("floating-animations").appendChild(heart);
      
      setTimeout(() => heart.remove(), 4000);
    }, i * 200);
  }
}

function createFloatingSparkles() {
  for(let i = 0; i < 8; i++) {
    setTimeout(() => {
      const sparkle = document.createElement("div");
      sparkle.innerHTML = "✨";
      sparkle.className = "floating-element sparkle";
      sparkle.style.left = Math.random() * 100 + "%";
      sparkle.style.top = Math.random() * 100 + "%";
      document.getElementById("floating-animations").appendChild(sparkle);
      
      setTimeout(() => sparkle.remove(), 3000);
    }, i * 100);
  }
}

function createRainHearts() {
  for(let i = 0; i < 10; i++) {
    setTimeout(() => {
      const heart = document.createElement("div");
      heart.innerHTML = "💕";
      heart.className = "floating-element rain-heart";
      heart.style.left = Math.random() * 100 + "%";
      document.getElementById("floating-animations").appendChild(heart);
      
      setTimeout(() => heart.remove(), 5000);
    }, i * 300);
  }
}

// Weather notification system
function showWeatherNotification(message) {
  const notification = document.createElement("div");
  notification.className = "weather-notification";
  notification.innerHTML = `
    <div class="notification-content">
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add("fade-out");
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

async function loadWeather() {
  try {
    const res = await fetch("https://ipapi.co/json");
    const data = await res.json();
    const city = (data.city || "unknown").toLowerCase();
    const weather = weatherMap[city] || weatherMap.default;

    document.getElementById("city").innerText = `📍 ${city.charAt(0).toUpperCase() + city.slice(1)}`;
    document.getElementById("weather-icon").innerText = weather.icon;
    document.getElementById("temp").innerText = weather.temp;
    document.getElementById("condition").innerText = weather.condition;
    document.getElementById("details").innerText = `Winds: ${weather.wind} | Humidity: ${weather.humidity}`;
    document.body.style.setProperty('--bg', weather.theme);

    if (weather.bg) {
      document.getElementById("bg-animation").style.backgroundImage = `url(assets/${weather.bg})`;
    }
  } catch {
    document.getElementById("city").innerText = "📍 Unknown";
    document.getElementById("condition").innerText = "Can't load weather";
  }
}

// Global variables for availability tracking
let currentHourSelected = null;
let userAvailability = {};

// Auto-scroll hourly forecast bar to current hour (slightly to the left of center)
function scrollHourlyBarToCurrentHour() {
  const hourlyBar = document.getElementById('hourly-bar');
  if (!hourlyBar) return;
  
  const now = new Date();
  let currentHour = now.getHours();
  
  console.log(`Current hour: ${currentHour}`);
  
  // Find the current hour element (use the middle set of items, not clones)
  const hourItems = Array.from(hourlyBar.querySelectorAll('.hour-item:not(.hour-item-clone)'));
  console.log(`Found ${hourItems.length} original hour items`);
  
  const currentHourElement = hourItems.find(item => parseInt(item.dataset.hour) === currentHour);
  
  if (currentHourElement) {
    console.log(`Found current hour element: ${currentHourElement.dataset.hour}`);
    // Calculate position to scroll to (slightly to the left of center)
    const containerWidth = hourlyBar.clientWidth;
    const itemWidth = currentHourElement.offsetWidth;
    const offset = currentHourElement.offsetLeft - (containerWidth / 2) + (itemWidth / 2) - (itemWidth * 1.5); // Position slightly to the left
    
    console.log(`Scrolling to offset: ${offset}px`);
    // Smooth scroll to that position
    hourlyBar.scrollTo({ left: offset, behavior: 'smooth' });
  } else {
    console.error(`Could not find hour element for hour: ${currentHour}`);
  }
}

// Setup smooth auto-scrolling to current hour with infinite scrolling
function setupHourlyScroll() {
  const hourlyBar = document.getElementById('hourly-bar');
  if (!hourlyBar) {
    console.error('Hourly bar element not found');
    return;
  }
  
  console.log('Setting up hourly scroll with infinite scrolling');
  
  // Get all hour items
  const hourItems = Array.from(hourlyBar.querySelectorAll('.hour-item'));
  if (hourItems.length === 0) {
    console.error('No hour items found');
    return;
  }
  
  console.log(`Found ${hourItems.length} hour items`);
  
  // Calculate item width including margins
  const itemWidth = hourItems[0].offsetWidth + 
                    parseFloat(getComputedStyle(hourItems[0]).marginLeft) + 
                    parseFloat(getComputedStyle(hourItems[0]).marginRight);
  
  console.log(`Item width calculated: ${itemWidth}px`);
  
  // Remove any existing clones first
  hourlyBar.querySelectorAll('.hour-item-clone').forEach(clone => clone.remove());
  
  // Clone items for infinite scrolling
  const totalItems = hourItems.length;
  
  // Create clones for the beginning (add to the end)
  for (let i = 0; i < Math.min(totalItems, 24); i++) {
    const clone = hourItems[i].cloneNode(true);
    clone.classList.add('hour-item-clone');
    hourlyBar.appendChild(clone);
  }
  
  // Create clones for the end (add to the beginning)
  for (let i = totalItems - 1; i >= Math.max(0, totalItems - 24); i--) {
    const clone = hourItems[i].cloneNode(true);
    clone.classList.add('hour-item-clone');
    hourlyBar.prepend(clone);
  }
  
  console.log('Clones created for infinite scrolling');
  
  // Initial scroll position to the middle set of items
  const initialScrollPosition = totalItems * itemWidth;
  hourlyBar.scrollLeft = initialScrollPosition;
  console.log(`Set initial scroll position to: ${initialScrollPosition}px`);
  
  // Scroll to current hour initially (after a short delay to allow layout)
  setTimeout(() => {
    scrollHourlyBarToCurrentHour();
    
    // Get the scrollWidth after all clones are added
    const scrollWidth = hourlyBar.scrollWidth;
    const viewportWidth = hourlyBar.clientWidth;
    
    console.log(`Scroll width: ${scrollWidth}px, Viewport width: ${viewportWidth}px`);
    
    // Setup scroll event for infinite looping
    hourlyBar.addEventListener('scroll', () => {
      const scrollLeft = hourlyBar.scrollLeft;
      const maxScroll = scrollWidth - viewportWidth;
      
      // If scrolled near the beginning, jump to the middle section
      if (scrollLeft < itemWidth * 2) {
        console.log('Reached beginning, jumping to middle section');
        // Disable smooth scrolling temporarily
        hourlyBar.style.scrollBehavior = 'auto';
        const newPosition = scrollLeft + (totalItems * itemWidth);
        hourlyBar.scrollLeft = newPosition;
        console.log(`Jumped to position: ${newPosition}px`);
        // Re-enable smooth scrolling
        setTimeout(() => hourlyBar.style.scrollBehavior = 'smooth', 50);
      }
      // If scrolled near the end, jump to the middle section
      else if (scrollLeft > maxScroll - (itemWidth * 2)) {
        console.log('Reached end, jumping to middle section');
        // Disable smooth scrolling temporarily
        hourlyBar.style.scrollBehavior = 'auto';
        const newPosition = scrollLeft - (totalItems * itemWidth);
        hourlyBar.scrollLeft = newPosition;
        console.log(`Jumped to position: ${newPosition}px`);
        // Re-enable smooth scrolling
        setTimeout(() => hourlyBar.style.scrollBehavior = 'smooth', 50);
      }
    });
    
    console.log('Scroll event listener added for infinite scrolling');
  }, 100);
}

// Availability Panel Functions
function openAvailabilityPanel(hourElement) {
  const panel = document.getElementById('availability-panel');
  currentHourSelected = hourElement;
  
  // Get the hour from the data attribute
  const hourValue = hourElement.dataset.hour;
  
  // Reset selection state
  document.querySelectorAll('.availability-option').forEach(option => {
    option.classList.remove('selected');
  });
  
  // If user has already set availability for this hour, highlight the selections
  if (userAvailability[hourValue]) {
    if (userAvailability[hourValue].includes('call')) {
      document.getElementById('call-option').classList.add('selected');
    }
    if (userAvailability[hourValue].includes('text')) {
      document.getElementById('text-option').classList.add('selected');
    }
  }
  
  // Show the panel with animation
  panel.classList.remove('hidden');
  panel.classList.add('show');
  setTimeout(() => {
    panel.classList.add('visible');
  }, 10);
  
  // Close when clicking outside
  panel.onclick = function(e) {
    if (e.target === panel) {
      closeAvailabilityPanel();
    }
  };
}

function closeAvailabilityPanel() {
  const panel = document.getElementById('availability-panel');
  panel.classList.remove('visible');
  setTimeout(() => {
    panel.classList.remove('show');
    panel.classList.add('hidden');
    currentHourSelected = null;
  }, 300);
}

function toggleAvailability(type) {
  if (!currentHourSelected) return;
  
  const hourValue = currentHourSelected.dataset.hour;
  const option = document.querySelector(`.availability-option[data-type="${type}"]`);
  
  // Initialize if not exists
  if (!userAvailability[hourValue]) {
    userAvailability[hourValue] = [];
  }
  
  // Toggle selection
  if (userAvailability[hourValue].includes(type)) {
    // Remove type if already selected
    userAvailability[hourValue] = userAvailability[hourValue].filter(t => t !== type);
    option.classList.remove('selected');
  } else {
    // Add type if not selected
    userAvailability[hourValue].push(type);
    option.classList.add('selected');
  }
  
  // Update the hour block with icons
  updateAvailabilityIcons(hourValue);
  
  // Save to local storage (for future backend integration)
  saveAvailabilityData();
}

function clearAvailability() {
  if (!currentHourSelected) return;
  
  const hourValue = currentHourSelected.dataset.hour;
  
  // Clear selections
  document.querySelectorAll('.availability-option').forEach(option => {
    option.classList.remove('selected');
  });
  
  // Clear data
  if (userAvailability[hourValue]) {
    delete userAvailability[hourValue];
  }
  
  // Update the hour block
  updateAvailabilityIcons(hourValue);
  
  // Save to local storage
  saveAvailabilityData();
}

function updateAvailabilityIcons(hourValue) {
  // Find all hour blocks with this hour value (original and clones)
  const hourBlocks = document.querySelectorAll(`.hour-item[data-hour="${hourValue}"]`);
  
  hourBlocks.forEach(block => {
    const iconsContainer = block.querySelector('.availability-icons');
    iconsContainer.innerHTML = '';
    
    // Add icons based on availability
    if (userAvailability[hourValue]) {
      if (userAvailability[hourValue].includes('call')) {
        const callIcon = document.createElement('span');
        callIcon.className = 'availability-icon-item';
        callIcon.textContent = '☀️';
        iconsContainer.appendChild(callIcon);
      }
      
      if (userAvailability[hourValue].includes('text')) {
        const textIcon = document.createElement('span');
        textIcon.className = 'availability-icon-item';
        textIcon.textContent = '☁️';
        iconsContainer.appendChild(textIcon);
      }
    }
  });
}

function saveAvailabilityData() {
  localStorage.setItem('userAvailability', JSON.stringify(userAvailability));
}

function loadAvailabilityData() {
  const savedData = localStorage.getItem('userAvailability');
  if (savedData) {
    userAvailability = JSON.parse(savedData);
    
    // Update all hour blocks with saved data
    for (const hourValue in userAvailability) {
      updateAvailabilityIcons(hourValue);
    }
  }
}

// Initialize all features
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, starting initialization...');
  
  // Initialize core weather functionality
  loadWeather();
  
  // Setup push notifications
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
  }
  
  // Initialize hourly bar scrolling
   setupHourlyScroll();
  
  // Load saved availability data
  loadAvailabilityData();
  
  // Setup event listeners for hour items
  document.addEventListener('click', function(e) {
    // Find if click was on hour-item or its child
    let hourElement = e.target.closest('.hour-item');
    if (hourElement) {
      openAvailabilityPanel(hourElement);
    }
  });
  
  // Setup event listeners for availability options
  document.getElementById('call-option').addEventListener('click', function() {
    toggleAvailability('call');
  });
  
  document.getElementById('text-option').addEventListener('click', function() {
    toggleAvailability('text');
  });
  
  document.getElementById('clear-availability').addEventListener('click', function() {
    clearAvailability();
  });
  
  console.log('Weather dashboard initialization complete');
});
