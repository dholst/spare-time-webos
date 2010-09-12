var ArchivedAssistant = Class.create(BaseItemsAssistant, {
  setOtherScenes: function() {
    this.otherScenes = [{name: "Unread"}, {name: "Starred"}]
  },
  
  retrieveItems: function(success, failure) {
    this.instapaper.getArchived(success, failure)
  }
})