async function loadComments(postID) {
    try {
        const response = await fetch(`/api/post-comments?post_ID=${postID}`);
        if (!response.ok) {
            throw new Error('Failed to fetch comments');
        }
        const comments = await response.json();
        renderComments(postID, comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
    }
}

function renderComments(postID, comments) {
    const commentList = document.getElementById(`commentList-${postID}`);
    commentList.innerHTML = '';

    comments.forEach(comment => {
        const formattedTime = formatDateTime(comment.posting_time);
        const commentElement = document.createElement('div');
        commentElement.className = 'comment';
        commentElement.innerHTML = `
            <div class="commentHeader">
                <div class="commentWriter">${comment.user_ID}</div>
                <div class="commentPostDate">${formattedTime}</div>
            </div>
            <div class="commentContent">${comment.content}</div>
            ${currentUserID === comment.user_ID ? `
            <button onclick="showDeleteCommentConfirm(${comment.comment_ID}, ${postID})" class="delComment">[삭제]</button>
            <div class="confirm" id="confirm-comment-${comment.comment_ID}" style="display:none;">
                <img src="../imgs/icon/delete_comment.png" alt="">
                <button class="no" onclick="hideDeleteCommentConfirm(${comment.comment_ID})">아니오</button>
                <button class="yes" onclick="deleteComment(${comment.comment_ID}, ${postID})">네</button>
            </div>` : ''}
        `;
        commentList.appendChild(commentElement);
    });
}

function showDeleteCommentConfirm(commentID, postID) {
    document.getElementById(`confirm-comment-${commentID}`).style.display = 'block';
}

function hideDeleteCommentConfirm(commentID) {
    document.getElementById(`confirm-comment-${commentID}`).style.display = 'none';
}

async function submitComment(postID) {
    const commentInput = document.getElementById(`commentInput-${postID}`);
    const content = commentInput.value;

    const commentData = {
        post_ID: postID,
        user_ID: currentUserID,
        content: content,
        posting_time: formatDateForMySQL(new Date())
    };

    console.log('Submitting comment:', commentData);

    try {
        const response = await fetch('/api/submit-comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(commentData)
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

async function deleteComment(commentID, postID) {
    try {
        const response = await fetch('/api/delete-comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ comment_ID: commentID })
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            loadComments(postID); // 댓글 삭제 후 댓글 리스트를 다시 로드합니다.
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function toggleLike(postID) {
    try {
        const response = await fetch('/api/toggle-like', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_ID: currentUserID, post_ID: postID })
        });

        const result = await response.json();

        if (response.ok) {
            const likeButton = document.getElementById(`like-${postID}`);
            const likeIcon = result.liked ? 'heart_fill_red.png' : 'heart.png';
            likeButton.innerHTML = `<img src="../imgs/icon/${likeIcon}" alt="Like">`;

            // 좋아요 토글 후 사용자 정보 갱신
            await fetchUserInfo();
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}