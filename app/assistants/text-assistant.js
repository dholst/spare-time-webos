var TextAssistant = Class.create(BaseAssistant, {
  initialize: function($super, item) {
    $super()
    this.item = item
  },

  setup: function($super) {
    $super()
    this.controller.setupWidget(Mojo.Menu.commandMenu, {}, {items: [{label: "...", command: "choices"}]});
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
    if(event.type == Mojo.Event.command && event.command == 'choices') {
      items = []

      this.addCommand(items, this.item.archiveUrl, 'Archive')
      this.addCommand(items, this.item.starUrl, 'Star')
      this.addCommand(items, this.item.unstarUrl, 'Unstar')
      this.addCommand(items, this.item.deleteUrl, 'Delete')

      this.controller.popupSubmenu({
        placeNear: event.originalEvent.target,
        items: items,
        onChoose: this.handlePopupChoice.bind(this)
      })
    }
  },

  addCommand: function(items, url, label) {
    if(url) {
      items.push({label: label, command: label})
    }
  },

  handlePopupChoice: function(choice) {
    var url
    var success

    if(choice == 'Archive') {
      url = this.item.archiveUrl

      success = function() {
        this.controller.stageController.popScene(true)
      }.bind(this)
    }

    if(choice == 'Delete') {
      url = this.item.deleteUrl

      success = function() {
        this.controller.stageController.popScene(true)
      }.bind(this)
    }

    if(choice == 'Star') {
      url = this.item.starUrl

      success = function() {
        this.item.unstarUrl = this.item.starUrl
        this.item.starUrl = null
      }.bind(this)
    }

    if(choice == 'Unstar') {
      url = this.item.unstarUrl

      success = function() {
        this.item.starUrl = this.item.unstarUrl
        this.item.unstarUrl = null
      }.bind(this)
    }

    if(url) {
      this.spinnerOn("Working...")

      new Ajax.Request(url, {
        method: "get",
        onSuccess: success,
        onComplete: function() {this.spinnerOff()}.bind(this)
      })
    }
  }
})