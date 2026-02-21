(function () {
            const CONSENT_KEY = 'cookie_consent';

            function getConsent() {
                try {
                    return localStorage.getItem(CONSENT_KEY);
                } catch (e) {
                    return null;
                }
            }

            function setConsent(value) {
                try {
                    localStorage.setItem(CONSENT_KEY, value);
                } catch (e) {
                    // se localStorage non è disponibile, ignora
                }
            }

            function loadAnalyticsAndAds() {
                // Google Analytics
                const gaScript = document.createElement('script');
                gaScript.async = true;
                gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-BGPD32M5C2';
                document.head.appendChild(gaScript);

                gaScript.onload = function () {
                    window.dataLayer = window.dataLayer || [];
                    function gtag() { dataLayer.push(arguments); }
                    window.gtag = gtag;
                    gtag('js', new Date());
                    gtag('config', 'G-BGPD32M5C2');
                };

                // AdSense (mostra il container e lascia che gli script dentro vengano eseguiti)
                var adsContainer = document.getElementById('ads-container');
                if (adsContainer) {
                    adsContainer.style.display = 'block';
                }
            }

            function initCookieBanner() {
                const banner = document.getElementById('cookie-banner');
                const btnAccept = document.getElementById('cookie-accept');
                const btnReject = document.getElementById('cookie-reject');

                if (!banner || !btnAccept || !btnReject) return;

                const existingConsent = getConsent();

                if (existingConsent === 'accepted') {
                    // Carica subito gli script
                    loadAnalyticsAndAds();
                    return; // banner non mostrato
                }

                // Se non c'è consenso o è "rejected", mostra il banner
                banner.style.display = 'block';

                btnAccept.addEventListener('click', function () {
                    setConsent('accepted');
                    banner.style.display = 'none';
                    loadAnalyticsAndAds();
                });

                btnReject.addEventListener('click', function () {
                    setConsent('rejected');
                    banner.style.display = 'none';
                    // Non carichiamo Analytics/Ads
                });
            }

            document.addEventListener('DOMContentLoaded', initCookieBanner);
        })();