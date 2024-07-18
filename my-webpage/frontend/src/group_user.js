function filterPostsByUser(userID) {
    fetch(`/api/group-posts?group_ID=${groupID}&user_ID=${userID}`)
        .then(response => response.json())
        .then(posts => {
            renderPosts(posts);
        })
        .catch(error => {
            console.error('Error fetching posts:', error);
        });
}

async function kickUser(userID) {
    try {
        const response = await fetch('/api/kick-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_ID: userID, group_ID: groupID, groupOwnerID: groupOwnerID })
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            fetchGroupInfo();
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function searchUser() {
    const userID = document.getElementById('searchUser').value;
    const searchName = document.getElementById('searchName');

    console.log('Searching for user:', userID);

    try {
        const response = await fetch('/api/search-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_ID: userID })
        });

        const result = await response.json();

        if (response.ok) {
            searchName.textContent = `${result.user_name} (${result.user_ID})`;
            document.querySelector('.searchResultContainer').style.display = 'block';
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function inviteUser() {
    const searchName = document.getElementById('searchName').textContent;
    const userID = searchName.split('(')[1].slice(0, -1);

    console.log('Inviting user:', userID);

    try {
        const response = await fetch('/api/invite-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_ID: userID })
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            fetchGroupInfo();
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function fetchUserInfo() {
    try {
        const response = await fetch('/api/main');
        if (!response.ok) {
            throw new Error('사용자 정보를 가져오지 못했습니다.');
        }
        const data = await response.json();
        document.getElementById('profileName').textContent = data.user_name;
        document.getElementById('group_count').textContent = data.group_count;
        document.getElementById('like_count').textContent = data.like_count;
    } catch (error) {
        console.error('Error fetching user info:', error);
    }
}

function openSearchUser() {
    var check = false;
    const searchUser = document.querySelector('.searchUserContainer');
    const searchResult = document.querySelector('.searchResultContainer');

    document.getElementById('addmember').addEventListener('click', function() {
        if (check) {
            searchUser.style.height = '0';
            searchResult.style.display = 'none';
            check = false;
        } else {
            searchUser.style.height = '260px';
            setTimeout(() => {
                searchResult.style.display = 'block';
            }, 100);
            check = true;
        }
    });

    document.getElementById('searchForm').addEventListener('submit', function(event) {
        event.preventDefault();
        searchUser();
    });
}