var Instapaper = Class.create({
  login: function(credentials, success, failure) {
    new Ajax.Request("http://www.instapaper.com/user/login", {
      method: "post",
      parameters: {username: credentials.username, password: credentials.password},
      onComplete: this.loginComplete.bind(this, success, failure)
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
      onSuccess: this.parseUnreadItems.bind(this, success),
      onFailure: failure
    })
  },

  parseUnreadItems: function(success, response) {
    var items = []
    var div = document.createElement("div")
    div.innerHTML = response.responseText.replace(/<img/g, '')

    $(div).select("#bookmark_list .tableViewCell").each(function(rawItem) {
      var item = {}

      var title = rawItem.down("a.tableViewCellTitleLink")
      item.title = title ? title.innerHTML.unescapeHTML().replace(/&nbsp;/g, ' ') : ""
      item.url = title ? title.href : null

      var host = rawItem.down("span.host")
      item.host = host ? host.innerHTML.strip() : ""

      var textUrl = rawItem.down("a.textButton")
      item.textUrl = "http://www.instapaper.com/m?u=" + escape(item.url)

      var deleteUrl = rawItem.down("a.deleteLink")
      item.deleteUrl = deleteUrl ? deleteUrl.href.replace(/file:\/\//, 'http://www.instapaper.com') : null

      var archiveUrl = rawItem.down("a.archiveButton")
      item.archiveUrl = archiveUrl ? archiveUrl.href.replace(/file:\/\//, 'http://www.instapaper.com') : null

      var starUrl = rawItem.down("a.starToggleUnstarred")
      item.starUrl = starUrl && starUrl.style.display != 'none' ? starUrl.href.replace(/file:\/\//, 'http://www.instapaper.com') : null

      var unstarUrl = rawItem.down("a.starToggleStarred")
      item.unstarUrl = unstarUrl && unstarUrl.style.display != 'none' ? unstarUrl.href.replace(/file:\/\//, 'http://www.instapaper.com') : null

      items.push(item)
    })

    success(items)
  }
})