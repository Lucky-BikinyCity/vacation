const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

mongoose
  .connect("mongodb://localhost:27017/my-webpage", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB 연결 성공");
  })
  .catch((err) => {
    console.error("MongoDB 연결 실패", err);
  });

// User 및 Content 모델 임포트
const User = require("./models/User");
const Content = require("./models/Content");

app.get("/api/contents", async (req, res) => {
  const contents = await Content.find();
  res.json(contents);
});

app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body;
  const user = new User({ email, password });
  await user.save();
  res.json({ message: "회원가입 성공" });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (user) {
    res.json({ message: "로그인 성공", user });
  } else {
    res.status(401).json({ message: "로그인 실패" });
  }
});

app.post("/api/addToFavorites", async (req, res) => {
  const { email, contentIds } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
  }

  contentIds.forEach((contentId) => {
    if (!user.favorites.some((fav) => fav.contentId.toString() === contentId)) {
      user.favorites.push({
        contentId: new mongoose.Types.ObjectId(contentId),
      });
    }
  });

  await user.save();

  res.json({ message: "찜한 콘텐츠에 추가되었습니다." });
});

app.get("/api/search", async (req, res) => {
  const { q } = req.query;
  const results = await Content.find({ title: { $regex: q, $options: "i" } });
  res.json(results);
});

app.get("/api/contents/:id", async (req, res) => {
  const { id } = req.params;
  const content = await Content.findById(id);
  res.json(content);
});

app.get("/api/my/history", async (req, res) => {
  const { email } = req.query;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
  }
  const history = await Content.find({
    _id: { $in: user.history.map((item) => item.contentId) },
  });
  res.json(history);
});

app.get("/api/my/favorites", async (req, res) => {
  const { email } = req.query;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
  }
  const favorites = await Content.find({
    _id: { $in: user.favorites.map((item) => item.contentId) },
  });
  res.json(favorites);
});

// 모든 사용자 조회 API 엔드포인트 추가
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users", error);
    res.status(500).json({ message: "Error fetching users" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
