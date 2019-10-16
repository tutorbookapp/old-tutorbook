const ProgressBar = require('progress');
const admin = require('firebase-admin');
const serviceAccount = require('../admin-cred.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tutorbook-779d8.firebaseio.com',
});


function main(tutors) {
    const bar = new ProgressBar(':bar', {
        total: tutors.length
    });
    tutors.forEach((tutor) => {
        admin.firestore().collection('users').doc(tutor.email).set(tutor)
            .then(() => {
                bar.tick();
            }).catch((err) => {
                console.error('[ERROR] ' + err.message);
            });
    });
};


const tutors = [{
    name: 'Frankie Liu',
    photo: 'https://www.topdogtutors.com/sitecontent/profile_pics/download.png',
    id: 'frankie.y.liu@gmail.com',
    email: 'frankie.y.liu@gmail.com',
    type: 'Tutor',
    proxy: [],
    phone: 'Unspecified',
    gender: 'Male',
    grade: 'Adult',
    bio: 'Stanford CS&EE BS, EE MS/PhD. Previous experience: HS students, Math/Stats/Physics/English ' +
        'Undergrad and Grad level courses @ Stanford I view tutoring as a ' +
        'contract/relationship between two people, i.e. the more effort you ' +
        'put into it, the more you get out of it. There is are no silver ' +
        'bullets. Yes, occasionally there are great \"insights\" to be had, ' +
        'but one must spend time and effort to wire one\'s own head until the' +
        ' \"aha\" moments comes from within. My job is to identify your ' +
        'barriers and help you disentangle knots in your head that might be ' +
        'holding you back. I enjoy all sorts of sports, but nowadays spend ' +
        'time skate boarding because I enjoy watching the cool tricks and ' +
        'hope to one day do the simplest of them. I\'m available week nights ' +
        'and week ends and most early mornings (5-8). Feel free to send me a ' +
        'message if you\'re interested in scheduling a lesson or two! ',
    avgRating: 0,
    numRatings: 0,
    subjects: ['Math', 'Physics', 'Stats', 'Computer Science'],
    cards: {
        setupProfile: true,
    },
    config: {
        showPayments: true,
        showProfile: true,
    },
    availability: {},
    payments: {
        hourlyChargeString: '$25.00',
        hourlyCharge: 25,
        totalChargedString: '$0.00',
        totalCharged: 0,
        currentBalance: 0,
        currentBalanceString: '$0.00',
        type: 'Paid',
        policy: 'Hourly rate is $25.00 per hour. Will accept ' +
            'lesson cancellations if given notice within 24 hours.' +
            ' No refunds will be issued unless covered by a Tutorbook ' +
            'guarantee.',
    },
    authenticated: true,
    secondsTutored: 0,
    secondsPupiled: 0,
}, {
    name: 'Lauren Hinkley',
    id: 'lhinkley@stanford.edu',
    email: 'lhinkley@stanford.edu',
    photo: 'https://www.topdogtutors.com/sitecontent/profile_pics/download.png',
    type: 'Tutor',
    proxy: [],
    phone: 'Unspecified',
    gender: 'Female',
    grade: 'Adult',
    bio: 'EDUCATION: Stanford University | Human Biology Major (BS) | Junior. EXPERIENCE: 6+ ' +
        'years tutoring grades K-12 | Manager of a local tutoring company ' +
        'with 400+ clients and 100+ tutors | Helped students improve their ' +
        'grade by up to 3 letter grades | Helped students significantly ' +
        'improve SAT and ACT scores | Help students earn admission to top ' +
        'choice schools. HOBBIES: I am really interested in human biology and hope to ' +
        'pursue this interest to become a physician. Outside of classwork, I ' +
        'am a Co-Leader and Student Researcher at the Huntington\'s Disease ' +
        'Outreach Project for Education at Stanford (HOPES), which is one of ' +
        'the largest online resources for Huntington\'s Disease in the world.' +
        ' I volunteer with a student run free clinic, am also the Co-' +
        'President of Stanford\'s student chapter of Doctors Without Borders,' +
        ' and am a research assistant in a psychiatry lab. Some other ' +
        'interests of mine include volleyball, musical theatre, and listening' +
        ' to podcasts. I\'m available evenings and weekends and can meet you ' +
        'in the Stanford/Menlo Park area (up to 15 mins away from 94305).',
    avgRating: 0,
    numRatings: 0,
    subjects: ['College Applications', 'Math', 'Biology', 'Chemistry', 'Writing', 'English', 'SAT', 'ACT'],
    cards: {
        setupProfile: true,
    },
    config: {
        showPayments: true,
        showProfile: true,
    },
    availability: {},
    payments: {
        hourlyChargeString: '$25.00',
        hourlyCharge: 25,
        totalChargedString: '$0.00',
        totalCharged: 0,
        currentBalance: 0,
        currentBalanceString: '$0.00',
        type: 'Paid',
        policy: 'Hourly rate is $25.00 per hour. Will accept ' +
            'lesson cancellations if given notice within 24 hours.' +
            ' No refunds will be issued unless covered by a Tutorbook ' +
            'guarantee.',
    },
    authenticated: true,
    secondsTutored: 0,
    secondsPupiled: 0,
}, {
    name: 'Jeremy Ferguson',
    photo: 'https://www.topdogtutors.com/sitecontent/profile_pics/headshot.jpg',
    id: 'jmfergie@berkeley.edu',
    email: 'jmfergie@berkeley.edu',
    type: 'Tutor',
    phone: 'Unspecified',
    gender: 'Male',
    grade: 'College',
    bio: 'EDUCATION: Freshman CS major at UC-Berkeley. EXPERIENCE: I\'ve taken ' +
        'AP and college classes in the past, and I am very confident in my ability to teach others in an individualized way that will lead to success. In high school, I often helped out others in my classes and I want to continue helping people to achieve academic success as I have. HOBBIES: I\'ve always been really passionate about music and theater. I play piano a lot and continue to enjoy practicing it often. I did theater throughout high school and am currently looking into ways to continue pursuing this interest in college. Available: Thursday and Friday afternoons, all weekday evenings, weekend afternoons and evenings. Lives Near: 94720. Can Meet: Up to 15 minutes away for no additional charge.',
    avgRating: 0,
    numRatings: 0,
    proxy: [],
    subjects: ['Math', 'Physics', 'Chemistry', 'Computer Science'],
    cards: {
        setupProfile: true,
    },
    config: {
        showPayments: true,
        showProfile: true,
    },
    availability: {},
    payments: {
        hourlyChargeString: '$25.00',
        hourlyCharge: 25,
        totalChargedString: '$0.00',
        totalCharged: 0,
        currentBalance: 0,
        currentBalanceString: '$0.00',
        type: 'Paid',
        policy: 'Hourly rate is $25.00 per hour. Will accept ' +
            'lesson cancellations if given notice within 24 hours.' +
            ' No refunds will be issued unless covered by a Tutorbook ' +
            'guarantee.',
    },
    authenticated: true,
    secondsTutored: 0,
    secondsPupiled: 0,
}, {
    name: 'Johnathan Tai',
    photo: 'https://www.topdogtutors.com/sitecontent/profile_pics/Me.jpeg',
    id: 'johnathan.tai@sjsu.edu',
    email: 'johnathan.tai@sjsu.edu',
    type: 'Tutor',
    gender: 'Male',
    grade: 'College',
    bio: 'EDUCATION: Franklin High school graduate (2018) 3.7 GPA Second-year Biomedical Engineer at San Jose State University, 3.1 GPA. EXPERIENCE: I assisted and organized work for the tutors at Kumon learning center. 1220 SAT score and 3 on AP Literature Enrolled in numerous AP courses in high school Over 400 hours of community service from high school. HOBBIES: I like playing games, listening to music, and spending time with my friends! Available: Tuesday past 5, Wed. past 3, Friday, Saturday, Sunday full day. Lives Near: 95112. Can Meet: Up to 10 additional minutes with no additional charge.',
    avgRating: 0,
    numRatings: 0,
    phone: 'Unspecified',
    subjects: ['Geometry', 'Algebra 1', 'Algebra 2/Trig H', 'Precalculus', 'Calculus 1', 'Calculus 2', 'Calculus 2', 'Biology', 'Chemistry', 'English'],
    cards: {
        setupProfile: true,
    },
    proxy: [],
    config: {
        showPayments: true,
        showProfile: true,
    },
    availability: {},
    payments: {
        hourlyChargeString: '$25.00',
        hourlyCharge: 25,
        totalChargedString: '$0.00',
        totalCharged: 0,
        currentBalance: 0,
        currentBalanceString: '$0.00',
        type: 'Paid',
        policy: 'Hourly rate is $25.00 per hour. Will accept ' +
            'lesson cancellations if given notice within 24 hours.' +
            ' No refunds will be issued unless covered by a Tutorbook ' +
            'guarantee.',
    },
    authenticated: true,
    secondsTutored: 0,
    secondsPupiled: 0,
}, {
    name: 'Elizabeth Asborno',
    photo: 'https://www.topdogtutors.com/sitecontent/profile_pics/ejprofile.jpg',
    id: 'liz@lizasborno.com',
    email: 'liz@lizasborno.com',
    type: 'Tutor',
    gender: 'Female',
    grade: 'College',
    bio: 'EDUCATION: BA in English Literature with Journalism Minor from San Jose State University. EXPERIENCE: Tutor in Reading and Writing for San Jose Public Library Partners in Reading Instructor in Copyediting for UC Berkeley Extension I want to help people who need help reading, writing, or studying. 30+ years in the field of publishing (doing a lot of reading and helping others with their writing!). HOBBIES: Enjoy sports and volunteering for great causes. Available: Weeknights from 6:30 to 9 and some Weekends by appointment. Lives Near: 95116.',
    avgRating: 0,
    numRatings: 0,
    subjects: ['English', 'Writing', 'Reading', 'Literature'],
    cards: {
        setupProfile: true,
    },
    proxy: [],
    phone: 'Unspecified',
    config: {
        showPayments: true,
        showProfile: true,
    },
    availability: {},
    payments: {
        hourlyChargeString: '$25.00',
        hourlyCharge: 25,
        totalChargedString: '$0.00',
        totalCharged: 0,
        currentBalance: 0,
        currentBalanceString: '$0.00',
        type: 'Paid',
        policy: 'Hourly rate is $25.00 per hour. Will accept ' +
            'lesson cancellations if given notice within 24 hours.' +
            ' No refunds will be issued unless covered by a Tutorbook ' +
            'guarantee.',
    },
    authenticated: true,
    secondsTutored: 0,
    secondsPupiled: 0,
}, {
    name: 'Mong-Tuyen Hoang',
    photo: 'https://www.topdogtutors.com/sitecontent/profile_pics/asdfg.PNG',
    id: 'mong.tuyen.hoang2018@gmail.com',
    email: 'mong.tuyen.hoang2018@gmail.com',
    type: 'Tutor',
    gender: 'Female',
    grade: 'College',
    bio: 'EDUCATION: 2nd year student at San Jose State University, Psychology Major (BA), Child and Adolescent Development (ChAD) Minor. EXPERIENCE: I\'ve been tutoring since high school due to my capacity and willingness to help other people by using my own knowledge as a student and as a individual, and hope that doing so would improve myself in that way. I may not always know what students think of me, but at the end of the day the one thing I care about the most is that they get their homework done. Previously homework tutor at San Jose State MLK Library Homework Club tutor (now a supervisor) Recent SAT score: 1280, Essay score: 6/8 Taken college level english/writing classes, as well as classes pertaining to psychology/child psychology (beginning level) I am also able to juggle (proficient in juggling three balls, and handling the Chinese Yo-yo/Diabolo). HOBBIES: On most free days, I enjoy playing video games such as Pokemon and Splatoon, which are my two most played games. I also have a keen interest in Nintendo games in general (i.e. Mario Kart, Super Smash Bros., etc.). I also like to write and listen to music, and if I\'m feeling particularly adventurous, I like to go on walks to enjoy the weather. Available: Weekdays at anytime DURING THE SUMMER. Lives Near: 94085. Can Meet: Up to 12-15 min away, but please reach out to me to further discuss these details.',
    avgRating: 0,
    numRatings: 0,
    phone: 'Unspecified',
    subjects: ['English', 'Writing', 'Reading', 'Proofreading', 'Beginning Juggling'],
    proxy: [],
    cards: {
        setupProfile: true,
    },
    config: {
        showPayments: true,
        showProfile: true,
    },
    availability: {},
    payments: {
        hourlyChargeString: '$25.00',
        hourlyCharge: 25,
        totalChargedString: '$0.00',
        totalCharged: 0,
        currentBalance: 0,
        currentBalanceString: '$0.00',
        type: 'Paid',
        policy: 'Hourly rate is $25.00 per hour. Will accept ' +
            'lesson cancellations if given notice within 24 hours.' +
            ' No refunds will be issued unless covered by a Tutorbook ' +
            'guarantee.',
    },
    authenticated: true,
    secondsTutored: 0,
    secondsPupiled: 0,
}];


main(tutors);