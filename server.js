const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'tanzschule.db');
const db = new sqlite3.Database(DB_FILE);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to check password
const authMiddleware = (req, res, next) => {
    const password = req.headers['x-auth-password'];
    if (password === 'schauburg123') {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Login
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === 'schauburg123') {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

// GET Data: Construct full object tree
app.get('/api/data', authMiddleware, (req, res) => {
    const data = { courses: [], attendance: {} };

    // Fetch all courses
    db.all("SELECT * FROM courses", [], (err, courses) => {
        if (err) return res.status(500).json({ error: err.message });

        let completedCourses = 0;
        if (courses.length === 0) return res.json(data);

        courses.forEach(course => {
            course.schedule = JSON.parse(course.schedule);
            course.participants = [];

            // Get participants for this course
            const query = `
                SELECT s.id, s.firstname, s.lastname, s.gender, s.age, s.phone, s.partner_id as isPartnerOf 
                FROM students s
                JOIN enrollments e ON s.id = e.student_id
                WHERE e.course_id = ?
            `;

            db.all(query, [course.id], (err, students) => {
                if (err) return res.status(500).json({ error: err.message });

                // Map snake_case DB fields to camelCase for frontend compat
                course.participants = students.map(s => ({
                    id: s.id,
                    firstName: s.firstname,
                    lastName: s.lastname,
                    gender: s.gender,
                    age: s.age,
                    phone: s.phone,
                    isPartnerOf: s.isPartnerOf
                }));

                data.courses.push(course);
                completedCourses++;

                if (completedCourses === courses.length) {
                    // Finally fetch attendance
                    fetchAttendance(res, data);
                }
            });
        });
    });
});

function fetchAttendance(res, data) {
    db.all("SELECT * FROM attendance WHERE present = 1", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Transform to frontend format: "courseId_date": [ids]
        rows.forEach(row => {
            const key = `${row.course_id}_${row.date}`;
            if (!data.attendance[key]) data.attendance[key] = [];
            data.attendance[key].push(row.student_id);
        });

        res.json(data);
    });
}


// Update Attendance
app.post('/api/attendance', authMiddleware, (req, res) => {
    const { courseId, studentId, date, present } = req.body;

    // Upsert logic
    if (present) {
        const stmt = db.prepare("INSERT OR IGNORE INTO attendance (course_id, student_id, date, present) VALUES (?, ?, ?, 1)");
        stmt.run(courseId, studentId, date, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    } else {
        const stmt = db.prepare("DELETE FROM attendance WHERE course_id = ? AND student_id = ? AND date = ?");
        stmt.run(courseId, studentId, date, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    }
});

// Add Participant(s) - Supports array or single object (though frontend sends array now)
app.post('/api/participant', authMiddleware, (req, res) => {
    const { courseId, participants } = req.body;

    // Fallback if legacy single 'participant' is sent
    const list = participants || [req.body.participant];

    db.serialize(() => {
        const stmtStudent = db.prepare("INSERT INTO students VALUES (?, ?, ?, ?, ?, ?, ?)");
        const stmtEnroll = db.prepare("INSERT INTO enrollments VALUES (?, ?)");

        list.forEach(p => {
            stmtStudent.run(p.id, p.firstName, p.lastName, p.gender, p.age, p.phone, p.isPartnerOf);
            stmtEnroll.run(courseId, p.id);
        });

        stmtStudent.finalize();
        stmtEnroll.finalize((err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
