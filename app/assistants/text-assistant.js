var TextAssistant = Class.create(BaseAssistant, {
  initialize: function($super, item) {
    $super()
    this.item = item
    this.firstStopAttempt = false
    this.spinner = {spinning: true}
  },

  setup: function($super) {
    $super()

    this.controller.stageController.setWindowOrientation("free")
    this.controller.setupWidget("loading", {spinnerSize: "small"}, this.spinner)
    this.controller.setupWidget("web-view", {url: ""}, {})

    if(this.item.archiveUrl) {
      this.controller.setupWidget(Mojo.Menu.commandMenu, {}, {items: [{label: "Archive", command: "archive"}]});
    }
    else if(this.item.restoreUrl) {
      this.controller.setupWidget(Mojo.Menu.commandMenu, {}, {items: [{label: "Restore", command: "restore"}]});
    }
    
    this.controller.listen("web-view", Mojo.Event.webViewLoadStarted, this.loadStarted = this.loadStarted.bind(this))
    this.controller.listen("web-view", Mojo.Event.webViewLoadStopped, this.loadComplete = this.loadComplete.bind(this))
  },

  activate: function($super) {
    $super()

    ArticleSaver.isSaved(this.item.id,
      function() {
        var url = "file:///media/internal/files/.sparetime/.cache/" + this.item.id + "/index.html"
        this.loadUrl(url)
      }.bind(this),

      function() {
        this.loadUrl(this.item.textUrl)
      }.bind(this)
    )
  },

  loadUrl: function(url) {
    this.controller.get("web-view").mojo.openURL(url)
  },

  cleanup: function($super) {
    $super()
    this.controller.stageController.setWindowOrientation("up")
    this.controller.stopListening("web-view", Mojo.Event.webViewLoadStarted, this.loadStarted)
    this.controller.stopListening("web-view", Mojo.Event.webViewLoadStopped, this.loadComplete)
  },

  loadStarted: function() {
    this.spinner.spinning = true
    this.controller.modelChanged(this.spinner)
  },
  
  loadComplete: function() {
    this.spinner.spinning = false
    this.controller.modelChanged(this.spinner)
  },

  handleCommand: function($super, event) {
    if(event.command == 'archive') {
      this.archive(this.item)
    }
    else if(event.command == 'restore') {
      this.restore(this.item)
    }
    else {
      $super(event)
    }
  },

  archive: function(item) {
    new Ajax.Request(item.archiveUrl, {method: "get"})
    this.controller.stageController.popScene(this.item)
  },

  restore: function(item) {
    new Ajax.Request(item.restoreUrl, {method: "get"})
    this.controller.stageController.popScene(this.item)
  }
})