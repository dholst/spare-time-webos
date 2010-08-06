var TextAssistant = Class.create(BaseAssistant, {
  initialize: function($super, url) {
    $super()
    this.url = url
  },

  setup: function($super) {
    $super()
    this.controller.setupWidget("web-view", {url: this.url}, {})
    this.controller.listen("web-view", Mojo.Event.webViewLoadStarted, this.loadStarted = this.loadStarted.bind(this))
    this.controller.listen("web-view", Mojo.Event.webViewLoadStopped, this.loadComplete = this.loadComplete.bind(this))
  },

  loadStarted: function() {
    this.spinnerOn("loading...")
  },

  loadComplete: function() {
    this.spinnerOff()
  }
})