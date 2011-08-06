var SpareTime = SpareTime || {}
SpareTime.MainStageName = "main"

var AppAssistant = Class.create({
  handleLaunch: function(launchParameters) {
    if(launchParameters && "add_url" == launchParameters.action) {
      console.log("ADDING URL")
      var credentials = new Credentials()

      if(credentials.username) {
        Instapaper.credentials = credentials
        new Instapaper().add(launchParameters.url, launchParameters.title, this.addSuccess.bind(this), this.addFailure.bind(this))
      }
      else {
        this.showMessage("Must login using Spare Time first")
      }
    }
  },

  addSuccess: function() {
    this.showMessage("URL added to Spare Time")
  },

  addFailure: function() {
    this.showMessage("Unable to add URL to Spare Time")
  },

  showMessage: function(message) {
    Mojo.Controller.getAppController().showBanner(message, {source: "sparetime"})
  }
});

var thisDevice={};

thisDevice.isTouchPad = function() {
  if(Mojo.Environment.DeviceInfo.modelNameAscii.indexOf("ouch")>-1) {
    return true;
  }
  if(Mojo.Environment.DeviceInfo.screenWidth==1024){ return true; }
  if(Mojo.Environment.DeviceInfo.screenHeight==1024){ return true; }
};

