//DOMContentLoaded-> HTML파일이 다 업로드 되기 전에 js코드가 실행 되어 오류가 발생할 수 있으니 HTML파일이 전부 업로드 된 이후에 js코드 실행시키는 기능
document.addEventListener('DOMContentLoaded', function(){
    if(document.body.id==='loginBody'){ //body태그 id를 이용해서 각 html파일별로 필요 js 함수만을 사용
        LoginBody();
    }else if(document.body.id==='signUpBody'){
        SignUpBody();
    }
});

//이 아래서부턴 각 페이지별로 적용될 함수만을 적용

    //로그인 페이지
function LoginBody(){
    showPwdInLogin();

    delInputContent();

    inputFocusCss();
}

function SignUpBody(){
    showPwdInSignUp();

    inputFocusCss();
}

    //로그인 페이지에서 비밀번호 표시 on/off 기능
function showPwdInLogin(){
    var checkbox = document.getElementById("showPwd");
    var pwd = document.getElementById("password");

    checkbox.addEventListener("change",function(){
        if(checkbox.checked){
            pwd.type="text";
        }else{
            pwd.type="password";
        }
    });
}

    //로그인 input 내용 지우기 기능
function delInputContent(){
    var delIdInputContent = document.getElementById('delIdInputContent');
    var delPwdInputContent = document.getElementById('delPwdInputContent');
    var idInput = document.getElementById('uid');
    var pwdInput = document.getElementById('password');
    
    delIdInputContent.addEventListener('click',function(){
        idInput.value='';
    })

    delPwdInputContent.addEventListener('click',function(){
        pwdInput.value='';
    })
}

/*로그인 회원가입 input 테두리 focus 효과*/
function inputFocusCss(){
    const inputWrappers = document.querySelectorAll('.inputWrapper');
    
    inputWrappers.forEach(wrapper => {
        const input = wrapper.querySelector('input');
        const img = wrapper.querySelector('img');

        input.addEventListener('focus', function() {
            wrapper.style.borderColor = '#424242';
            img.style.filter = 'invert(16%) sepia(0%) saturate(3726%) hue-rotate(315deg) brightness(108%) contrast(73%)';
        });

        input.addEventListener('blur', function() {
            wrapper.style.borderColor = '#9c9c9c'; // 초기 상태로 되돌림
            img.style.filter = ''; // 초기 상태로 되돌림
        });
    });
}

    //회원가입 페이지에서 비밀번호 표시 on/off 기능
function showPwdInSignUp(){
    var checkbox = document.getElementById("showPwdInSignUp");
    var img = document.getElementById("imgOfLabelOfshowPwdInSignUp");
    var pwd = document.getElementById("password");

    checkbox.addEventListener("change",function(){
        if(checkbox.checked){
            pwd.type="text";
            img.src="../imgs/icon/showCode.png";
        }else{
            pwd.type="password";
            img.src="../imgs/icon/hideCode.png";
        }
    });
}


//이 아래서부턴 필요한 js함수 작성