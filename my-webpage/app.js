const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
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

// 세션 설정
app.use(session({
  secret: process.env.SESSION_SECRET,  // 환경 변수에서 비밀 키를 가져옴
  resave: false,              // 세션을 항상 저장할지 여부
  saveUninitialized: true,    // 초기화되지 않은 세션을 저장할지 여부
  cookie: { secure: false }   // HTTPS를 사용할 경우 true로 설정
}));

// 정적 파일 제공 설정
app.use(express.static(path.join(__dirname, 'frontend')));

// 기본 라우트에서 /login.html 파일로 리디렉션
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'public', 'login.html'));
});

// 인증 미들웨어
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  } else {
    res.redirect('/');  // 로그인 페이지로 리디렉션
  }
}

// 회원가입 처리
app.post('/signup', async (req, res) => {
  const { ID, PW, USERNAME } = req.body;

  if (!ID || !PW || !USERNAME) {
    return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
  }

  try {
    const checkSql = 'SELECT * FROM User WHERE user_ID = ?';
    db.query(checkSql, [ID], (err, results) => {
      if (err) {
        console.error('데이터베이스 쿼리 오류:', err);
        return res.status(500).json({ message: '데이터베이스 쿼리 오류', error: err });
      }

      if (results.length > 0) {
        return res.status(409).json({ message: '아이디가 존재합니다.' });
      }

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

      // 로그인 성공 응답
      res.json({ success: true, message: '로그인 성공', user: { id: user.user_ID, username: user.user_name } });
    });
  });
});

// 로그아웃 처리
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: '로그아웃 중 오류가 발생했습니다.' });
    }
    res.json({ success: true, message: '로그아웃 성공' });
  });
});

// 보호된 라우트 예제
app.get('/main', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'public', 'main.html'));
});

app.get('/api/main', isAuthenticated, (req, res) => {
  const userId = req.session.user.id;

  const query = 'SELECT user_name, group_count, like_count FROM User WHERE user_ID = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: '서버 오류', error: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: '사용자 정보를 찾을 수 없습니다.' });
    }

    const user = results[0];
    res.json({
      user_name: user.user_name,
      group_count: user.group_count,
      like_count: user.like_count
    });
  });
});

// 그룹 생성 처리
app.post('/api/create-group', isAuthenticated, (req, res) => {
  const { groupName, maxMembers } = req.body;
  const userId = req.session.user.id;

  if (!groupName || !maxMembers) {
    return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
  }

  const createGroupQuery = 'INSERT INTO `Group` (group_name, max_members, current_members, user_ID) VALUES (?, ?, 1, ?)';
  db.query(createGroupQuery, [groupName, maxMembers, userId], (err, results) => {
    if (err) {
      console.error('데이터베이스 쿼리 오류:', err);
      return res.status(500).json({ message: '데이터베이스 쿼리 오류', error: err });
    }

    const groupId = results.insertId;
    const addUserToGroupQuery = 'INSERT INTO UserGroup (user_ID, group_ID) VALUES (?, ?)';
    db.query(addUserToGroupQuery, [userId, groupId], (err, results) => {
      if (err) {
        console.error('데이터베이스 쿼리 오류:', err);
        return res.status(500).json({ message: '데이터베이스 쿼리 오류', error: err });
      }

      res.json({ success: true, message: '그룹이 생성되었습니다.', groupId: groupId });
    });
  });
});

// 사용자 그룹 정보 가져오기
app.get('/api/user-groups', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;

    console.log('사용자 ID:', userId);

    const query = `
        SELECT g.group_ID, g.group_name, g.max_members, g.current_members, g.user_ID as group_king
        FROM UserGroup ug
        JOIN \`Group\` g ON ug.group_ID = g.group_ID
        WHERE ug.user_ID = ?
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('데이터베이스 쿼리 오류:', err);
            return res.status(500).json({ message: '데이터베이스 쿼리 오류', error: err });
        }

        console.log('그룹 정보 조회 결과:', results);
        res.json({ groups: results });
    });
});

// 서버 호출 정보 - 몇 번 포트에서 실행되었습니다.
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
