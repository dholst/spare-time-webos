var OfflineAssistant = Class.create(BaseItemsAssistant, {
  initialize: function($super) {
    $super()
    this.allowItemDelete = false
  },

  setOtherScenes: function() {
    this.otherScenes = []
  },

  retrieveItems: function(success, failure) {
    this.savedItems = []

    DataStore.get("savedArticles", function(savedArticles) {
      this.savedArticleIds = savedArticles
      this.getNextOne(success, failure)
    }.bind(this), [])
  },

  getNextOne: function(success, failure) {
    if(this.savedArticleIds.length == 0) {
      success(this.savedItems)
    }
    else {
      DataStore.get("article" + this.savedArticleIds.pop(), function(article) {
        if(article) {
          this.savedItems.push(article)
        }

        this.getNextOne(success, failure)
      }.bind(this))
    }
  }
})