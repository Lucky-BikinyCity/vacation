const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3000;

// Body Parser 미들웨어
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MySQL 연결 설정
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// MySQL 연결 테스트
(async function testDBConnection() {
  try {
      const connection = await pool.getConnection();
      console.log('Connected to MySQL database.');
      connection.release();
  } catch (error) {
      console.error('Failed to connect to MySQL database:', error);
  }
})();

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
    const [results] = await pool.query(checkSql, [ID]);
    
    if (results.length > 0) {
      return res.status(409).json({ message: '아이디가 존재합니다.' });
    }

    const hashedPassword = await bcrypt.hash(PW, 10);
    const sql = 'INSERT INTO User (user_ID, password, user_name, group_count, like_count) VALUES (?, ?, ?, 0, 0)';
    const [insertResult] = await pool.query(sql, [ID, hashedPassword, USERNAME]);
    res.json({ id: insertResult.insertId, USERNAME, message: '회원가입 성공' });
    
  } catch (error) {
    console.error('서버 오류:', error);
    res.status(500).json({ message: '서버 오류', error });
  }
});

// 로그인 처리
app.post('/login', async (req, res) => {
  const { ID, PW } = req.body;

  if (!ID || !PW) {
    return res.status(400).json({ message: 'ID와 PW를 입력해주세요' });
  }

  try {
    const query = 'SELECT * FROM User WHERE user_ID = ?';
    const [results] = await pool.query(query, [ID]);
    
    if (results.length === 0) {
      return res.status(401).json({ message: 'ID 또는 PW가 잘못되었습니다' });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(PW, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'ID 또는 PW가 잘못되었습니다' });
    }

    // 세션 할당
    req.session.user = { id: user.user_ID, username: user.user_name };

    // 로그인 성공 응답
    res.json({ success: true, message: '로그인 성공', user: { id: user.user_ID, username: user.user_name } });

  } catch (error) {
    console.error('서버 오류:', error);
    res.status(500).json({ message: '서버 오류', error });
  }
});

// 로그아웃 처리
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: '로그아웃 중 오류가 발생했습니다.' });
    }
    res.json({ success: true, message: '로그아웃 성공', redirectUrl: '/frontend' });
  });
});

// 보호된 라우트 예제
app.get('/main', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'public', 'main.html'));
});

app.get('/api/main', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;

  try {
    const query = 'SELECT user_name, group_count, like_count FROM User WHERE user_ID = ?';
    const [results] = await pool.query(query, [userId]);

    if (results.length === 0) {
      return res.status(404).json({ message: '사용자 정보를 찾을 수 없습니다.' });
    }

    const user = results[0];
    res.json({
      user_name: user.user_name,
      group_count: user.group_count,
      like_count: user.like_count
    });

  } catch (error) {
    console.error('서버 오류:', error);
    res.status(500).json({ message: '서버 오류', error });
  }
});

// 그룹 생성 처리
app.post('/api/create-group', isAuthenticated, async (req, res) => {
  const { groupName, maxMembers } = req.body;
  const userId = req.session.user.id;

  if (!groupName || !maxMembers) {
    return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
  }

  try {
    const createGroupQuery = 'INSERT INTO `Group` (group_name, max_members, current_members, user_ID) VALUES (?, ?, 1, ?)';
    const [groupResult] = await pool.query(createGroupQuery, [groupName, maxMembers, userId]);

    const groupId = groupResult.insertId;
    const addUserToGroupQuery = 'INSERT INTO UserGroup (user_ID, group_ID) VALUES (?, ?)';
    await pool.query(addUserToGroupQuery, [userId, groupId]);

    res.json({ success: true, message: '그룹이 생성되었습니다.', groupId: groupId });

  } catch (error) {
    console.error('데이터베이스 쿼리 오류:', error);
    res.status(500).json({ message: '데이터베이스 쿼리 오류', error: err });
  }
});

