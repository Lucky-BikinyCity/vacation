document.addEventListener('DOMContentLoaded', function(){
    GroupBody();
});

function GroupBody(){
    openSearchUser();
    SidebarOnOff();
    ShowProfile();
    fetchGroupInfo(); // 그룹 정보를 불러옴
}

let currentUserID = '';
let groupOwnerID = '';
let groupID = '';

async function fetchGroupInfo() {
    try {
        const response = await fetch('/api/group-info');
        if (!response.ok) {
            throw new Error('Failed to fetch group info');
        }
        const data = await response.json();
        groupID = data.groupID;
        renderGroupInfo(data);
        loadPosts(); // 그룹 정보를 가져온 후 게시글 로드
    } catch (error) {
        console.error('Error fetching group info:', error);
    }
}

function renderGroupInfo(data) {
    const memberListContainer = document.querySelector('.memberListContainer');
    memberListContainer.innerHTML = '';

    const titleContainer = document.querySelector('.titleContainer');
    titleContainer.textContent = data.groupName; // 그룹 이름 출력

    const { currentUser, groupOwner, members } = data;
    currentUserID = currentUser.user_ID;
    groupOwnerID = groupOwner.user_ID;

    // 현재 사용자와 그룹장이 동일한 경우
    if (currentUser.user_ID === groupOwner.user_ID) {
        const currentUserElement = document.createElement('div');
        currentUserElement.className = 'memberList';
        currentUserElement.innerHTML = `
            <img src="../imgs/icon/captain.png" alt="">
            <div class="member">
                <span id="myname">${currentUser.user_name}</span>
                <div>(나)</div>
            </div>
            <button id="openPost" onclick="postOnOff()"><img src="../imgs/icon/post.png" alt=""></button>
        `;
        currentUserElement.addEventListener('click', () => {
            filterPostsByUser(currentUser.user_ID);
        });
        memberListContainer.appendChild(currentUserElement);
    } else {
        // 현재 사용자
        const currentUserElement = document.createElement('div');
        currentUserElement.className = 'memberList';
        currentUserElement.innerHTML = `
            <img src="../imgs/icon/user.png" alt="">
            <div class="member">
                <span id="myname">${currentUser.user_name}</span>
                <div>(나)</div>
            </div>
            <button id="openPost" onclick="postOnOff()"><img src="../imgs/icon/post.png" alt=""></button>
        `;
        currentUserElement.addEventListener('click', () => {
            filterPostsByUser(currentUser.user_ID);
        });
        memberListContainer.appendChild(currentUserElement);

        // 그룹장
        const groupOwnerElement = document.createElement('div');
        groupOwnerElement.className = 'memberList';
        groupOwnerElement.innerHTML = `
            <img src="../imgs/icon/captain.png" alt="">
            <span id="membername" class="member">${groupOwner.user_name}</span>
        `;
        groupOwnerElement.addEventListener('click', () => {
            filterPostsByUser(groupOwner.user_ID);
        });
        memberListContainer.appendChild(groupOwnerElement);
    }

    // 다른 멤버들
    members.forEach(member => {
        if (member.user_ID !== currentUser.user_ID && member.user_ID !== groupOwner.user_ID) {
            const memberElement = document.createElement('div');
            memberElement.className = 'memberList';
            memberElement.innerHTML = `
                <img src="../imgs/icon/user.png" alt="">
                <span id="membername" class="member">${member.user_name}</span>
                ${groupOwnerID === currentUserID ? `<button class="kickButton" onclick="kickUser('${member.user_ID}')"><img src="../imgs/icon/close.png" alt=""></button>` : ''}
            `;
            memberElement.addEventListener('click', () => {
                filterPostsByUser(member.user_ID);
            });
            memberListContainer.appendChild(memberElement);
        }
    });

    titleContainer.addEventListener('click', () => {
        loadPosts();
    });
}

