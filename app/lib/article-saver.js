var articleSaver = {
  foo: false,

  isSaved: function(id) {
    this.foo = !this.foo
    return this.foo
  },

  save: function(id, url, success, failure) {
    success.delay(2, id)
  }
}