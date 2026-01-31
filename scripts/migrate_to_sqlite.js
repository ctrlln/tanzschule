const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const uuid = require('crypto');

const DB_FILE = path.join(__dirname, '../data/tanzschule.db');
const JSON_FILE = path.join(__dirname, '../data/mock_db.json');

// Delete existing DB if exists for clean migration
if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
}

const db = new sqlite3.Database(DB_FILE);
const jsonData = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));

db.serialize(() => {
    // Create Tables
    db.run(`CREATE TABLE courses (
        id TEXT PRIMARY KEY,
        name TEXT,
        schedule TEXT
    )`);

    db.run(`CREATE TABLE students (
        id TEXT PRIMARY KEY,
        firstname TEXT,
        lastname TEXT,
        gender TEXT,
        age INTEGER,
        phone TEXT,
        partner_id TEXT
    )`);

    db.run(`CREATE TABLE enrollments (
        course_id TEXT,
        student_id TEXT,
        PRIMARY KEY (course_id, student_id),
        FOREIGN KEY(course_id) REFERENCES courses(id),
        FOREIGN KEY(student_id) REFERENCES students(id)
    )`);

    db.run(`CREATE TABLE attendance (
        course_id TEXT,
        student_id TEXT,
        date TEXT,
        present INTEGER,
        PRIMARY KEY (course_id, student_id, date)
    )`);

    // Insert Data
    const stmtCourse = db.prepare("INSERT INTO courses VALUES (?, ?, ?)");
    const stmtStudent = db.prepare("INSERT INTO students VALUES (?, ?, ?, ?, ?, ?, ?)");
    const stmtEnroll = db.prepare("INSERT INTO enrollments VALUES (?, ?)");
    const stmtAttend = db.prepare("INSERT INTO attendance VALUES (?, ?, ?, ?)");

    const studentsMap = new Map(); // Track unique students to avoid dupes if any (though mock data nested them)

    jsonData.courses.forEach(course => {
        stmtCourse.run(course.id, course.name, JSON.stringify(course.schedule));

        course.participants.forEach(p => {
            // Check if student already exists (by ID)
            if (!studentsMap.has(p.id)) {
                stmtStudent.run(p.id, p.firstName, p.lastName, p.gender, p.age, p.phone, p.isPartnerOf);
                studentsMap.set(p.id, true);
            }

            // Enroll
            stmtEnroll.run(course.id, p.id);
        });
    });

    // Migrate attendance if exists
    if (jsonData.attendance) {
        Object.entries(jsonData.attendance).forEach(([key, participantIds]) => {
            const [courseId, date] = key.split('_');
            participantIds.forEach(pId => {
                stmtAttend.run(courseId, pId, date, 1);
            });
        });
    }

    stmtCourse.finalize();
    stmtStudent.finalize();
    stmtEnroll.finalize();
    stmtAttend.finalize();
});

db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Migration complete.');
});
