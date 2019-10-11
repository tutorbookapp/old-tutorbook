import pdb
import os

from tqdm import tqdm
from random import randint
from randomuser import RandomUser
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

# School subjects offered at Gunn I could think of in less than a min
SUBJECTS = [
    "AP Comp Sci A",
    "Bio H",
    "Bio A",
    "AP Bio",
    "AP Chem",
    "Chem A",
    "Chem H",
    "AP Comp Sci P",
    "Wrld Hist",
    "AP US Hist",
    "Japanese 2",
    "Japanese 3",
    "AP Japanese",
    "French 2",
    "French 3",
    "French H",
    "AP French",
    "Geo H",
    "Geo A",
    "Alg 2 Trig H",
    "AP Calc BC",
    "AP Calc AB",
]

# List of teachers I could think of in under a min
TEACHERS = [
    "Amy Anderson",
    "Josh Paley",
    "Arlena Arteaga",
    "Justin Brown",
    "Michael Bautista",
    "Christina Woznicki",
    "Don Bratton",
    "Olga Cells",
]


def getSubjectDic(subjects):
    subjectDic = {}
    for subject in subjects:
        teacher = TEACHERS[randint(0, len(TEACHERS) - 1)]
        subjectDic[subject] = teacher
    return subjectDic


SUBJECT_DIC = getSubjectDic(SUBJECTS)


def getRandomGrade():
    return randint(9, 12)


def getGradeString(grade):
    if grade == 9:
        return "Freshman"
    elif grade == 10:
        return "Sophomore"
    elif grade == 11:
        return "Junior"
    elif grade == 12:
        return "Senior"
    else:
        # For now, default to Sophomore
        return "Sophomore"


def getRandomSubject(previous=[""]):
    for subject in SUBJECTS:
        subject = SUBJECTS[randint(0, len(SUBJECTS) - 1)]
        if subject not in previous:
            return subject
        else:
            subject = SUBJECTS[randint(0, len(SUBJECTS) - 1)]


def getRandomProfile():
    # Profile sentences I could think of in less than a min
    sentences = [
        "I'm a student at Gunn interested in life.",
        "I'm an athlete at Gunn High School too busy to mess with school.",
        "I'm a person interested in drama and aspire to be a playwright just like Shakespeare!",
    ]
    return sentences[randint(0, len(sentences) - 1)]


def getRandomType():
    userTypes = ["Tutor", "Pupil"]
    return userTypes[randint(0, len(userTypes) - 1)]


def getRandomSubjects(limit=4, previous=[""]):
    subjects = set()
    count = 0
    while count <= limit:
        subject = SUBJECTS[randint(0, len(SUBJECTS) - 1)]
        if subject not in previous:
            subjects.add(subject)
            count += 1
        else:
            subject = SUBJECTS[randint(0, len(SUBJECTS) - 1)]
    return sorted(list(subjects))


def formatGender(gender):
    if gender in ["Male", "Female", "Other"]:
        return gender
    elif gender == "male":
        return "Male"
    elif gender == "female":
        return "Female"
    elif gender == "other":
        return "Other"
    else:
        print(f"[ERROR]: Invalid gender {gender}")
        pdb.set_trace()


def getRandomLocations(limit=3):
    LOCATIONS = ['Gunn Academic Center', 'Mitchell Park Library', 'Gunn Library', 'Downtown Library', 'Palo Alto High School Library']
    locations = set()
    count = 0
    while count <= limit:
        location = LOCATIONS[randint(0, len(LOCATIONS) - 1)]
        if location not in locations:
            locations.add(location)
            count += 1
    return sorted(list(locations))


def getRandomTimes(limit=3):
    DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    TIMES = ['3:35 PM', '4:00 PM', '3:30 PM', '3:00 PM', '4:30 PM', '5:00 PM', '5:30 PM']

    def parseTimes(times):
        # Returns a set of lists with time combos
        times = set()
        for time in times:
            times.add(set([time['day'], time['time']]))
        return times

    times = []
    count = 0
    while count <= limit:
        day = DAYS[randint(0, len(DAYS) - 1)]
        hour = TIMES[randint(0, len(TIMES) - 1)]
        time = {'day': day, 'time': hour}
        if set([time[key] for key in time]) not in parseTimes(times):
            times.append(time)
            count += 1
    return times


def parseUser(user):
    grade = getRandomGrade()
    gradeString = getGradeString(grade)
    profileDescription = getRandomProfile()
    userType = getRandomType()
    availableTimes = getRandomTimes()
    availableLocations = getRandomLocations()
    neededStudies = getRandomSubjects()
    proficientStudies = getRandomSubjects(previous=neededStudies)
    # We want gender to be capitalized
    gender = formatGender(user.get_gender())
    return {
        "grade": grade,
        "gradeString": gradeString,
        "profile": profileDescription,
        "type": userType,
        "numRatings": 0,
        "avgRating": 0,
        "gender": gender,
        "name": user.get_full_name(),
        "email": user.get_email(),
        "phone": user.get_phone(),
        "photo": user.get_picture(),
        "availableTimes": availableTimes,
        "availableLocations": availableLocations,
        "proficientStudies":proficientStudies,
        "neededStudies":neededStudies,
        "allStudies":neededStudies + proficientStudies,
        "private":False,
    }


def parseSubject(subject):
    teacher = SUBJECT_DIC[subject]
    return {"name": subject, "teacher": teacher, "avgRating": randint(0,5)}


def initFirestore(
    pathToCert=os.path.join(os.path.dirname(__name__), "admin-cred.json")
):
    cred = credentials.Certificate(pathToCert)
    firebase_admin.initialize_app(cred)
    return firestore.client()  # Return database reference


def getAverage(subjects):
    avg = 0
    for subject in subjects:
        avg = (avg + subject['avgRating'])/2
    return avg


if __name__ == "__main__":
    db = initFirestore()
    collection_name = "users"

    # Write a test of 10 (American) users to Firestore database
    numUsers = 20
    users = RandomUser.generate_users(numUsers, {"nat": "us"})
    print(f"[INFO]: Adding {numUsers} to Firestore database...")

    for user in tqdm(users):
        userData = parseUser(user)
        # For now, just use the email for Document IDs
        doc_ref = db.collection(collection_name).document(user.get_email())
        doc_ref.set(userData)
        subjects = []

        # Add 3 random subjects to proficientStudies sub-collection
        for subject in userData['proficientStudies']:
            subject_ref = doc_ref.collection("proficientStudies").document(subject)
            subject = parseSubject(subject)
            subject_ref.set(subject)
            subjects.append(subject)

        # Add 3 random subjects to neededStudies sub-collection
        for subject in userData['neededStudies']:
            subject_ref = doc_ref.collection("neededStudies").document(subject)
            subject = parseSubject(subject)
            subject_ref.set(subject)
            subjects.append(subject)

        # Update user's avgRating and numRatings to reflect the subject ratings
        doc_ref.set({"avgRating":getAverage(subjects)}, merge=True)
