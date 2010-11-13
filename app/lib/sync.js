var Syncer = {
  sync: function(items) {
    this.inProgress = this.inProgress || []

    if(this.inProgress.length == 0) {
      this.inProgress.push.apply(this.inProgress, items)
      this.syncNextOne()
      this.deleteOldOnes(items.collect(function(item) {return item.id}))
    }
  },

  syncNextOne: function() {
    if(this.inProgress.length) {
      this.syncIfNotAlready(this.inProgress[0])
    }
  },

  syncIfNotAlready: function(item) {
    ArticleSaver.isSaved(
      item.id,
      function() {this.removeFromInProgress(item)}.bind(this),
      this.syncOne.bind(this, item)
    )
  },

  syncOne: function(item) {
    Mojo.Event.send(document, SpareTime.Event.articleSaveStarting, {model: item})

    ArticleSaver.save(
      item.id,
      item.textUrl,

      function(ticket) {
        DataStore.add("article" + item.id, {ticket: ticket, id: item.id, textUrl: item.textUrl, title: item.title, host: item.host, starred: 'offline'}, function() {
          DataStore.get("savedArticles", function(savedArticles) {
            savedArticles.push(item.id)
            DataStore.add("savedArticles", savedArticles)
          }, [])
        })

        this.removeFromInProgress(item)
        Mojo.Event.send(document, SpareTime.Event.articleSaveComplete, {model: item})
      }.bind(this),

      function() {
        this.removeFromInProgress(item)
        Mojo.Event.send(document, SpareTime.Event.articleSaveFailed, {model: item})
      }.bind(this)
    )
  },

  removeFromInProgress: function(item) {
    this.inProgress = this.inProgress.reject(function(inProgressItem) {return inProgressItem.id == item.id})
    this.syncNextOne()
  },

  deleteOldOnes: function(ids) {
    DataStore.get("savedArticles", function(savedArticles) {
      savedArticles.each(function(savedId) {
        if(!ids.include(savedId)) {
          this.deleteOne(savedId)
        }
      }.bind(this))
    }.bind(this), [])
  },

  deleteOne: function(id) {
    DataStore.get("article" + id, function(article) {
      if(article) {
        DownloadManager.deleteDownload(article.ticket)

        DataStore.get("savedArticles", function(savedArticles) {
          savedArticles = savedArticles.reject(function(savedArticle) {return savedArticle == id})
          DataStore.add("savedArticles", savedArticles)
        })
      }
    })
  }
}
