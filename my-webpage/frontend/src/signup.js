document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.signupForm').addEventListener('submit', async function(event) {
        event.preventDefault();

        const ID = document.getElementById('uid').value;
        const PW = document.getElementById('password').value;
        const USERNAME = document.getElementById('username').value;

        try {
            const response = await fetch('http://localhost:3000/signup', { // URL 절대 경로로 수정
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ID, PW, USERNAME })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || '서버 오류 발생');
            }

            document.getElementById('message').textContent = result.message;
            window.location.href = '/';
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('message').textContent = error.message;
        }
    });

    // 비밀번호 보기 기능 추가
    document.getElementById('showPwdInSignUp').addEventListener('change', function() {
        const passwordField = document.getElementById('password');
        if (this.checked) {
            passwordField.type = 'text';
            document.getElementById('imgOfLabelOfshowPwdInSignUp').src = '../imgs/icon/showCode.png';
        } else {
            passwordField.type = 'password';
            document.getElementById('imgOfLabelOfshowPwdInSignUp').src = '../imgs/icon/hideCode.png';
        }
    });
});
