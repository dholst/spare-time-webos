var articleSaver = {
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
    DownloadManager.download(
      url, 
      id, 
      
      function() {
        DataStore.add("article" + id, {}, success.curry(id))
      },

      failure.curry(id)
    )
  }
}