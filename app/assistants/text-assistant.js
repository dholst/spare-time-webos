var TextAssistant = Class.create(BaseAssistant, {
  initialize: function($super, item) {
    $super()
    this.item = item

    for(foo in item) {
      console.log(foo + " = " + item[foo])
    }
  },

  setup: function($super) {
    $super()
    this.controller.setupWidget(Mojo.Menu.commandMenu, {}, {items: [{label: "...", command: "choices"}]});
    this.controller.setupWidget("web-view", {url: this.item.textUrl}, {})
    this.controller.listen("web-view", Mojo.Event.webViewLoadStarted, this.loadStarted = this.loadStarted.bind(this))
    this.controller.listen("web-view", Mojo.Event.webViewLoadStopped, this.loadComplete = this.loadComplete.bind(this))
  },

  loadStarted: function() {
    this.spinnerOn("loading...")
  },

  loadComplete: function() {
    this.spinnerOff()
  },

  handleCommand: function(event) {
    if(event.type == Mojo.Event.command && event.command == 'choices') {
      items = []

      this.addCommand(items, this.item.archiveUrl, 'Archive')
      this.addCommand(items, this.item.starUrl, 'Star')
      this.addCommand(items, this.item.unstarUrl, 'Unstar')
      this.addCommand(items, this.item.deleteUrl, 'Delete')

      this.controller.popupSubmenu({
        placeNear: event.originalEvent.target,
        items: items,
        onChoose: this.handlePopupChoice.bind(this)
      })
    }
  },

  addCommand: function(items, url, label) {
    if(url) {
      items.push({label: label, command: label})
    }
  },

  handlePopupChoice: function(choice) {
    var url
    
    if(choice == 'Archive') {
      url = this.item.archiveUrl
    } 
    
    if(choice == 'Delete') {
      url = this.item.deleteUrl
    }
    
    if(choice == 'Star') {
      url = this.item.starUrl
    } 
    
    if(choice == 'Unstar') {
      url = this.item.unstarUrl
    } 
    
    if(url) {
      new Ajax.Request(url, {method: "get"})
    }
  }
})