// index.js
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const session = require('express-session');
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
app.use(express.static(path.join(__dirname, 'frontend')));

// 기본 라우트에서 /login.html 파일로 리디렉션
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'public', 'login.html'));
});

// 세션 설정
app.use(session({
  secret: 'your-secret-key',  // 세션 암호화를 위한 비밀 키
  resave: false,              // 세션을 항상 저장할지 여부
  saveUninitialized: true,    // 초기화되지 않은 세션을 저장할지 여부
  cookie: { secure: false }   // HTTPS를 사용할 경우 true로 설정
}));

// 회원가입
app.post('/signup', async (req, res) => {
  const { ID, PW, USERNAME } = req.body;

  if (!ID || !PW || !USERNAME) {
    return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
  }

  try {
    // 아이디 중복 체크
    const checkSql = 'SELECT * FROM User WHERE user_ID = ?';
    db.query(checkSql, [ID], (err, results) => {
      if (err) {
        console.error('데이터베이스 쿼리 오류:', err);
        return res.status(500).json({ message: '데이터베이스 쿼리 오류', error: err });
      }

      if (results.length > 0) {
        return res.status(409).json({ message: '아이디가 존재합니다.' });
      }

      // 아이디가 중복되지 않으면 회원가입 진행
      bcrypt.hash(PW, 10, (err, hashedPassword) => {
        if (err) {
          console.error('해시 처리 오류:', err);
          return res.status(500).json({ message: '해시 처리 오류', error: err });
        }

        const sql = 'INSERT INTO User (user_ID, password, user_name, group_count, like_count) VALUES (?, ?, ?, 0, 0)';
        db.query(sql, [ID, hashedPassword, USERNAME], (err, results) => {
          if (err) {
            console.error('데이터베이스 쿼리 오류:', err);
            return res.status(500).json({ message: '데이터베이스 쿼리 오류', error: err });
          }
          res.json({ id: results.insertId, USERNAME, message: '회원가입 성공' });
        });
      });
    });
  } catch (error) {
    console.error('서버 오류:', error);
    res.status(500).json({ message: '서버 오류', error });
  }
});

// 로그인 처리
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

    bcrypt.compare(PW, user.password, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ message: '서버 오류' });
      }

      if (!isMatch) {
        return res.status(401).json({ message: 'ID 또는 PW가 잘못되었습니다' });
      }

      // 세션 할당
      req.session.user = { id: user.user_ID, username: user.user_name };

      res.json({ message: '로그인 성공' });
    });
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.redirect('/login');
  });
});

//서버 호출 정보 - 몇 번 포트에서 실행되었습니다.
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
