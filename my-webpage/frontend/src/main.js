document.addEventListener('DOMContentLoaded', async function() {
    try {
        const userInfoResponse = await fetch('/api/main');
        if (!userInfoResponse.ok) {
            throw new Error('사용자 정보를 가져오지 못했습니다.');
        }

        const userInfo = await userInfoResponse.json();
        const userId = userInfo.user_id;
        console.log(`Fetched userId: ${userId}`);

        document.getElementById('profileName').textContent = userInfo.user_name;
        document.getElementById('group_count').textContent = userInfo.group_count;
        document.getElementById('like_count').textContent = userInfo.like_count;

        const groupResponse = await fetch('/api/user-groups');
        if (!groupResponse.ok) {
            throw new Error('그룹 정보를 가져오지 못했습니다.');
        }

        const groupData = await groupResponse.json();
        const groupBoxes = document.getElementById('groupBoxes');

        if (groupData.groups.length > 0) {
            groupData.groups.forEach(group => {
                console.log(`userId: ${userId}, group_king: ${group.group_king}`);

                const groupBox = document.createElement('a');
                groupBox.href = '../public/group.html';
                groupBox.className = 'groupBox existGroup';
                groupBox.dataset.groupId = group.group_ID;
                groupBox.addEventListener('click', setGroupSessionAndRedirect);

                let buttonHtml;
                if (userId === group.group_king) {
                    buttonHtml = `
                        <button class="koreanFont" id="delGroup" data-group-id="${group.group_ID}" data-action="delete" onclick="preventLink(event)">
                            <img src="../imgs/icon/delete.png" alt="">
                        </button>`;
                } else {
                    buttonHtml = `
                        <button class="koreanFont" id="exitGroup" data-group-id="${group.group_ID}" data-action="exit" onclick="preventLink(event)">
                            <img src="../imgs/icon/exit.png" alt="">
                        </button>`;
                }

                groupBox.innerHTML = `
                    <div class="imgWrapper">
                        <img class="thumbnail" src="" alt="" onerror="this.style.display='none'">
                        <img class="logo" src="../imgs/web-icons/logo1-B.png" alt="">
                    </div>
                    <div class="groupInfoContainer">
                        <div class="groupInfo">
                            <div class="namingGroup koreanFont">${group.group_name} / ${group.group_king}</div>
                            <div class="numberingMember">
                                <img src="../imgs/icon/group.png" alt="">
                                <span class="count">${group.current_members} / ${group.max_members}</span>
                            </div>
                        </div>
                        <div class="buttonWrapper">
                            ${buttonHtml}
                        </div>
                    </div>
                `;

                groupBoxes.appendChild(groupBox);
            });
            document.getElementById('groupBoxes').style.display = 'flex';
            document.getElementById('addGroupInBoxes').style.display = 'block';
        } else {
            document.getElementById('addGroupOnMain').style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('정보를 가져오는 중 오류가 발생했습니다.');
    }
});

async function preventLink(event) {
    event.preventDefault();

    const target = event.currentTarget;
    const groupId = target.getAttribute('data-group-id');
    const action = target.getAttribute('data-action');

    if (!groupId || !action) {
        console.error('Group ID or action not specified');
        return;
    }

    console.log(`Group ID: ${groupId}, Action: ${action}`);

    try {
        let response;
        if (action === 'delete') {
            response = await fetch(`/api/delete-group/${groupId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } else if (action === 'exit') {
            response = await fetch(`/api/exit-group/${groupId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        const result = await response.json();
        if (!response.ok) {
            console.error(result.message || 'Action failed');
            alert(result.message || 'Action failed');
            return;
        }

        alert(result.message || 'Action completed successfully');
        window.location.reload();
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while processing your request.');
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

document.getElementById('addGroupOnMain').addEventListener('click', function() {
    document.getElementById('createGroup').style.display = 'block';
    this.style.display = 'none';
});

document.getElementById('addGroupInBoxes').addEventListener('click', function() {
    document.getElementById('createGroup').style.display = 'block';
    this.style.display = 'none';
});

function handleMemberCount(change) {
    const input = document.getElementById('input_member_number');
    if (input) {
        const currentValue = parseInt(input.value);
        const newValue = currentValue + change;
        if (newValue >= 2) {
            input.value = newValue;
        }
    }
}

document.getElementById('add-button').addEventListener('click', async function() {
    const groupNameElement = document.getElementById('input_group_name');
    const maxMembersElement = document.getElementById('input_member_number');

    if (!groupNameElement || !maxMembersElement) {
        console.error('Element not found');
        return;
    }

    const groupName = groupNameElement.value;
    const maxMembers = maxMembersElement.value;

    if (!groupName || !maxMembers) {
        alert('모든 필드를 입력해주세요.');
        return;
    }

    try {
        const response = await fetch('/api/create-group', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ groupName, maxMembers })
        });

        if (response.ok) {
            alert('그룹이 생성되었습니다.');
            window.location.reload();
        } else {
            const result = await response.json();
            alert(result.message || '그룹 생성에 실패했습니다.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('그룹 생성 중 오류가 발생했습니다.');
    }
});

async function setGroupSessionAndRedirect(event) {
    event.preventDefault();

    const groupId = event.currentTarget.dataset.groupId;
    if (!groupId) {
        console.error('Group ID not found');
        return;
    }

    try {
        const response = await fetch('/api/set-group-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ groupId })
        });

        if (response.ok) {
            window.location.href = './group.html';
        } else {
            const result = await response.json();
            alert(result.message || 'Failed to set group session');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while setting the group session.');
    }
}
