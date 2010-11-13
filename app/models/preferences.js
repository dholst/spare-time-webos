Preferences = {
  ALLOW_LANDSCAPE: "allow-landscape",
  FONT_SIZE: "font-size",

  allowLandscape: function() {
    return this.getCookie(this.ALLOW_LANDSCAPE, true)
  },

  setAllowLandscape: function(allowLandscape) {
    this.setCookie(this.ALLOW_LANDSCAPE, allowLandscape)
  },

  fontSize: function() {
    return this.getCookie(this.FONT_SIZE, "small")
  },

  setFontSize: function(fontSize) {
    this.setCookie(this.FONT_SIZE, fontSize)
  },

  getCookie: function(name, defaultValue) {
    var cookie = this.cookieFor(name)

    if(cookie.get() != undefined) {
      return cookie.get()
    }
    else {
      return defaultValue
    }
  },

  setCookie: function(name, value) {
    console.log("setting " + name + " to " + value)
    this.cookieFor(name).put(value)
  },

  cookieFor: function(name) {
    return new Mojo.Model.Cookie(name)
  }
}
