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
    // 그룹 카운트 계산
    const [groupCountResults] = await pool.query('SELECT COUNT(*) AS group_count FROM UserGroup WHERE user_ID = ?', [userId]);
    const groupCount = groupCountResults[0].group_count;

    // 좋아요 카운트 계산
    const [likeCountResults] = await pool.query('SELECT COUNT(*) AS like_count FROM PostLike WHERE writer_ID = ?', [userId]);
    const likeCount = likeCountResults[0].like_count;

    // 사용자 정보 가져오기
    const query = 'SELECT user_name FROM User WHERE user_ID = ?';
    const [userResults] = await pool.query(query, [userId]);

    if (userResults.length === 0) {
      return res.status(404).json({ message: '사용자 정보를 찾을 수 없습니다.' });
    }

    const user = userResults[0];

    // User 테이블의 group_count와 like_count를 업데이트합니다.
    await pool.query('UPDATE User SET group_count = ?, like_count = ? WHERE user_ID = ?', [groupCount, likeCount, userId]);

    res.json({
      user_id: userId, // user_id 추가
      user_name: user.user_name,
      group_count: groupCount,
      like_count: likeCount
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
    const connection = await pool.getConnection();
    
    const [result] = await connection.query('DELETE FROM UserGroup WHERE group_ID = ? AND user_ID = ?', [groupId, userId]);

    if (result.affectedRows > 0) {
      // 그룹의 현재 인원을 1 감소시킴
      await connection.query('UPDATE `Group` SET current_members = current_members - 1 WHERE group_ID = ?', [groupId]);

      connection.release();
      res.json({ success: true, message: '그룹에서 탈퇴하였습니다.' });
    } else {
      connection.release();
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

// 유저 초대
app.post('/api/invite-user', async (req, res) => {
  const { user_ID } = req.body;
  const group_ID = req.session.groupId;

  console.log('Received invite request:', { user_ID, group_ID });

  if (!user_ID || !group_ID) {
      console.log('Missing user_ID or group_ID');
      return res.status(400).json({ message: 'user_ID and group_ID are required' });
  }

  try {
      const connection = await pool.getConnection();
      
      // 현재 그룹의 최대 인원과 현재 인원을 가져옴
      const [groupResults] = await connection.query('SELECT max_members, current_members FROM `Group` WHERE group_ID = ?', [group_ID]);
      const { max_members, current_members } = groupResults[0];

      if (current_members >= max_members) {
          connection.release();
          return res.status(400).json({ message: '그룹의 최대 인원을 초과할 수 없습니다.' });
      }

      // 유저를 그룹에 초대
      const [results] = await connection.query('INSERT INTO UserGroup (user_ID, group_ID) VALUES (?, ?)', [user_ID, group_ID]);
      
      // 그룹의 현재 인원을 1 증가시킴
      await connection.query('UPDATE `Group` SET current_members = current_members + 1 WHERE group_ID = ?', [group_ID]);

      console.log('Invite user results:', results);
      connection.release();
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

      console.log('Fetching group info');
      const [groupResults] = await connection.query('SELECT user_ID, group_name FROM `Group` WHERE group_ID = ?', [group_ID]);
      const groupOwnerID = groupResults[0]?.user_ID || '';
      const groupName = groupResults[0]?.group_name || '';

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
          groupName: groupName, // 그룹 이름을 추가합니다.
          members: memberResults
      });
  } catch (error) {
      console.error('Database query error:', error);
      res.status(500).json({ message: 'Database query error' });
  }
});


//게시글 작성 라우터
app.post('/api/submit-post', async (req, res) => {
  const { link, posting_time, group_ID, user_ID, post_type, title } = req.body;

  console.log('Received post data:', { link, posting_time, group_ID, user_ID, post_type, title }); // 디버깅용 로그

  if (!link || !posting_time || !group_ID || !user_ID || !post_type) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const query = 'INSERT INTO Post (link, posting_time, group_ID, user_ID, post_type, title) VALUES (?, ?, ?, ?, ?, ?)';
    const [result] = await pool.query(query, [link, posting_time, group_ID, user_ID, post_type, title]);

    console.log('Post insert result:', result); // 디버깅용 로그

    if (result.affectedRows > 0) {
      res.json({ success: true, message: 'Post submitted successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to submit post' });
    }
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ message: 'Database query error' });
  }
});


// 특정 사용자의 게시글 가져오기
app.get('/api/group-posts', isAuthenticated, async (req, res) => {
  const { group_ID, user_ID } = req.query;

  try {
      let query = 'SELECT * FROM Post WHERE group_ID = ?';
      const params = [group_ID];

      if (user_ID) {
          query += ' AND user_ID = ?';
          params.push(user_ID);
      }

      query += ' ORDER BY posting_time DESC';

      const [results] = await pool.query(query, params);

      res.json(results);
  } catch (error) {
      console.error('Database query error:', error);
      res.status(500).json({ message: 'Database query error' });
  }
});

// 게시글 삭제하기
app.post('/api/delete-post', isAuthenticated, async (req, res) => {
  const { post_ID } = req.body;
  const user_ID = req.session.user.id;

  try {
      const connection = await pool.getConnection();

      // 게시글 작성자가 현재 로그인한 사용자와 일치하는지 확인
      const [postResults] = await connection.query('SELECT user_ID FROM Post WHERE post_ID = ?', [post_ID]);
      if (postResults.length === 0 || postResults[0].user_ID !== user_ID) {
          connection.release();
          return res.status(403).json({ message: '게시글 삭제 권한이 없습니다.' });
      }

      // 게시글 삭제
      await connection.query('DELETE FROM Post WHERE post_ID = ?', [post_ID]);

      connection.release();
      res.json({ message: '게시글이 삭제되었습니다.' });
  } catch (error) {
      console.error('Database query error:', error);
      res.status(500).json({ message: 'Database query error' });
  }
});

