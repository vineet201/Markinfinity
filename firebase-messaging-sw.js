importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSyD2rYBmr5fu2HEkZJ-6OKUx6XQUcs9Ppg0",
  authDomain: "weather-notify-8bf63.firebaseapp.com",
  projectId: "weather-notify-8bf63",
  storageBucket: "weather-notify-8bf63.appspot.com",
  messagingSenderId: "541861104637",
  appId: "1:541861104637:web:f6307953860e1eaff96794",
  measurementId: "G-B9KXD8XYS6"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
  
  const notificationOptions = {
    body: payload.data.message || payload.notification.body,
    icon: 'icons/icon-192x192.png',
    badge: 'icons/badge-96x96.png',
    vibrate: [200, 100, 200],
    tag: payload.data.tag || 'weather-notification',
    data: {
      url: 'https://vineet201.github.io/Markinfinity/'
    }
  };

  return self.registration.showNotification(
    payload.data.title || payload.notification.title,
    notificationOptions
  );
}); 