// 사용자 그룹 정보 가져오기
app.get('/api/user-groups', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;

    console.log('사용자 ID:', userId);

    const query = `
        SELECT g.group_ID, g.group_name, g.max_members, g.current_members, g.user_ID as group_king
        FROM UserGroup ug
        JOIN \`Group\` g ON ug.group_ID = g.group_ID
        WHERE ug.user_ID = ?
    `;

    try {
        const [results] = await pool.query(query, [userId]);

        console.log('그룹 정보 조회 결과:', results);
        res.json({ groups: results });

    } catch (error) {
        console.error('데이터베이스 쿼리 오류:', error);
        res.status(500).json({ message: '데이터베이스 쿼리 오류', error: error });
    }
});

// 그룹ID 세션 저장
app.post('/api/set-group-session', (req, res) => {
  const groupId = req.body.groupId;
  if (!groupId) {
      return res.status(400).json({ message: 'Group ID is required' });
  }

  req.session.groupId = groupId;
  res.status(200).json({ message: 'Group ID set in session' });
});

// 그룹 삭제 라우트
app.delete('/api/delete-group/:groupId', async (req, res) => {
  const { groupId } = req.params;
  const userId = req.session.user.id; // 세션에서 사용자 ID를 가져옵니다.

  if (!userId) {
    console.error('Unauthorized: 세션에서 사용자 ID를 찾을 수 없습니다.');
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  console.log('그룹 삭제 요청:', { groupId, userId });

  try {
    const [result] = await pool.query('DELETE FROM `Group` WHERE group_ID = ? AND user_ID = ?', [groupId, userId]);

    if (result.affectedRows > 0) {
      res.json({ success: true, message: '그룹이 삭제되었습니다.' });
    } else {
      res.status(403).json({ success: false, message: '그룹 삭제 권한이 없습니다.' });
    }
  } catch (error) {
    console.error('그룹 삭제 중 오류 발생:', error);
    res.status(500).json({ success: false, message: '그룹 삭제 중 오류가 발생했습니다.' });
  }
});


// 그룹 탈퇴 라우트
app.post('/api/exit-group/:groupId', async (req, res) => {
  const { groupId } = req.params;
  const userId = req.session.user.id; // 세션에서 사용자 ID를 가져옵니다.

  if (!userId) {
    console.error('Unauthorized: 세션에서 사용자 ID를 찾을 수 없습니다.');
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  console.log('그룹 탈퇴 요청:', { groupId, userId });

  try {
    const [result] = await pool.query('DELETE FROM UserGroup WHERE group_ID = ? AND user_ID = ?', [groupId, userId]);

    if (result.affectedRows > 0) {
      res.json({ success: true, message: '그룹에서 탈퇴하였습니다.' });
    } else {
      res.status(403).json({ success: false, message: '그룹 탈퇴에 실패했습니다.' });
    }
  } catch (error) {
    console.error('그룹 탈퇴 중 오류 발생:', error);
    res.status(500).json({ success: false, message: '그룹 탈퇴 중 오류가 발생했습니다.' });
  }
});

app.post('/api/search-user', async (req, res) => {
  const { user_ID } = req.body;
  const group_ID = req.session.groupId;

  console.log('Received search request:', { user_ID, group_ID });

  if (!user_ID || !group_ID) {
    console.log('Missing user_ID or group_ID');
    return res.status(400).json({ message: 'user_ID and group_ID are required' });
  }

  try {
    // UserGroup에서 user_ID와 group_ID로 조회
    const [userGroupResults] = await pool.query('SELECT * FROM UserGroup WHERE user_ID = ? AND group_ID = ?', [user_ID, group_ID]);
    
    console.log('UserGroup query results:', userGroupResults);

    if (userGroupResults.length > 0) {
      console.log('User already in group');
      return res.status(400).json({ message: '검색 불가' });
    }

    // User 테이블에서 user_ID로 조회
    const [userResults] = await pool.query('SELECT user_name FROM User WHERE user_ID = ?', [user_ID]);

    console.log('User query results:', userResults);

    if (userResults.length === 0) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User found:', userResults[0].user_name);
    res.json({ user_name: userResults[0].user_name, user_ID });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ message: 'Database query error' });
  }
});


