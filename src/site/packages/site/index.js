const EmailForm = require('@tutorbook/email-form');
const CTALink = require('@tutorbook/cta-link');
const Header = require('@tutorbook/header');
const HeroEmailCapture = require('@tutorbook/hero-email-capture');
const LogoParty = require('@tutorbook/logo-party');
const FeatureSpotlightVertical = require('@tutorbook/feature-spotlight-' +
    'vertical');
const Features = require('@tutorbook/features');
const LargeTestimonial = require('@tutorbook/large-testimonial');
const HeadingBlock = require('@tutorbook/heading-block');
const FeatureAnnouncement = require('@tutorbook/feature-announcement');
const EmailCapture = require('@tutorbook/email-capture');
const Footer = require('@tutorbook/footer');

class Site {
    constructor() {
        firebase.auth().onAuthStateChanged(user => {
            if (user) document.querySelector('site-header').setLoggedIn(true);
        });
    }
}

window.onload = () => window.site = new Site();

module.exports = Site;