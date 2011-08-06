var HelpAssistant = Class.create(BaseAssistant, {
  setup: function($super) {
    $super();
    this.controller.update('app-name', Mojo.appInfo.title);
  	this.controller.update('app-details', Mojo.appInfo.version + " by " + Mojo.appInfo.vendor);
  },

setup: function ($super) {
    if(thisDevice.isTouchPad()){ 
     this.controller.setupWidget(Mojo.Menu.commandMenu, {}, {items: [{label: "Back", command: "back"}]});
    }
},
 handleCommand: function($super, event) {
    if(Mojo.Event.back == event.type || event.command == 'back') {
      this.controller.stageController.popScene()
    }
    else {
      $super(event)
    }
  }
})

