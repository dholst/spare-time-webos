StageAssistant = Class.create({
  setup: function() {
    SpareTime.Metrix.postDeviceData()
    this.controller.pushScene("login")
  }
})
