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
    console.log(response.responseText)
  }
})