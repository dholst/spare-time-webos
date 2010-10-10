var SpareTime = {
  Metrix: new Metrix(),

  Event: {
    articleSaveStarting: "articleSaveStarting",
    articleSaveComplete: "articleSaveComplete",
    articleSaveFailed: "articleSaveFailed"
  }
}

SpareTime.notify = function(message) {
  Mojo.Controller.getAppController().showBanner({messageText: message}, "", "sparetime")
}