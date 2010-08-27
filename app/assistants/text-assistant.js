var TextAssistant = Class.create(BaseAssistant, {
  initialize: function($super, item) {
    $super()
    this.item = item
  },

  setup: function($super) {
    $super()

    this.controller.stageController.setWindowOrientation("free")

    var command

    if(this.item.archiveUrl) {
      command = {label: "Archive", command: "archive"}
    }
    else if(this.item.restoreUrl) {
      command = {label: "Restore", command: "restore"}
    }

    if(command) {
      this.controller.setupWidget(Mojo.Menu.commandMenu, {}, {items: [command]});
    }

    var url = "file:///media/internal/files/.sparetime/.cache/" + this.item.id + "/index.html"
    this.controller.setupWidget("web-view", {url: url}, {})
    this.controller.listen("web-view", Mojo.Event.webViewLoadStarted, this.loadStarted = this.loadStarted.bind(this))
    this.controller.listen("web-view", Mojo.Event.webViewLoadStopped, this.loadComplete = this.loadComplete.bind(this))
  },

  cleanup: function($super) {
    $super()
    this.controller.stageController.setWindowOrientation("up")
  },

  loadStarted: function() {
    this.spinnerOn("loading...")
  },

  loadComplete: function() {
    this.spinnerOff()
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