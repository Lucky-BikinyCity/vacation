// index.js
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3000;

// Body Parser 미들웨어
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 데이터베이스 연결 설정
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to database.');
});

// 정적 파일 제공 설정
app.use(express.static(path.join(__dirname, 'frontend', 'public')));

// 기본 라우트에서 /login.html 파일로 리디렉션
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

//회원가입
app.post('/signup', async (req, res) => {
  const { ID, PW, USERNAME } = req.body;

  if (!ID || !PW || !USERNAME) {
    return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(PW, 10);

    const sql = 'INSERT INTO User (user_ID, password, user_name) VALUES (?, ?, ?)';
    db.query(sql, [ID, hashedPassword, USERNAME], (err, results) => {
      if (err) {
        return res.status(500).json({ message: '서버 오류', error: err });
      }
      res.json({ id: results.insertId, USERNAME, message: '회원가입 성공' });
    });
  } catch (error) {
    res.status(500).json({ message: '서버 오류', error });
  }
});

//로그인
app.post('/login', (req, res) => {
  const { ID, PW } = req.body;

  if (!ID || !PW) {
    return res.status(400).json({ message: 'ID와 PW를 입력해주세요' });
  }

  const query = 'SELECT * FROM User WHERE user_ID = ?';
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
  

//서버 호출 정보 - 몇 번 포트에서 실행되었습니다.
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
