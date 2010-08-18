var UnreadAssistant = Class.create(BaseItemsAssistant, {
  initialize: function($super) {
    $super()
    this.otherScenes = ["starred", "archived"]
  },
  
  retrieveItems: function(success, failure) {
    this.instapaper.getAllUnread(success, failure)
  }
})