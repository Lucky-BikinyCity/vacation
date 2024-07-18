document.querySelector('.loginForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const ID = document.getElementById('uid').value;
    const PW = document.getElementById('password').value;
    try {
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ID, PW })
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || '서버 오류 발생');
        }
        // 로그인 성공 시 main.html로 리디렉션
        window.location.href = './public/main.html';
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('message').textContent = error.message;
    }
});

// 비밀번호 보기 기능 추가
document.getElementById('showPwd').addEventListener('change', function() {
    const passwordField = document.getElementById('password');
    if (this.checked) {
        passwordField.type = 'text';
    } else {
        passwordField.type = 'password';
    }
});
