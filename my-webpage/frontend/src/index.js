//DOMContentLoaded-> HTML파일이 다 업로드 되기 전에 js코드가 실행 되어 오류가 발생할 수 있으니 HTML파일이 전부 업로드 된 이후에 js코드 실행시키는 기능
document.addEventListener('DOMContentLoaded', function(){
    if(document.body.id==='loginBody'){ //body태그 id를 이용해서 각 html파일별로 필요 js 함수만을 사용
        LoginBody();
    }
});

//이 아래서부턴 각 페이지별로 적용될 함수만을 적용

    //로그인 페이지
function LoginBody(){

}



//이 아래서부턴 필요한 js함수 작성