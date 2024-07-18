document.addEventListener('DOMContentLoaded', function(){
    GroupBody();
});

function GroupBody(){
    openSearchUser();
    SidebarOnOff();
    ShowProfile();
}

var postCheck = false;

function postOnOff() {
    var postWrite = document.getElementById("postWrite");
    var groupContainer = document.getElementById("groupContainer");

    if (!postCheck) {
        postWrite.style.display = "block";
        groupContainer.style.display = "none";
        postCheck = true;
    } else {
        postWrite.style.display = "none";
        groupContainer.style.display = "block";
        postCheck = false;
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
    } catch (error) {
        console.error('Error fetching group info:', error);
    }
}

document.getElementById('logout').addEventListener('click', async function() {
    try {
        const response = await fetch('/logout');
        if (!response.ok) {
            throw new Error('로그아웃에 실패했습니다.');
        }

        const result = await response.json();
        if (result.success) {
            window.location.href = '/';
        } else {
            throw new Error('로그아웃에 실패했습니다.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
});

function renderGroupInfo(data) {
    const memberListContainer = document.querySelector('.memberListContainer');
    memberListContainer.innerHTML = '';

    const { currentUser, groupOwner, members } = data;
    currentUserID = currentUser.user_ID;
    groupOwnerID = groupOwner.user_ID;

    const currentUserElement = document.createElement('div');
    currentUserElement.className = 'memberList myself';
    currentUserElement.innerHTML = `
        <img src="../imgs/icon/user.png" alt="">
        <div class="member">
            <span id="myname">${currentUser.user_name}</span>
            <div>(나)</div>
        </div>
        <button id="openPost" onclick="postOnOff()"><img src="../imgs/icon/post.png" alt=""></button>
    `;
    memberListContainer.appendChild(currentUserElement);

    if (currentUser.user_ID !== groupOwner.user_ID) {
        const groupOwnerElement = document.createElement('div');
        groupOwnerElement.className = 'memberList';
        groupOwnerElement.innerHTML = `
            <img src="../imgs/icon/user.png" alt="">
            <span id="membername" class="member">${groupOwner.user_name}</span>
        `;
        memberListContainer.appendChild(groupOwnerElement);
    }

    members.forEach(member => {
        if (member.user_ID !== currentUser.user_ID && member.user_ID !== groupOwner.user_ID) {
            const memberElement = document.createElement('div');
            memberElement.className = 'memberList';
            memberElement.innerHTML = `
                <img src="../imgs/icon/user.png" alt="">
                <span id="membername" class="member">${member.user_name}</span>
                ${groupOwnerID === currentUserID ? `<button class="kickButton" onclick="kickUser('${member.user_ID}')"><img src="../imgs/icon/close.png" alt=""></button>` : ''}
            `;
            memberListContainer.appendChild(memberElement);
        }
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

async function submitPost() {
    const embedLink = document.getElementById("embedLink").value;
    let postType = '';
    
    if (blogBtn.classList.contains("active")) {
        postType = 'blog';
    } else if (notionBtn.classList.contains("active")) {
        postType = 'notion';
    }
    
    const postData = {
        link: embedLink,
        posting_time: new Date().toISOString(),
        group_ID: groupID,
        user_ID: currentUserID,
        post_type: postType
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
            postOnOff();
            fetchGroupInfo();
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

window.onload = async function() {
    await fetchUserInfo();
    fetchGroupInfo();
};

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

document.getElementById('submitPost').addEventListener('click', submitPost);

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
}

function SidebarOnOff() {
    var openBtn = document.getElementById("buttonSidebar");
    var closeBtn = document.getElementById("closeSidebar");
    var sidebar = document.getElementById("sidebar");
    var check = false;

    function checkScreenSize() {
        return window.innerWidth >= 1000;
    }

    openBtn.addEventListener("click", function() {
        sidebar.style.transition="all 0.25s";
        if (checkScreenSize()) {
            return;
        }

        sidebar.style.transform = "translateX(0)";
        openBtn.style.display = "none";
        check = true;
    });

    closeBtn.addEventListener("click",function(){
        sidebar.style.transition="all 0.25s";
        if (checkScreenSize()) {
            return;
        }

        sidebar.style.transform = "translateX(-100%)";
        openBtn.style.display = "block";
        check = false;
    });

    window.addEventListener("resize", function() {
        if (checkScreenSize()) {
            sidebar.style.transform = "translateX(0)";
            sidebar.style.transition="all 0.25s";
            closeBtn.style.display="none";
        }else{
            closeBtn.style.display="block";
            sidebar.style.transition="all 0s";
            if(!check){
                sidebar.style.transform = "translateX(-100%)";
            }
        }
    });
}

function ShowProfile() {
    const profileNameWrapper = document.querySelector('.profileNameWrapper');
    const profileInfo = document.querySelector('.profileInfo');
    const profileWrapper = document.querySelector('.profileWrapper');

    profileWrapper.addEventListener('mouseenter', () => {
        profileInfo.style.display = 'block';
        profileWrapper.style.backgroundColor = 'white';
        profileWrapper.style.boxShadow = '1px 4px 4px #c4c4c4';
        profileNameWrapper.style.borderBottom='0.5px solid #d8d8d8';
    });

    profileWrapper.addEventListener('mouseleave', () => {
        profileInfo.style.display = 'none';
        profileWrapper.style.backgroundColor = '';
        profileWrapper.style.boxShadow = '';
        profileNameWrapper.style.border='';
    });
}
