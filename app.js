var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')), function(req,res,next){	
  req.db = db;
  next();
})

app.get('/', (req, res) => {   
  res.render('retrievenewslist');
});

// app.use('/', indexRouter);
// app.use('/users', usersRouter);


// // catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   next(createError(404));
// });

// // error handler
// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};

//   // render the error page
//   res.status(err.status || 500);
//   res.render('error');
// });

var monk = require('monk');
const { json } = require('express/lib/response');
var db = monk('127.0.0.1:27017/assignment1');

function renderHTML(docs, pageIndex){
  var json_obj = new Object();

  json_obj.news = ``;
  json_obj.pageIndex = ``;

  if (docs.length == 0) {
    json_obj.news += `<br>`;
    json_obj.pageIndex += `
      <a href = "#" onclick="loadNewsList(1)">1</a>
    `
    return json_obj;
  }

  var pages = Math.ceil(docs.length / 5);

  // if last page
  if (pageIndex == pages) {
    for (var i = 5 * (pages - 1); i < docs.length; i++){
      var doc = docs[i];
      var news_html = `
        <br>
        <h3><a href = "displayNewsEntry?newsID=${doc._id}">${doc.headline}</a></h3>
        <p class="newsfeed_time">${doc.time.toLocaleString()}</p>
        <p>${doc.content.split(' ').slice(0, 10).join(' ') + "..."}</p>
      `
      json_obj.news += news_html;
    }
  } else {
    for (var i = 5 * (pageIndex - 1); i < 5 * pageIndex; i++){
      var doc = docs[i];
      var news_html = `
        <br>
        <h3><a href = "displayNewsEntry?newsID=${doc._id}">${doc.headline}</a></h3>
        <p class="newsfeed_time">${doc.time.toLocaleString()}</p>
        <p>${doc.content.split(' ').slice(0, 10).join(' ') + "..."}</p>
      `
      json_obj.news += news_html;
    }
  }

  for (var i = 0; i < pages; i++) {
    if (i + 1 == pageIndex) {
      var pageIndex_html = `
      <a href = "#" style="color:red" onclick="loadNewsList(${i+1})">${i+1}</a>
      `
    } else {
    var pageIndex_html = `
      <a href = "#" onclick="loadNewsList(${i+1})">${i+1}</a>
    `
    }
    json_obj.pageIndex += pageIndex_html;
  }
  json_obj.num_of_entries = docs.length;
  return json_obj;
}

app.get('/retrievenewslist', function (req, res) {
  const pageIndex = req.query.pageIndex;
  const search_field = req.query.search;

  var news_col = db.get("newsList");
  if (
    search_field === null ||
    search_field === "" ||
    typeof search_field === "undefined"
  ) {
    news_col.find({}, { sort: { time: -1 } }).then((docs) => {
          return renderHTML(docs, pageIndex);
      })
      .then((response) => {
          var login_status = 0;
          if (!!req.cookies.userID) {
            login_status = 1;
          }

          response.login_status = login_status;
          res.send(JSON.stringify(response));
      });
  } else {
    news_col
      .find({ headline: { $regex: search_field, $options: 'i'} }, { sort: { time: -1 } })
      .then((docs) => {
          return renderHTML(docs, pageIndex);
      })
      .then((response) => {
        var login_status = 0;
        if (!!req.cookies.userID) {
          login_status = 1;
        }

        response.login_status = login_status;
        res.send(JSON.stringify(response));
      });
  }
})

app.get('/displayNewsEntry', function (req, res) {
  const newsID  = req.query.newsID;
  var news_col = db.get("newsList");
  var user_col = db.get("userList");

  news_col.findOne(monk.id(newsID)).then((doc) => {
    var comments = doc.comments.sort((a, b) =>
      new Date(b.time) > new Date(a.time) ? 1 : new Date(a.time) > new Date(b.time) ? -1 : 0
    );

    var userIDs = [];
    for (var i = 0; i < comments.length; i++) {
      if (!userIDs.includes(comments[i].userID)) {
        userIDs.push(comments[i].userID);
      }
    }

    user_col.find({_id: { $in: userIDs}}).then((users_list) => {
      for (var i = 0; i < comments.length; i++) {
        for (var j = 0; j < users_list.length; j++) {
          if (typeof(comments[i].userID) == "string") {
            if (comments[i].userID == users_list[j]._id) {
              comments[i].name = users_list[j].name;
              comments[i].icon = users_list[j].icon;
              break;
            }
          } else {
            if (comments[i].userID.equals(users_list[j]._id)) {
              comments[i].name = users_list[j].name;
              comments[i].icon = users_list[j].icon;
              break;
            }
          }
        }
      }

      var login_status = 0;
      if (!!req.cookies.userID) {
        login_status = 1;
      }

      res.render("displayNewsEntry", {news: doc, comments: comments, login_status: login_status});
    })
  });
});