app.post('/api/invite-user', async (req, res) => {
  const { user_ID } = req.body;
  const group_ID = req.session.groupId;

  console.log('Received invite request:', { user_ID, group_ID });

  if (!user_ID || !group_ID) {
    console.log('Missing user_ID or group_ID');
    return res.status(400).json({ message: 'user_ID and group_ID are required' });
  }

  try {
    // Invite user logic here, e.g., inserting into UserGroup table
    const [results] = await pool.query('INSERT INTO UserGroup (user_ID, group_ID) VALUES (?, ?)', [user_ID, group_ID]);
    console.log('Invite user results:', results);
    res.json({ message: 'User invited successfully' });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ message: 'Database query error' });
  }
});

// 그룹 정보 가져오기 API
app.get('/api/group-info', async (req, res) => {
  const { user } = req.session;
  const group_ID = req.session.groupId;

  console.log('Session data:', { user, group_ID });

  if (!user || !group_ID) {
      console.log('Missing user or group_ID:', { user, group_ID });
      return res.status(400).json({ message: 'user_ID and group_ID are required' });
  }

  try {
      const connection = await pool.getConnection();

      console.log('Fetching current user info');
      const [userResults] = await connection.query('SELECT user_name FROM User WHERE user_ID = ?', [user.id]);
      const currentUserName = userResults[0]?.user_name || '';

      console.log('Fetching group owner info');
      const [groupResults] = await connection.query('SELECT user_ID FROM `Group` WHERE group_ID = ?', [group_ID]);
      const groupOwnerID = groupResults[0]?.user_ID || '';

      let groupOwnerName = '';
      if (groupOwnerID) {
          const [ownerResults] = await connection.query('SELECT user_name FROM User WHERE user_ID = ?', [groupOwnerID]);
          groupOwnerName = ownerResults[0]?.user_name || '';
      }

      console.log('Fetching group members info');
      const [memberResults] = await connection.query('SELECT u.user_ID, u.user_name FROM UserGroup ug JOIN User u ON ug.user_ID = u.user_ID WHERE ug.group_ID = ? ORDER BY u.user_name', [group_ID]);

      connection.release();

      res.json({
          currentUser: { user_ID: user.id, user_name: currentUserName },
          groupOwner: { user_ID: groupOwnerID, user_name: groupOwnerName },
          groupID: group_ID, // groupID를 추가합니다.
          members: memberResults
      });
  } catch (error) {
      console.error('Database query error:', error);
      res.status(500).json({ message: 'Database query error' });
  }
});


app.post('/api/kick-user', async (req, res) => {
  console.log(1);
  const { user_ID, group_ID, groupOwnerID } = req.body;
  const currentUser = req.session.user;

  // 디버깅용 로그 추가
  console.log('Current session user:', currentUser);
  console.log('Request body:', { user_ID, group_ID, groupOwnerID });

  if (!user_ID || !group_ID || !groupOwnerID) {
      return res.status(400).json({ message: 'user_ID, group_ID and groupOwnerID are required' });
  }

  if (currentUser.id !== groupOwnerID) {
      return res.status(403).json({ message: 'Only the group owner can kick members' });
  }

  try {
      const connection = await pool.getConnection();
      console.log('Removing user from UserGroup');
      await connection.query('DELETE FROM UserGroup WHERE user_ID = ? AND group_ID = ?', [user_ID, group_ID]);

      connection.release();

      res.json({ message: 'User kicked out successfully' });
  } catch (error) {
      console.error('Database query error:', error);
      res.status(500).json({ message: 'Database query error' });
  }
});





// 서버 호출 정보 - 몇 번 포트에서 실행되었습니다.
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
