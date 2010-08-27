StageAssistant = Class.create({
  setup: function() {
    SpareTime.Metrix.postDeviceData()
    
    DataStore.initialize(
      function() {
        this.controller.pushScene("login")
      }.bind(this),
    
      function() {
        this.controller.pushScene("bail", "error initializing datastore")
      }.bind(this)
    )
  }
})
