// index.js
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');

const app = express();
const port = 3000;

// Body Parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MySQL Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'test_db' // 사용하려는 데이터베이스 이름
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to database.');
});

// Sample Route
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Fetch all users
app.get('/users', (req, res) => {
    const sql = 'SELECT * FROM users';
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.json(results);
    });
});

app.post('/signup', (req, res) => {
    const { ID, PW, name} = req.body;
    const sql = 'INSERT INTO users (ID, PW, name) VALUES (?, ?, ?)';
    db.query(sql, [ID, PW, name], (err, results) =>{
        if(err){
            return res.status(500).send(err);
        }
        res.json({ id: results.insertId, name, email});
    });
});

app.post('/login', (req, res) => {
    const { ID, PW } = req.body;
    const sql = 'SELECT (PW) from users where ID = ?';
})

app.post('/login', (req, res) => {
    const { ID, PW } = req.body;
  
    if (!ID || !PW) {
      return res.status(400).json({ message: 'ID와 PW를 입력해주세요' });
    }
  
    const query = 'SELECT * FROM users WHERE ID = ?';
    db.query(query, [ID], (err, results) => {
      if (err) {
        return res.status(500).json({ message: '서버 오류' });
      }
  
      if (results.length === 0) {
        return res.status(401).json({ message: 'ID 또는 PW가 잘못되었습니다' });
      }
  
      const user = results[0];
  
      bcrypt.compare(PW, user.PW, (err, isMatch) => {
        if (err) {
          return res.status(500).json({ message: '서버 오류' });
        }
  
        if (!isMatch) {
          return res.status(401).json({ message: 'ID 또는 PW가 잘못되었습니다' });
        }
  
        const token = jwt.sign({ id: user.ID }, 'your_jwt_secret', {
          expiresIn: '1h'
        });
  
        res.json({ message: '로그인 성공', token });
      });
    });
  });
  

// Start Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
