var Credentials = Class.create({
  initialize: function() {
    this.username = this.usernameCookie().get() || 'darrinholst'
    this.password = this.passwordCookie().get() || 'Password1!'
  },

  save: function() {
    this.usernameCookie().put(this.username)
    this.passwordCookie().put(this.password)
  },

  usernameCookie: function() {
    return this.getCookie("username")
  },

  passwordCookie: function() {
    return this.getCookie("password")
  },

  getCookie: function(name) {
    return new Mojo.Model.Cookie(name)
  }
})