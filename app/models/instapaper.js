var Instapaper = Class.create({
  login: function(credentials, success, failure, offline) {
    new Ajax.Request("http://www.instapaper.com/user/login", {
      method: "post",
      timeout: 5000,
      parameters: {username: credentials.username, password: credentials.password},
      onFailure: offline,
      onSuccess: this.loginComplete.bind(this, success, failure)
    })
  },

  loginComplete: function(success, failure, response) {
    if(response.responseText.match(/form.*action="\/user\/login/)) {
      failure()
    }
    else {
      success()
    }
  },

  getAllUnread: function(success, failure) {
    new Ajax.Request("http://www.instapaper.com/u", {
      method: "get",
      onSuccess: this.parseItems.bind(this, success),
      onFailure: failure
    })
  },

  getArchived: function(success, failure) {
    new Ajax.Request("http://www.instapaper.com/archive", {
      method: "get",
      onSuccess: this.parseItems.bind(this, success),
      onFailure: failure
    })
  },

  getStarred: function(success, failure) {
    new Ajax.Request("http://www.instapaper.com/starred", {
      method: "get",
      onSuccess: this.parseItems.bind(this, success),
      onFailure: failure
    })
  },

  absoluteUrl: function(a) {
    return a ? a.href.replace(/file:\/\//, 'http://www.instapaper.com') : null
  },

  parseItems: function(success, response) {
    var items = []
    var div = document.createElement("div")
    div.innerHTML = response.responseText.replace(/<img/g, '')

    $(div).select("#bookmark_list .tableViewCell").each(function(rawItem) {
      var item = {}

      var title = rawItem.down("a.tableViewCellTitleLink")

      if(title) {
        item.id = rawItem.id.match(/\d+/)[0]
        item.title = title ? title.innerHTML.unescapeHTML().replace(/&nbsp;/g, ' ') : ""
        item.url = title ? title.href : null

        var host = rawItem.down("span.host")
        item.host = host ? host.innerHTML.strip() : ""

        var textUrl = rawItem.down("a.textButton")
        item.textUrl = "http://www.instapaper.com/m?u=" + escape(item.url)

        var deleteUrl = rawItem.down("a.deleteLink")
        item.deleteUrl = this.absoluteUrl(deleteUrl)

        var archiveUrl = rawItem.down("a.archiveButton")

        if(archiveUrl && archiveUrl.innerHTML == "Delete") {
          item.deleteUrl = this.absoluteUrl(archiveUrl)
        }
        else if(archiveUrl) {
          item.archiveUrl = this.absoluteUrl(archiveUrl)
        }

        var restoreUrl = rawItem.down("a.restoreButton")
        item.restoreUrl = this.absoluteUrl(restoreUrl)

        var starUrl = rawItem.down("a.starToggleStarred")
        item.starUrl = this.absoluteUrl(starUrl)

        if(starUrl) {
          item.starred = starUrl.style.display != 'none' ? 'on' : ''
        }

        items.push(item)

      }
    }.bind(this))

    success(items)
  }
})