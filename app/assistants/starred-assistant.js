var StarredAssistant = Class.create(BaseItemsAssistant, {
  setOtherScenes: function() {
    this.otherScenes = [{name: "Unread"}, {name: "Archived"}]
  },

  retrieveItems: function(success, failure) {
    this.instapaper.getStarred(success, failure)
  }
})