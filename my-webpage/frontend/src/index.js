//DOMContentLoaded-> HTML파일이 다 업로드 되기 전에 js코드가 실행 되어 오류가 발생할 수 있으니 HTML파일이 전부 업로드 된 이후에 js코드 실행시키는 기능
document.addEventListener('DOMContentLoaded', function(){
    if(document.body.id==='loginBody'){ //body태그 id를 이용해서 각 html파일별로 필요 js 함수만을 사용
        LoginBody();
    }else if(document.body.id==='signUpBody'){
        SignUpBody();
    }else if(document.body.id==='mainBody'){
        MainBody();
    }
});

//이 아래서부턴 각 페이지별로 적용될 함수만을 적용

    //로그인 페이지
function LoginBody(){
    ShowPwdInLogin();

    DelInputContent();

    InputFocusCss();
}

    //회원가입 페이지
function SignUpBody(){
    ShowPwdInSignUp();

    InputFocusCss();
}

    //메인 페이지
function MainBody(){
    AddGroup();

    ShowProfile();
}

//이 아래서부턴 필요한 js함수 작성

    //로그인 페이지에서 비밀번호 표시 on/off 기능
function ShowPwdInLogin(){
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
function DelInputContent(){
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

    //로그인 회원가입 input 테두리 focus 효과
function InputFocusCss(){
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
function ShowPwdInSignUp(){
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

    //메인페이지 그룹box 내에 있는 그룹생성 버튼 hover 효과
function AddGroup(){
    //mainbutton을 누르면 mainbutton은 모습을 감추고 숨겨져 있던 boxes가 모습을 들어냄
    var mainButton = document.getElementById("addGroupOnMain"); //메인 페이지 한 가운데에 있는 그룹 추가 버튼
    var buttonInBoxes = document.getElementById("addGroupInBoxes"); //그룹 boxes 내에 있는 그룹 추가 버튼
    var boxes = document.getElementById("groupBoxes");
    var createGroup = document.getElementById("createGroup");

    mainButton.addEventListener("click",function(){
        mainButton.style.display="none";
        buttonInBoxes.style.display="none";
        createGroup.style.display="block";
        boxes.style.display="flex";
    });

    buttonInBoxes.addEventListener("click",function(){
        createGroup.style.display="block";
        buttonInBoxes.style.display="none";
    })
}

    //그룹 생성 박스 멤버 숫자 조절, html 태그 내에 삽입
function handleMemberCount(delta) {
    let val = Number(document.querySelector(".createGroup #member-count").value);
    if (!(delta < 0 && val <= 2)) {
        document.querySelector(".createGroup #member-count").value = val + delta;
    }
}

    //프로필 호버효과
function ShowProfile(){
    // Get elements
    const profileNameWrapper = document.querySelector('.profileNameWrapper');
    const profileInfo = document.querySelector('.profileInfo');
    const profileWrapper = document.querySelector('.profileWrapper');

    // Add event listener for mouseenter
    profileWrapper.addEventListener('mouseenter', () => {
        profileInfo.style.display = 'block';
        profileWrapper.style.backgroundColor = 'white';
        profileWrapper.style.boxShadow = '1px 4px 4px #c4c4c4';
        profileNameWrapper.style.borderBottom='0.5px solid #d8d8d8';
    });

    // Add event listener for mouseleave
    profileWrapper.addEventListener('mouseleave', () => {
        profileInfo.style.display = 'none';
        profileWrapper.style.backgroundColor = '';
        profileWrapper.style.boxShadow = '';
        profileNameWrapper.style.border='';
    });
}