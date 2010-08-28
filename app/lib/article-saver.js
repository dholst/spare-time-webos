var ArticleSaver = {
  isSaved: function(id, yes, no) {
    no = no || function() {}

    DataStore.get(
      "article" + id,

      function(article) {
        if(article) {
          yes()
        }
        else {
          no()
        }
      }
    )
  },

  save: function(id, url, success, failure) {
    DownloadManager.download(url, id, success, failure)
  }
}