// 게시글 좋아요 상태 확인
app.get('/api/check-like', async (req, res) => {
  const { post_ID, user_ID } = req.query;

  if (!post_ID || !user_ID) {
    return res.status(400).json({ message: 'post_ID and user_ID are required' });
  }

  try {
    const [results] = await pool.query('SELECT * FROM PostLike WHERE post_ID = ? AND user_ID = ?', [post_ID, user_ID]);
    if (results.length > 0) {
      res.json({ liked: true });
    } else {
      res.json({ liked: false });
    }
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ message: 'Database query error' });
  }
});

// 좋아요 추가 및 제거
app.post('/api/toggle-like', async (req, res) => {
  const { user_ID, post_ID } = req.body;
  if (!user_ID || !post_ID) {
      return res.status(400).json({ message: 'user_ID and post_ID are required' });
  }

  try {
      // 게시글 작성자의 user_ID를 조회
      const [postResult] = await pool.query('SELECT user_ID AS writer_ID FROM Post WHERE post_ID = ?', [post_ID]);
      if (postResult.length === 0) {
          return res.status(404).json({ message: 'Post not found' });
      }
      const writer_ID = postResult[0].writer_ID;

      // 좋아요 상태를 토글하는 로직
      const [existingLike] = await pool.query('SELECT * FROM PostLike WHERE user_ID = ? AND post_ID = ?', [user_ID, post_ID]);
      if (existingLike.length > 0) {
          // 좋아요가 이미 존재하면 삭제
          await pool.query('DELETE FROM PostLike WHERE user_ID = ? AND post_ID = ?', [user_ID, post_ID]);
          console.log('delete');
          res.json({ liked: false });
      } else {
          // 좋아요가 존재하지 않으면 추가
          await pool.query('INSERT INTO PostLike (user_ID, post_ID, writer_ID) VALUES (?, ?, ?)', [user_ID, post_ID, writer_ID]);
          console.log('add');
          res.json({ liked: true });
      }
  } catch (error) {
      console.error('Database query error:', error);
      res.status(500).json({ message: 'Database query error' });
  }
});

// 특정 게시글의 댓글 가져오기
app.get('/api/post-comments', isAuthenticated, async (req, res) => {
  const { post_ID } = req.query;

  try {
      const query = 'SELECT * FROM PostComment WHERE post_ID = ? ORDER BY posting_time ASC';
      const [results] = await pool.query(query, [post_ID]);

      res.json(results);
  } catch (error) {
      console.error('Database query error:', error);
      res.status(500).json({ message: 'Database query error' });
  }
});

// 댓글 추가하기
app.post('/api/submit-comment', isAuthenticated, async (req, res) => {
  const { post_ID, user_ID, content, posting_time } = req.body;

  try {
      const query = 'INSERT INTO PostComment (post_ID, user_ID, content, posting_time) VALUES (?, ?, ?, ?)';
      const [result] = await pool.query(query, [post_ID, user_ID, content, posting_time]);

      res.json({ message: '댓글이 추가되었습니다.' });
  } catch (error) {
      console.error('Database query error:', error);
      res.status(500).json({ message: 'Database query error' });
  }
});

// 댓글 삭제하기
app.post('/api/delete-comment', isAuthenticated, async (req, res) => {
  const { comment_ID } = req.body;

  try {
      const query = 'DELETE FROM PostComment WHERE comment_ID = ?';
      const [result] = await pool.query(query, [comment_ID]);

      res.json({ message: '댓글이 삭제되었습니다.' });
  } catch (error) {
      console.error('Database query error:', error);
      res.status(500).json({ message: 'Database query error' });
  }
});

app.get('/api/user-info', isAuthenticated, async (req, res) => {
  const user_ID = req.session.user.id;

  try {
      const [results] = await pool.query('SELECT user_name, password FROM User WHERE user_ID = ?', [user_ID]);
      if (results.length > 0) {
          res.json(results[0]);
      } else {
          res.status(404).json({ message: 'User not found' });
      }
  } catch (error) {
      console.error('Database query error:', error);
      res.status(500).json({ message: 'Database query error' });
  }
});

app.post('/api/update-user', isAuthenticated, async (req, res) => {
  const user_ID = req.session.user.id;
  const { password, user_name } = req.body;

  console.log(`Received update request: user_ID=${user_ID}, password=${password}, user_name=${user_name}`);

  try {
      let query = 'UPDATE User SET';
      const params = [];

      if (password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          query += ' password = ?';
          params.push(hashedPassword);
      }
      if (user_name) {
          if (params.length > 0) query += ',';
          query += ' user_name = ?';
          params.push(user_name);
      }
      query += ' WHERE user_ID = ?';
      params.push(user_ID);

      await pool.query(query, params);

      res.json({ message: 'User info updated successfully' });
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

      // 그룹의 현재 인원을 1 감소시킴
      await connection.query('UPDATE `Group` SET current_members = current_members - 1 WHERE group_ID = ?', [group_ID]);

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
