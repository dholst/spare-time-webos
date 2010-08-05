var Credentials = Class.create({
  initialize: function() {
    this.username = new Mojo.Model.Cookie("username").get()
    this.password = new Mojo.Model.Cookie("password").get()
  }
})