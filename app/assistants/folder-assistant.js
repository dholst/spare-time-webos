var FolderAssistant = Class.create(BaseItemsAssistant, {
  initialize: function($super, name, url) {
    $super()
    this.name = name
    this.url = url
  },

  ready: function($super) {
    $super()
    this.controller.get("header").update(this.name)
  },
  
  setOtherScenes: function() {
    this.otherScenes = [{name: "Unread"}, {name: "Starred"}, {name: "Archived"}]
  },
  
  retrieveItems: function(success, failure) {
    this.instapaper.getFolder(this.url, success, failure)
  }
})