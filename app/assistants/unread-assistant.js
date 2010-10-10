var UnreadAssistant = Class.create(BaseItemsAssistant, {
  initialize: function($super) {
    $super()
    this.appMenuItems.splice(1, 0, {label: "Sync", command: "sync"})
    this.commandMenuItems[0] = {label: "Add", icon: "new", command: "add"}
  },

  setOtherScenes: function() {
    this.otherScenes = [{name: "Starred"}, {name: "Archived"}]
  },

  activate: function($super, refresh) {
    if("refresh" == refresh) {
      this.refresh()
    }
    else {
      $super(refresh)
    }
  },

  retrieveItems: function(success, failure) {
    this.instapaper.getAllUnread(success, failure)
  },

  handleCommand: function($super, event) {
    if("sync" === event.command) {
      this.sync()
    }
    else {
      $super(event)
    }
  },

  sync: function() {
    SpareTime.Metrix.customCounts("Features", "Sync", 1)
    Syncer.sync(this.items.items)
  }
})