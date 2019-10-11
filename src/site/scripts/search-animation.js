import ScrollReveal from 'scrollreveal';

const searchSlideUp = {
    distance: '1000%',
    origin: 'bottom',
    opacity: null,
};

const subtitleSlideUp = {
    distance: '3000%',
    origin: 'bottom',
    opacity: null,
    delay: 130,
};

const titleSlideUp = {
    distance: '1000%',
    origin: 'bottom',
    opacity: null,
    delay: 130,
};

const scrollerSlideUp = {
    distance: '500%',
    origin: 'bottom',
    opacity: null,
    delay: 1000,
};

ScrollReveal().reveal('.search_part .search_bar', searchSlideUp);
ScrollReveal().reveal('.search_part .search_text h5', subtitleSlideUp);
ScrollReveal().reveal('.search_part .search_text h1', titleSlideUp);
ScrollReveal().reveal('.search_part .mouse', scrollerSlideUp);

document.querySelector('.mouse').addEventListener('click', () => {
    document.querySelector('#mission').scrollIntoView({
        behavior: 'smooth'
    });
});

// Type-writer effect
var i = 0;
var txt = 'math tutors';
var phraseInd = 0;
var phrases = [
    'algebra tutors',
    'chemistry tutors',
    'economics tutors',
    'geometry tutors',
    'calculus tutors',
    'physics tutors',
    'psychology tutors',
    'biology tutors',
    'male tutors',
    'female tutors',
    'tutors',
];
var speed = 80; /* The speed/duration of the effect in milliseconds */
var input = document.querySelector('.search_part .search_bar input');

function typeText() {
    if (i < txt.length) {
        input.setAttribute(
            'placeholder',
            input.getAttribute('placeholder') + txt.charAt(i)
        );
        i++;
        setTimeout(typeText, speed);
    } else {
        i = 0;
        txt = phrases[phraseInd];
        phraseInd++;
        setTimeout(removeText, 1000);
    }
};

function removeText() {
    var str = input.getAttribute('placeholder');
    // Greater than 7 because we want to keep the words 'Search ' inside
    if (str.length > 7) {
        input.setAttribute(
            'placeholder',
            str.substring(0, str.length - 1)
        );
        setTimeout(removeText, speed);
    } else {
        if (phraseInd >= phrases.length) {
            phraseInd = 0;
        }
        typeText();
    }
};

function type() {
    removeText();
};

window.onload = () => {
    // Wait 2 secs before starting typewriter effect
    setTimeout(type, 2000);
};