document.addEventListener('DOMContentLoaded', function() {
    const postWrite = document.getElementById('postWrite');

    const blogTemplate = `
        <div class="postContainer2">
            <div class="postUnderline">
                <img src="../imgs/icon/link.png" alt="">
                <input type="text" id="embedLink" placeholder="your blog or notion link..." class="embedLink">
            </div>
            <div class="chooseLink">
                <button id="blogBtn" class="blogBtn active"><img src="../imgs/icon/blog.png" alt=""></button>
                <button id="notionBtn" class="notionBtn"><img src="../imgs/icon/notion.png" alt=""></button>
            </div>
            <button id="submitPost" class="submitPost" type="submit">Post</button>
        </div>`;

    const notionTemplate = `
        <div class="postContainer">
            <div id="postUnderlineOfTitle" class="postUnderlineOfTitle">
                <img src="../imgs/icon/title.png" alt="">
                <input type="text" id="title" placeholder="title of notion" class="embedLink">
            </div>
            <div class="postUnderline">
                <img src="../imgs/icon/link.png" alt="">
                <input type="text" id="embedLink" placeholder="your blog or notion link..." class="embedLink">
            </div>
            <div class="chooseLink">
                <button id="blogBtn" class="blogBtn"><img src="../imgs/icon/blog.png" alt=""></button>
                <button id="notionBtn" class="notionBtn active"><img src="../imgs/icon/notion.png" alt=""></button>
            </div>
            <button id="submitPost" class="submitPost" type="submit">Post</button>
        </div>`;

    function activateButton(activeBtnId) {
        const blogBtn = document.getElementById('blogBtn');
        const notionBtn = document.getElementById('notionBtn');
        if (activeBtnId === 'blogBtn') {
            blogBtn.classList.add('active');
            notionBtn.classList.remove('active');
        } else if (activeBtnId === 'notionBtn') {
            blogBtn.classList.remove('active');
            notionBtn.classList.add('active');
        }
    }

    function addEventListeners() {
        document.getElementById('blogBtn').addEventListener('click', function() {
            postWrite.innerHTML = blogTemplate;
            activateButton('blogBtn');
            addEventListeners(); // 이벤트 리스너를 다시 추가합니다.
        });

        document.getElementById('notionBtn').addEventListener('click', function() {
            postWrite.innerHTML = notionTemplate;
            activateButton('notionBtn');
            addEventListeners(); // 이벤트 리스너를 다시 추가합니다.
        });

        document.getElementById('submitPost').addEventListener('click', submitPost); // submitPost 버튼에 이벤트 리스너 추가
    }

    addEventListeners(); // 초기 이벤트 리스너를 추가합니다.
});

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
        title = document.getElementById("title") ? document.getElementById("title").value : ''; // 노션 템플릿의 title 값 가져오기
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
