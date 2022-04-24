
function loadNewsList(pageIndex) {
    const search_field = document.getElementById("search_input").value;

    var xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            // handle the pages
            var json_response = xmlhttp.responseText;
            var json_obj = JSON.parse(json_response);

            document.getElementById("news").innerHTML = json_obj.news;
            document.getElementById("pageindex").innerHTML = json_obj.pageIndex;

            var login_status = json_obj.login_status;
            if (login_status == 1) {
                document.getElementById("header").lastElementChild.outerHTML = '<a href="/" onclick="logout()">logout</a>';
            } else {
                document.getElementById("header").lastElementChild.outerHTML = '<a href="login?newsID=0">login</a>';
            }
        }
    }

    xmlhttp.open("GET", "retrievenewslist?pageIndex="+pageIndex+"&search="+search_field, true);
    xmlhttp.send();
}

function postComment() {
    const comment_field = document.getElementById("comment_field").value;
    const latest_comment_element = document.getElementById("latest_comment_time");
    if (latest_comment_element != null) {
        var latest_comment_time = latest_comment_element.innerHTML;
    }
    const newsID = document.getElementById("hiddenNewsID").innerHTML;

    if (comment_field == null || comment_field == ""){
        alert("No comment has been entered");
        return;
    }

    var xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            var json_response = xmlhttp.responseText;
            var json_obj = JSON.parse(json_response);

            console.log(json_obj.comments);

            var new_comments_html = ``;

            for (var i = 0; i < json_obj.comments.length; i++) {
                var comment = json_obj.comments[i];
                if (i == 0) {
                    new_comments_html += `
                    <div class="each_comment">
                        <div>
                            <img class="comments_section" src=${comment.icon} height="80" width="80" alt="Picture of ${comment.name}">
                            <p class="comments_section">${comment.name + ","}</p>
                            <p id=${id="latest_comment_time"}>${comment.time}</p>
                            <p>${comment.comment}</p>
                        </div>
                    </div>
                    `
                } else {
                    new_comments_html += `
                    <div class="each_comment">
                        <div>
                            <img class="comments_section" src=${json_obj.icon} height="80" width="80" alt="Picture of ${json_obj.name}">
                            <p class="comments_section">${json_obj.name + ","}</p>
                            <p id=${id=null}>${json_obj.time}</p>
                            <p>${json_obj.comment}</p>
                        </div>
                    </div>
                    `
                }
            }
            document.getElementById("comment_field").value = "";
            // if there exists a previous comment before...
            if (document.getElementById("latest_comment_time") != null) {
                document.getElementById("latest_comment_time").id = null;
            }
            document.getElementById("comments").innerHTML =
                new_comments_html
                 + 
                document.getElementById("comments").innerHTML; 
        }
    }

    xmlhttp.open("POST", "handlePostComment", true);
    xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send("comment="+ comment_field + "&newsID=" + newsID +"&current_time=" + new Date().toLocaleString() + "&latest_comment_time=" + latest_comment_time);
}

function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (
        username == null || 
        username === "" || 
        typeof(username) === "undefined" || 
        password == null || 
        password === "" ||
        typeof(password) === "undefined") {
        
        alert("Please enter username and password");
        return;
    }


    var xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            var message = xmlhttp.responseText;
            if (message === "login success") {
                document.getElementById("body").innerHTML = '<h1>You have successfully logged in</h1>';
            } else {
                document.getElementById("login_message").innerHTML = message;
            }
        }
    }

    xmlhttp.open("GET", "handleLogin?username="+username+"&password="+password, true);
    xmlhttp.send();
}

function logout() {

    var xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            var message = xmlhttp.responseText;
            if (message === "logout success") {
                document.getElementById("header").lastElementChild.outerHTML = '<a href="login?newsID=0">login</a>';
            }
        }
    }

    xmlhttp.open("GET", "handleLogout", true);
    xmlhttp.send();
}