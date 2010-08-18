var ArchivedAssistant = Class.create(BaseItemsAssistant, {
  initialize: function($super) {
    $super()
    this.otherScenes = ["unread", "starred"]
  },
  
  retrieveItems: function(success, failure) {
    this.instapaper.getArchived(success, failure)
  }
})