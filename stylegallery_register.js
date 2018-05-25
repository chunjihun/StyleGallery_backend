var express = require('express');
var session = require('express-session');
var OrientoStore = require('connect-oriento')(session);
var bodyParser = require('body-parser');
var bkfd2Password = require("pbkdf2-password");
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var hasher = bkfd2Password();
var OrientDB = require('orientjs');
var server = OrientDB({
   host:       'localhost',
   port:       2424,
   username:   'root',
   password:   '789513'
});
var db = server.use('o2');
var app = express();
app.set('view engine', 'jade');
app.set('views', './views_orientdb');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
  secret: '1234DSFs@adf1234!@#$asd',
  resave: false,
  saveUninitialized: true,
  store:new OrientoStore({
    server: 'host=localhost&port=2424&username=root&password=789513&db=o2'
  })
}));
app.use(passport.initialize());
app.use(passport.session());

//로그아웃 버튼 클릭 이후 등장하는 페이지
app.get('/auth/logout', function(req, res){
  req.logout();
  req.session.save(function(){ // 로그아웃 후, 다시 /welcome 라우터로 리다이렉팅
    res.redirect('/welcome');
  });
});
//
app.get('/welcome', function(req, res){
  if(req.user && req.user.displayName) { // 로그인 성공시 등장하는 부분
    res.send(`
      <script type="text/javascript">alert("로그인 되었습니다.");</script>
      <h1>안녕하세요, ${req.user.displayName}님!</h1>
      <a href="/auth/logout">▶ 로그아웃하기</a>
    `);
  } else { // 사용자가 아직 회원가입을 하지 않았을때 나타나는 부분
    res.send(`
      <h1>Welcome</h1>
      <a href="/auth/login">▶로그인</a><br>
      <a href="/auth/register">▶회원가입</a><br>
      <a href="/stylegallery/main">▶ 메인화면으로 돌아가기</a>
    `);
  }
  // if-else 에 따라 'welcome'이라는 하나의 라우터 안에서 두 가지 상황으로 나뉘는 페이지
});
// 사용자가 최초 로그인 시 발동하는 함수
passport.serializeUser(function(user, done) {
  console.log('serializeUser', user);
  done(null, user.authID);
});
// 사용자가 로그인 되어있는 상태에서 새로고침 및 페이지 이동시 발동하는 함수
passport.deserializeUser(function(id, done) {
  console.log('deserializeUser', id);
  var sql = "SELECT FROM user WHERE authID=:authID";
  db.query(sql, {params:{authID:id}}).then(function(results){
    if(results.length === 0){
      done('등록된 회원이 아닙니다.');
      // res.redirect('/auth/login');
    } else {
      done(null, results[0]);
    }
  });
});
// 이게 뭐였는지 기억이 안남.....................(ㅠㅠ)
passport.use(new LocalStrategy
  (function (username, password, done){
      var uname = username;
      var pwd = password;
      var sql = 'SELECT * FROM user WHERE authID=:authID';
      db.query(sql, {params:{authID:'local:'+uname}}).then(function(results){
        if(results.length === 0){
          return done(null, false);
        }
        var user = results[0];
        return hasher({password:pwd, salt:user.salt}, function(err, pass, salt, hash){
          if(hash === user.password){
            console.log('LocalStrategy', user);
            done(null, user);
          } else {
            done(null, false);
          }});
      });
  })
);
//로그인페이지에서 사용자의 입력값을 post로 받아 판단 후, redirect 시키는 부분
app.post(
  '/auth/login',
  passport.authenticate(
    'local',
    {
      successRedirect: '/welcome', // 로그인 성공시 - 'welcome' 페이지로 이동
      failureRedirect: '/auth/login', // 로그인 실패시 - 다시 로그인페이지로 복귀
      failureFlash: false
    }
  )
);
//사용자가 회원가입 페이지에서 입력한 값을 post방식으로 받아 DB에 저장하는 부분 (PW암호화 기능 포함)
app.post('/auth/register', function(req, res){
  hasher({password:req.body.password}, function(err, pass, salt, hash){
    var user = {
      authID: 'local:'+req.body.username,
      username:req.body.username,
      password:hash,
      salt:salt,
      displayName:req.body.displayName
    };
    var sql = 'INSERT INTO user(authID,username,password,salt,displayName) VALUES(:authID,:username,:password,:salt,:displayName)';
    db.query(sql,{
      params:user
    }).then(function(results){
      req.login(user, function(err){
          req.session.save(function(){
            res.redirect('/welcome');
        });
      });
    }, function(error){
      console.log(error);
      res.status(500);
    });
  });
});
//회원가입 페이지 (사용자에게 노출되는 부분)
app.get('/auth/register', function(req, res){
  var output = `
  <h1>회원가입</h1>
  <form action="/auth/register" method="post">
    <p>
      <input type="text" name="username" placeholder="username">
    </p>
    <p>
      <input type="password" name="password" placeholder="password">
    </p>
    <p>
      <input type="text" name="displayName" placeholder="displayName">
    </p>
    <p>
      <input type="submit">
    </p>
  </form><br>
  <a href="/stylegallery/main">▶ 메인화면으로 돌아가기</a>
  `;
  res.send(output);
});
//로그인 페이지 (사용자에게 노출되는 부분)
app.get('/auth/login', function(req, res){
  var output = `
  <h1>로그인 페이지입니다.</h1>
  <form action="/auth/login" method="post">
    <p>
      <input type="text" name="username" placeholder="username">
    </p>
    <p>
      <input type="password" name="password" placeholder="password">
    </p>
    <p>
      <input type="submit">
    </p>
  </form><br>
  <a href="/stylegallery/main">▶ 메인화면으로 돌아가기</a>
  `;
  res.send(output);
});
//3000port로 연결시키는 함수
app.listen(3000, function(){
  console.log('Connected 3000 port!!!');
});
