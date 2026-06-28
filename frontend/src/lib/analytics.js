const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

let initialized = false;

export function initAnalytics() {
  if (!GA_MEASUREMENT_ID || initialized || typeof window === 'undefined') {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false,
  });

  initialized = true;
}

export function trackEvent(eventName, params = {}) {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') {
    return;
  }

  initAnalytics();
  window.gtag?.('event', eventName, params);
}

export function trackPageView(path) {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') {
    return;
  }

  initAnalytics();
  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
