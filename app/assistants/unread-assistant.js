var UnreadAssistant = Class.create(BaseItemsAssistant, {
  initialize: function($super) {
    $super()
    this.otherScenes = ["starred", "archived"]
    this.appMenuItems.splice(1, 0, {label: "Sync", command: "sync"})
  },

  retrieveItems: function(success, failure) {
    this.instapaper.getAllUnread(success, failure)
  },

  handleCommand: function($super, event) {
    if("sync" === event.command) {
      Syncer.sync(this.items.items)
    }
    else {
      $super(event)
    }
  }
})