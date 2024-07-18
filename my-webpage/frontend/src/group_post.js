function formatDateForMySQL(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    const year = String(date.getFullYear()).slice(2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

document.getElementById('submitPost').addEventListener('click', submitPost);

async function submitPost() {
    console.log(1);
    const embedLink = document.getElementById("embedLink").value;
    let postType = '';
    let title = '';

    if (document.querySelector('.blogBtn').classList.contains("active")) {
        postType = 'blog';
        title = null; // 블로그일 경우 title을 null로 설정
    } else if (document.querySelector('.notionBtn').classList.contains("active")) {
        postType = 'notion';
        title = document.getElementById("title").value; // 노션 템플릿의 title 값 가져오기
    }

    const postData = {
        link: embedLink,
        posting_time: formatDateForMySQL(new Date()), // 날짜를 MySQL 형식으로 변환
        group_ID: groupID,
        user_ID: currentUserID,
        post_type: postType,
        title: title // title 필드 추가
    };

    console.log('Submitting post:', postData);

    try {
        const response = await fetch('/api/submit-post', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            location.reload(); // 페이지 새로고침
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadPosts() {
    try {
        const response = await fetch(`/api/group-posts?group_ID=${groupID}`);
        if (!response.ok) {
            throw new Error('Failed to fetch posts');
        }
        const posts = await response.json();
        renderPosts(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
    }
}

async function checkLike(postID) {
    try {
        const response = await fetch(`/api/check-like?post_ID=${postID}&user_ID=${currentUserID}`); // user_ID 추가
        if (!response.ok) {
            throw new Error('Failed to check like');
        }
        const result = await response.json();
        return result.liked;
    } catch (error) {
        console.error('Error checking like:', error);
        return false;
    }
}

async function renderPosts(posts) {
    const groupContainer = document.getElementById('groupContainer');
    groupContainer.innerHTML = '';

    posts.forEach(async (post) => {
        const postElement = document.createElement('div');
        postElement.className = 'boardContainer';

        let postContent;
        if (post.post_type === 'blog') {
            postContent = `<iframe class="board" src="${post.link}" frameborder="0"></iframe>`;
        } else if (post.post_type === 'notion') {
            postContent = `
                <div class="board" style="cursor:pointer;" onclick="location.href='${post.link}';">
                    <div class="notionContainer">
                        <img class="imgInBoard" src="../imgs/icon/notion.png" alt="Notion">
                        <span>${post.title}</span>
                    </div>
                </div>`;
        }

        const liked = await checkLike(post.post_ID);
        const likeIcon = liked ? 'heart_fill_red.png' : 'heart.png';

        postElement.innerHTML = `
            ${postContent}
            <div class="commentContainer">
                ${currentUserID === post.user_ID ? `<button onclick="deletePost('${post.post_ID}')" id="delPost" class="delPost"><img src="../imgs/icon/delete.png" alt="Delete"></button>` : ''}
                <div class="commentList" id="commentList-${post.post_ID}"></div>
                <div class="commentFooter">
                    <button id="like-${post.post_ID}" class="like btnCommentFooter" onclick="toggleLike('${post.post_ID}')"><img src="../imgs/icon/${likeIcon}" alt="Like"></button>
                    <img class="commentImg imgInComment" src="../imgs/icon/comment.png" alt="Comment">
                    <div class="commentStructure">
                        <input id="commentInput-${post.post_ID}" class="commentInput" type="text" placeholder="댓글">
                        <button onclick="submitComment('${post.post_ID}')" class="sendComment btnCommentFooter"><img src="../imgs/icon/send.png" alt="Send"></button>
                    </div>
                </div>
            </div>
        `;

        groupContainer.appendChild(postElement);
        loadComments(post.post_ID); // 댓글 로드
    });
}


async function deletePost(postID) {
    try {
        const response = await fetch('/api/delete-post', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ post_ID: postID })
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            loadPosts(); // 게시글 삭제 후 게시글 리스트를 다시 로드합니다.
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

const blogBtn = document.getElementById("blogBtn");
const notionBtn = document.getElementById("notionBtn");

blogBtn.addEventListener("click", function() {
    blogBtn.classList.add("active");
    notionBtn.classList.remove("active");
});

notionBtn.addEventListener("click", function() {
    notionBtn.classList.add("active");
    blogBtn.classList.remove("active");
});