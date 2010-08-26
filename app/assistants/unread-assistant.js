var UnreadAssistant = Class.create(BaseItemsAssistant, {
  initialize: function($super) {
    $super()
    this.otherScenes = ["starred", "archived"]
  },

  retrieveItems: function(success, failure) {
    this.instapaper.getAllUnread(success, failure)
  },

  getLeftSideCommand: function() {
    return {label: "DL", command: "offline-sync"}
  },

  itemRendered: function(listWidget, item, node) {
    if(articleSaver.isSaved(item.id)) {
      node.down(".saved").show()
    }
  },

  handleCommand: function($super, event) {
    if("offline-sync" === event.command) {
      this.syncEm()
      event.stop()
    }
    else {
      $super(event)
    }
  },

  syncEm: function() {
    this.items.items.each(function(item) {
      if(!articleSaver.isSaved(item.id)) {
        $$("#item" + item.id + " .saving").first().show()

        articleSaver.save(item.id, item.url,
          function(id) {
            $$("#item" + id + " .saving").first().hide()
            $$("#item" + id + " .saved").first().show()
          },

          function(id) {
            $$("#item" + id + " .saving").first().hide()
          }
        )
      }
    })
  }
})