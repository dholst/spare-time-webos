var Instapaper = Class.create({
  login: function(credentials, success, failure, offline) {
    Instapaper.credentials = credentials;

    var req = new Ajax.Request("http://www.instapaper.com/user/login", {
      method: "post",
      timeout: 5000,
      parameters: {username: credentials.username, password: credentials.password},
      onFailure: offline,
      onSuccess: this.loginComplete.bind(this, success, failure)
    });
  },

  loginComplete: function(success, failure, response) {
    if(response.responseText.match(/form.*action="\/user\/login/)) {
      failure();
    }
    else {
      success();
    }
  },

  add: function(url, title, success, failure) {
    var parameters = {
      username: Instapaper.credentials.username,
      password: Instapaper.credentials.password,
      url: url
    };

    if(title && title.strip().length) {
      parameters.title = title;
    }
    else {
      parameters['auto-title'] = 1;
    }

    var req = new Ajax.Request("http://www.instapaper.com/api/add", {
      method: "post",
      parameters: parameters,
      onSuccess: success,
      onFailur: failure
    });
  },

  getAllUnread: function(success, failure) {
    var req = new Ajax.Request("http://www.instapaper.com/u", {
      method: "get",
      onSuccess: this.parseItems.bind(this, success),
      onFailure: failure
    });
  },

  getArchived: function(success, failure) {
    var req = new Ajax.Request("http://www.instapaper.com/archive", {
      method: "get",
      onSuccess: this.parseItems.bind(this, success),
      onFailure: failure
    });
  },

  getStarred: function(success, failure) {
    var req = new Ajax.Request("http://www.instapaper.com/starred", {
      method: "get",
      onSuccess: this.parseItems.bind(this, success),
      onFailure: failure
    });
  },

  getFolder: function(url, success, failure) {
    var req = new Ajax.Request(url, {
      method: "get",
      onSuccess: this.parseItems.bind(this, success),
      onFailure: failure
    });
  },

  absoluteUrl: function(a) {
    return a ? a.href.replace(/file:\/\//, 'http://www.instapaper.com') : null;
  },

  parseItems: function(success, response) {
    var folders = [];
    var items = [];
    var div = document.createElement("div");
    div.innerHTML = response.responseText.replace(/<img.*>/g, '');

    $(div).select("div.article_item").each(function(rawItem) {
      var item = {};

      item.id = rawItem.getAttribute("data-article-id");
      var title = rawItem.down("div.article_inner_item").down("div.title_row").down("a");

      if(title) {
        item.title = title.innerHTML.unescapeHTML().replace(/&nbsp;/g, ' ');

        var host = rawItem.down("span.host").down("a").href;
        item.url = host;
        var start = host.indexOf("https://");
        if (start < 0) {
            start = host.indexOf("http://") + "http://".length;
        } else {
            start += "https://".length;
        }
        var end = host.indexOf("/", start);
        item.host = host.substring(start, end).replace("www.","");

        var textUrl = this.absoluteUrl(title);
        item.textUrl = textUrl;

        var deleteUrl = rawItem.down("a.delete_link");
        item.deleteUrl = this.absoluteUrl(deleteUrl);

        var archiveUrl = rawItem.down("a.archive_button");

        if(archiveUrl) {
          item.archiveUrl = this.absoluteUrl(archiveUrl);
        }

        var restoreUrl = rawItem.down("a.restore_button");
        item.restoreUrl = this.absoluteUrl(restoreUrl);

        var starUrl = rawItem.down("a.star_toggle");
        item.starUrl = this.absoluteUrl(starUrl);

        if(starUrl) {
          item.starred = starUrl.getAttribute("class").indexOf("starred") >= 0 ? 'on' : '';
        }
          
        //var preview = rawItem.down("div.article_preview");
        //item.preview = preview ? preview.innerHTML : "";
        //console.error("Preview: " + item.preview);

        rawItem.select("a.moveTo").each(function(moveTo) {
          item.moveTo = item.moveTo || [];
          var name = moveTo.down("span").innerHTML.strip();

          if(name == "Read Later") {
            name = "Unread";
          }

          item.moveTo.push({url: this.absoluteUrl(moveTo), name: name});   
        }.bind(this));

        items.push(item);
      }
    }.bind(this));

    $(div).select("a.side_item").each(function(folder) {
      if(folder.href.include("/folder/")) {
        folders.push({name: folder.innerText.strip(), url: this.absoluteUrl(folder)});
      }
    }.bind(this));

    success(items, folders);
  }
});
