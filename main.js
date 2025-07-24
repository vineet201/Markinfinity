// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD2rYBmr5fu2HEkZJ-6OKUx6XQUcs9Ppg0",
  authDomain: "weather-notify-8bf63.firebaseapp.com",
  projectId: "weather-notify-8bf63",
  storageBucket: "weather-notify-8bf63.appspot.com",
  messagingSenderId: "541861104637",
  appId: "1:541861104637:web:f6307953860e1eaff96794",
  measurementId: "G-B9KXD8XYS6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const messaging = firebase.messaging();

// VAPID key for web push notifications
const vapidKey = "BORQj7sd-9bNyPIEr7GG4PkdTFBpMULNei5E80m_v709n9Kx8njg-EnACw9L1vR8KjfaGDHrUTg4UmpqoiPtjmY";

// Device detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isAndroid = /Android/i.test(navigator.userAgent);
const androidVersion = isAndroid ? parseInt(navigator.userAgent.match(/Android\s([0-9.]+)/)[1]) : 0;

// Connection state
let isConnected = false;
let myToken = '';
let partnerToken = '';
let fcmToken = null;

// Debug logging
const DEBUG = true;
function log(...args) {
  if (DEBUG) {
    console.log('[Weather App]', ...args);
    const debugLog = document.createElement('div');
    debugLog.className = 'debug-log';
    debugLog.textContent = args.join(' ');
    document.body.appendChild(debugLog);
    setTimeout(() => debugLog.remove(), 5000);
  }
}

// Initialize notifications
async function initializeNotifications() {
  try {
    // Request notification permission
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        log('Notification permission denied');
        return false;
      }
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/sw.js');
      log('ServiceWorker registered');

      // Get FCM token
      try {
        fcmToken = await messaging.getToken({ vapidKey, serviceWorkerRegistration: registration });
        log('FCM Token obtained:', fcmToken);
        return true;
      } catch (error) {
        console.error('Error getting FCM token:', error);
        log('Error getting FCM token:', error.message);
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error('Error initializing notifications:', error);
    log('Error initializing notifications:', error.message);
    return false;
  }
}

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

// Initialize notifications on page load
initializeNotifications().then(success => {
  log('Notification initialization:', success ? 'successful' : 'failed');
});

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

// Cleanup previous connection
function cleanupPreviousConnection() {
  log('Cleaning up previous connection');
  // No specific cleanup for FCM tokens here, as they are managed by the service worker
  // and the messaging object.
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
    log('Attempting to connect with partner');

    // Ensure notifications are initialized
    const notificationsReady = await initializeNotifications();
    if (!notificationsReady) {
      statusDiv.textContent = 'Please allow notifications to continue';
      return;
    }

    // Store connection in Firestore with FCM token
    await db.collection('connections').doc(myToken).set({
      partnerToken: partnerToken,
      fcmToken: fcmToken,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
      deviceType: isMobile ? 'mobile' : 'desktop',
      active: true
    });

    // Save connection locally
    localStorage.setItem('weatherConnection', JSON.stringify({ myToken, partnerToken }));

    // Listen for incoming notifications
    messaging.onMessage((payload) => {
      log('Received foreground message:', payload);
      showNotification(payload.notification.title, payload.notification.body);
    });

    isConnected = true;
    statusDiv.textContent = 'Connected!';
    log('Successfully connected');
    
    if (!autoConnect) {
      setTimeout(closeConnectModal, 1500);
    }
  } catch (error) {
    console.error('Connection error:', error);
    log('Connection error:', error.message);
    statusDiv.textContent = 'Connection failed. Please try again.';
    isConnected = false;
  }
}

// Show notification
async function showNotification(title, message) {
  log('Showing notification:', title, message);
  
  try {
    // Try to show notification through service worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body: message,
        icon: '/icon-192x192.png',
        badge: '/badge-96x96.png',
        vibrate: [200, 100, 200],
        tag: 'weather-notification',
        renotify: true,
        requireInteraction: true
      });
      
      // Add vibration for mobile devices
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    }
  } catch (error) {
    console.error('Error showing notification:', error);
    log('Error showing notification:', error.message);
    
    // Fallback to standard notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/icon-192x192.png'
      });
    }
  }
}

// Standard notification method
async function showStandardNotification(title, message) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body: message,
      icon: '/icon-192x192.png',
      tag: 'weather-notification',
      renotify: true,
      requireInteraction: true
    });

    notification.onclick = () => {
      log('Notification clicked');
      window.focus();
      notification.close();
    };
  }
}

