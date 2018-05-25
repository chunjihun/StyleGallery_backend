var express = require('express');
var bodyParser = require('body-parser');
var client = require('cheerio-httpcli');
var app = express();
var fs = require("fs");
app.use(bodyParser.urlencoded({ extended : false }));
app.locals.pretty = true;

app.set('view engine', 'jade');
app.set('views', './views_orientdb');
app.use(express.static('public'));
var OrientDB = require('orientjs');
var server = OrientDB({
   host:       'localhost',
   port:       2424,
   username:   'root',
   password:   '789513'
});

// OrientDB 내 'tovintage' 테이블에 크롤링 데이터 삽입
var output='';
var siteUrl="http://tovintage.co.kr";
client.fetch(siteUrl, {}, function (err, $, res, body) {
  var list = $(".xans-product-1 li");
  var productNum=1;
  list.each(function(){
    var db = server.use('o2');
    var sql = "INSERT INTO tovintage(productNum, imgUrl, pageUrl) VALUES(:productNum, :imgUrl, :pageUrl)";
    var param = {
      params : {
        productNum : productNum,
        imgUrl : $(this).find("a img").attr("src"),
        pageUrl : siteUrl+$(this).find(".price_box a").attr("href")
      }
    };
    db.query(sql, param).then(function(output){
      console.log(output);
    });
    productNum++;
  });
});

// 콘솔 출력 테스트용 코드
// client.fetch("http://tovintage.co.kr/", {}, function (err, $, res, body) {
//   var list = $(".xans-product-1 li");
//   var i=1;
//   list.each(function(){
//     var imgUrl = "상품URL: http:"+$(this).find("a img").attr("src");
//     var pageUrl = "사이트링크: http://tovintage.co.kr"+$(this).find(".price_box a").attr("href");
//     console.log(i+"/"+imgUrl);
//     console.log(i+"/"+pageUrl);
//     i++;
//   });
// });
