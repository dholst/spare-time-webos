var StarredAssistant = Class.create(BaseItemsAssistant, {
  initialize: function($super) {
    $super()
    this.otherScenes = ["unread", "archived"]
  },

  retrieveItems: function(success, failure) {
    this.instapaper.getStarred(success, failure)
  }
})