// In-app notification with enhanced mobile support
async function showInAppNotification(title, message) {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll('.in-app-notification');
  existingNotifications.forEach(notif => notif.remove());

  // Create new notification
  const notification = document.createElement('div');
  notification.className = 'in-app-notification';
  
  // Add swipe-to-dismiss for mobile
  if (isMobile) {
    notification.className += ' mobile';
  }

  notification.innerHTML = `
    <div class="notification-content">
      <h4>${title}</h4>
      <p>${message}</p>
    </div>
    ${isMobile ? '<div class="notification-swipe">Swipe to dismiss</div>' : ''}
  `;

  document.body.appendChild(notification);

  // Add touch event listeners for mobile swipe
  if (isMobile) {
    let touchStartX = 0;
    let touchEndX = 0;

    notification.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    notification.addEventListener('touchmove', (e) => {
      touchEndX = e.touches[0].clientX;
      const diff = touchStartX - touchEndX;
      if (diff > 0) { // Only allow swipe left
        notification.style.transform = `translateX(-${diff}px)`;
      }
    }, { passive: true });

    notification.addEventListener('touchend', () => {
      const diff = touchStartX - touchEndX;
      if (diff > 100) { // Swipe threshold
        notification.style.transform = 'translateX(-100%)';
        setTimeout(() => notification.remove(), 300);
      } else {
        notification.style.transform = '';
      }
    });
  }

  // Show notification with animation
  await new Promise(resolve => {
    setTimeout(() => {
      notification.classList.add('show');
      setTimeout(() => {
        if (!isMobile) { // Auto-dismiss only on desktop
          notification.classList.remove('show');
          setTimeout(() => {
            notification.remove();
            resolve();
          }, 300);
        } else {
          resolve();
        }
      }, 5000);
    }, 100);
  });
}

// Update the styles for mobile notifications
const mobileStyles = `
  .in-app-notification.mobile {
    bottom: 20px;
    top: auto;
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    width: 90%;
    max-width: 400px;
    border-radius: 15px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.3s ease;
  }

  .in-app-notification.mobile .notification-content {
    padding: 15px;
  }

  .in-app-notification.mobile .notification-swipe {
    text-align: center;
    padding: 5px;
    font-size: 12px;
    color: #666;
    border-top: 1px solid #eee;
  }

  .debug-log {
    bottom: ${isMobile ? '80px' : '10px'};
    background: rgba(0, 0, 0, 0.8);
    padding: 8px 12px;
    max-width: 90%;
    word-break: break-word;
  }
`;

const existingStyle = document.querySelector('style');
existingStyle.textContent += mobileStyles;

// Send notification to partner
async function sendNotificationToPartner(type) {
  if (!isConnected) {
    alert('Please connect with your partner first');
    return;
  }

  try {
    log('Sending notification to partner:', type);
    
    const messages = {
      'sunny': '☀️ Your partner sent you a sunny day alert!',
      'rain': '🌧️ Your partner sent you a rainy day alert!',
      'storm': '⛈️ Your partner sent you a storm alert!'
    };

    // Check if partner exists and is active
    const partnerDoc = await db.collection('connections').doc(partnerToken).get();
    if (!partnerDoc.exists) {
      alert('Partner not found. Ask them to connect first.');
      log('Partner not found');
      return;
    }

    const partnerData = partnerDoc.data();
    if (!partnerData.active || !partnerData.fcmToken) {
      alert('Partner is not currently active. Ask them to reconnect.');
      log('Partner is inactive or missing FCM token');
      return;
    }

    // Send notification through cloud function
    const functionUrl = 'https://us-central1-weather-notify-8bf63.cloudfunctions.net/sendPushNotification';
    
    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: partnerData.fcmToken,
          title: 'Weather Alert',
          body: messages[type],
          type: type
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      log('Push notification sent successfully');
      
    } catch (error) {
      console.error('Push notification error:', error);
      log('Push notification error:', error.message);
      
      // Fallback: Store in Firestore
      await db.collection('notifications')
        .doc(partnerToken)
        .collection('messages')
        .add({
          title: 'Weather Alert',
          message: messages[type],
          type: type,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          sender: myToken
        });
      log('Notification stored in Firestore as fallback');
    }

  } catch (error) {
    console.error('Error sending notification:', error);
    log('Error sending notification:', error.message);
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
    // This part of the code was not updated in the new_code, so it remains as is.
    // The original code had a fetch call here, but the new_code removed the backendUrl.
    // Assuming the intent was to remove the backend call or that the backendUrl is no longer needed.
    // For now, keeping the original logic as is, but noting the potential issue.
    // If backendUrl is not defined, this will cause an error.
    // Assuming backendUrl was intended to be defined elsewhere or removed.
    // For now, commenting out the fetch call to avoid errors.
    // fetch(`${backendUrl}/send?type=${type}&mood=true`).catch(() => {
    //   console.log('Backend unavailable - mood stored locally');
    // });
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
  // The initializeNotifications function now handles this.
  
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
