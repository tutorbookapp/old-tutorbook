# #BuildForCOVID19 Global Hackathon

Below is our [official submission](https://devpost.com/software/tutorbook) for
the #BuildForCOVID19 Global Hackathon.

## Inspiration

My school (Gunn High School) used to use paper to manage their peer tutoring
program. It was absolutely ridiculous! If you wanted a tutor, you used to have
to physically walk across campus to the "Academic Center", fill out a paper
application form, and then wait while the peer tutoring coordinator took that
form, filed it into a huge binder of similar forms, and flipped through the
"Tutor Binder" to find a tutor that fit within your criteria (i.e. a tutor who
can tutor the subjects you want when you're available).

## What it does

Now, Gunn (and all the other schools in PAUSD) use Tutorbook to manage it's peer
tutoring program: - Peer tutors signup, create their profiles, respond to lesson
requests, and track their service hours (usually the required-for-graduation
service hours) **all** on Tutorbook. - Students can then search, message, and
book those tutors--from anywhere, at anytime. - Supervisors (the people who
used to flip through those binders) manage profiles, match students with tutors
(if needed; most of the matching can be done by the students themselves), send
lesson reminders, and approve/reject service hour requests.

**Note that** each school gets it's own "web app" at a different
`.tutorbook.app` subdomain (much like Slack workspaces) and you're only
able to login to that school's web app (to view it's tutors and such)
if you have the school's email address (e.g. to get into [Gunn's web
app](https://gunn.tutorbook.app/app/) you must login with an `@pausd.us` or
`@pausd.org` email address).

Since COVID-19 closed Gunn, we've expanded the functionality of Tutorbook to
enable peer tutors to log service hours from online (via any platform that
their students and staff prefer) tutoring appointments: 1. Students log into
Tutorbook’s web app like they normally would and clock-in to their peer
tutoring sessions. When the clock-in, they’re given a prompt to upload proof
of their tutoring session. Such proof could include: a. Screenshots of their
chat history on Discord, Slack, WhatsApp, or any other messaging platform. b.
Recordings of their online tutoring sessions on Zoom, Skype, Google Hangouts,
Whereby, or any other video conferencing app. c. PDFs of what they worked on
(e.g. a math problem set). 2. Or, students can log service hours **after** the
lesson finished (without having to clock-in and clock-out) by uploading proof
of their lesson (like above) and specifying how many service hours they're
requesting.

## How I built it

Tutorbook was built using [Firebase](https://firebase.google.com) (for our
back-end), HTML, SCSS, and Vanilla JavaScript (no front-end framework to be
seen here haha). While I probably should have used [Vue](https://vuejs.org/)
or [React](https://reactjs.org), I had originally created my own [rendering
solution](https://tutorbook.app/docs/module-@tutorbook_render.html) and
migrating the entire codebase over to a framework was **not** in the scope of
this hackathon.

For this hackathon, I teamed up and worked on polishing out some scalability
issues (e.g. [automatically creating school subdomains w/ AWS R53, CloudFront,
and S3](https://github.com/tutorbookapp/tutorbook/issues/254), [adding an
onboarding flow](https://github.com/tutorbookapp/tutorbook/issues/259), etc).

## What I learned

I personally learned a lot about AWS (as it relates to
wildcard (e.g. `*.tutorbook.app`) DNS records), scalability
issues with Firebase, and how best to triage work with GitHub
[Issues](https://github.com/tutorbookapp/tutorbook/issues),
[Projects](https://github.com/orgs/tutorbookapp/projects/1?fullscreen=true), and
[Milestones](https://github.com/tutorbookapp/tutorbook/milestones/).

## What's next for Tutorbook

We're going to build a feature that enables schools to create landing pages
for their virtual student support services (e.g. a page with a description of
the school and a list of their peer tutors). Schools will then be able to send
all of their students a link to this page (e.g. `gunn.tutorbook.app` for Gunn
High School's landing page) where they (the students) will be able to see all
of their school's virtual support services (e.g. through links on the page
description) and peer tutors in a single place.
