StageAssistant = Class.create({
  setup: function() {
    SimpleReader.Metrix.postDeviceData()
    this.controller.pushScene("login")
  }
})
