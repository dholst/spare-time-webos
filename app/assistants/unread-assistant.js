var UnreadAssistant = Class.create(BaseItemsAssistant, {
  initialize: function($super) {
    $super()
    this.otherScenes = ["starred", "archived"]
    this.appMenuItems.splice(1, 0, {label: "Sync", command: "sync"})
  },

  retrieveItems: function(success, failure) {
    this.instapaper.getAllUnread(success, failure)
  },

  itemRendered: function(listWidget, item, node) {
    articleSaver.isSaved(item.id, function() {node.down(".saved").show()})
  },

  handleCommand: function($super, event) {
    if("sync" === event.command) {
      this.syncEm()
      event.stop()
    }
    else {
      $super(event)
    }
  },

  syncEm: function() {
    var alreadySaved = function() {}

    var notSaved = function(item) {
      $$("#item" + item.id + " .saving").first().show()

      articleSaver.save(
        item.id, 
        item.textUrl,
        
        function(id) {
          $$("#item" + id + " .saving").first().hide()
          $$("#item" + id + " .saved").first().show()
        },

        function(id) {
          $$("#item" + id + " .saving").first().hide()
        }
      )
    }
    
    this.items.items.each(function(item) {
      articleSaver.isSaved(item.id, alreadySaved, notSaved.curry(item))
    })
  }
})