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
      $super()
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
    var itemsToSync = this.items.items
    var syncEm = function() {Syncer.sync(itemsToSync)}

    if(new Mojo.Model.Cookie("syncAcknowledged").get()) {
      syncEm()
    }
    else {
      this.controller.showAlertDialog({
        title: "Experimental",
        message: "Syncing articles for offline use is currently an experimental feature. If you run into any problems or have suggestions for improvements please let me know at sparetime@semicolonapps.com",
        choices:[{label: "OK", value:"ok", type:'affirmative'}],

        onChoose: function(value) {
          if(value == "ok") {
            new Mojo.Model.Cookie("syncAcknowledged").put(true)
            syncEm()
          }
        }
      })
    }
  }
})