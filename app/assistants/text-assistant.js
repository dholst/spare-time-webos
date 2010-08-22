var TextAssistant = Class.create(BaseAssistant, {
  initialize: function($super, item) {
    $super()
    this.item = item
  },

  setup: function($super) {
    $super()

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

    this.controller.setupWidget("web-view", {url: this.item.textUrl}, {})
    this.controller.listen("web-view", Mojo.Event.webViewLoadStarted, this.loadStarted = this.loadStarted.bind(this))
    this.controller.listen("web-view", Mojo.Event.webViewLoadStopped, this.loadComplete = this.loadComplete.bind(this))
  },

  loadStarted: function() {
    this.spinnerOn("loading...")
  },

  loadComplete: function() {
    this.spinnerOff()
  },

  handleCommand: function(event) {
    if(event.type == Mojo.Event.command) {
      if(event.command == 'archive') {
        this.archive(this.item)
      }

      if(event.command == 'restore') {
        this.restore(this.item)
      }
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