app.post('/handlePostComment', function(req, res) {
  const comment = req.body.comment;
  const newsID = req.body.newsID;
  const posted_time = req.body.current_time;
  const latest_comment_time = req.body.latest_comment_time;
  const userID = req.cookies.userID;

  var json_response = new Object();
  var news_col = db.get("newsList");
  var user_col = db.get("userList");

  var new_comment = new Object();
  new_comment.userID = userID;
  new_comment.time = posted_time;
  new_comment.comment = comment;


  news_col.findOne(monk.id(newsID)).then((news) => {
    var comments = news.comments;
    comments.unshift(new_comment);
    news_col.update({_id: monk.id(newsID)}, {$set: {comments: comments}}).then((result) => {
      news_col.findOne(monk.id(newsID)).then((updated_news) => {
        var updated_comments_list = updated_news.comments.sort((a, b) =>
        b.time > a.time ? 1 : a.time > b.time ? -1 : 0);

        var latest_comments = []
        console.log(updated_comments_list.length);
        if (latest_comment_time == "undefined") {
          latest_comments = updated_comments_list;
        } else {
          for (var i = 0; i < updated_comments_list.length; i++) {
            if (typeof updated_comments_list[i].time != "string") {
              updated_comments_list[i].time = updated_comments_list[i].time.toLocaleString();
            }
            console.log(new Date(updated_comments_list[i].time) > new Date(latest_comment_time));
            console.log(updated_comments_list[i].time);
            console.log(latest_comment_time);
            if (updated_comments_list[i].time > latest_comment_time) {
              latest_comments.push(updated_comments_list[i]);
            }
          }
        }
        console.log(updated_comments_list);
        console.log(latest_comments);

        var userIDs = [];
        for (var i = 0; i < latest_comments.length; i++) {
          if (!userIDs.includes(latest_comments[i].userID)) {
            userIDs.push(latest_comments[i].userID);
          }
        }

        user_col.find({_id: { $in: userIDs}}).then((users_list) => {
          for (var i = 0; i < latest_comments.length; i++) {
            for (var j = 0; j < users_list.length; j++) {
              if (typeof(latest_comments[i].userID) == "string") {
                if (latest_comments[i].userID == users_list[j]._id) {
                  latest_comments[i].name = users_list[j].name;
                  latest_comments[i].icon = users_list[j].icon;
                  break;
                }
              } else {
                if (latest_comments[i].userID.equals(users_list[j]._id)) {
                  latest_comments[i].name = users_list[j].name;
                  latest_comments[i].icon = users_list[j].icon;
                  break;
                }
              }
            }
          }

          json_response.comments = latest_comments;
          console.log(latest_comment_time);
          console.log(json_response.comments);
          res.send(JSON.stringify(json_response));
        });
      });
    });
  });
});

app.get('/login', function(req, res) {
  const newsID = req.query.newsID;
  res.render("login", {newsID: newsID});
})

app.get('/handleLogin', function(req, res) {
  const username = req.query.username;
  const password = req.query.password;

  var user_col = db.get("userList");
  user_col.find({name: username}).then((users) => {
    if (users.length === 0) {
      res.send("Username is incorrect");
      return;
    }

    user_col.find({name: username, password: password}).then((users_with_password) => {
      if (users_with_password.length === 0) {
        res.send("Password is incorrect");
        return;
      } else {
        res.cookie('userID', users_with_password[0]._id);
        res.send("login success");
        return;
      }
    });
  });
})

app.get('/handleLogout', function(req, res) {
  res.clearCookie('userID');
  res.redirect('/');
  res.send("logout success");
})

var server = app.listen(8081, () => {
	var host = server.address().address
	var port = server.address().port
	console.log("lab5 app listening at http://%s:%s", host, port)
});

module.exports = app;
