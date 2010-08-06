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
      var host = rawItem.down("span.host")
      var textUrl = rawItem.down("a.textButton")

      item.title = title ? title.innerHTML.unescapeHTML().replace(/&nbsp;/g, ' ') : "Unknown"
      item.url = title ? title.href : null
      item.host = host ? host.innerHTML : ""
      item.textUrl = "http://www.instapaper.com/m?u=" + escape(item.url)

      items.push(item)
    })

    success(items)
  }
})