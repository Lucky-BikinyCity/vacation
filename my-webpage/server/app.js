// index.js
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');

const app = express();
const port = 3000;

// Body Parser 미들웨어
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'project'
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to database.');
});

app.use(express.static(path.join(__dirname, 'public')));

//기본 라우트에서 login.html 파일을 응답합니다.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname,'public','login.html'));
});

//회원가입
app.post('/signup', (req, res) => {
    const { ID, PW, username } = req.body;
    const sql = 'INSERT INTO User (user_ID, password, user_name) VALUES (?, ?, ?)';
    db.query(sql, [ID, PW, username], (err, results) =>{
        if(err){
            return res.status(500).send(err);
        }
        res.json({ id: results.insertId, username });
    });
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
