var BaseItemsAssistant = Class.create(BaseAssistant, {
  initialize: function($super) {
    $super()
    this.instapaper = new Instapaper()
    this.items = {items: []}
    this.allowItemDelete = true
    this.commandMenuItems = [{}, {}, {label: "Refresh", icon: "refresh", command: "refresh"}]
  },

  setup: function($super) {
    $super()
    this.controller.setupWidget("items", {itemTemplate: 'items/item', onItemRendered: this.itemRendered.bind(this), swipeToDelete: this.allowItemDelete}, this.items)
    this.controller.setupWidget(Mojo.Menu.commandMenu, {}, {items: this.commandMenuItems})
    this.controller.listen("items", Mojo.Event.listTap, this.itemTapped = this.itemTapped.bind(this))
    this.controller.listen("items", Mojo.Event.listDelete, this.itemDeleted = this.itemDeleted.bind(this))
    this.controller.listen("switch", Mojo.Event.tap, this.swapScene = this.swapScene.bind(this))
    this.controller.listen(document, SpareTime.Event.articleSaveStarting, this.itemSaveStarted = this.itemSaveStarted.bind(this))
    this.controller.listen(document, SpareTime.Event.articleSaveComplete, this.itemSaveComplete = this.itemSaveComplete.bind(this))
    this.controller.listen(document, SpareTime.Event.articleSaveFailed, this.itemSaveFailure = this.itemSaveFailure.bind(this))
  },

  cleanup: function($super) {
    $super()
    this.controller.stopListening("items", Mojo.Event.listTap, this.itemTapped)
    this.controller.stopListening("switch", Mojo.Event.tap, this.swapScene)
    this.controller.stopListening(document, SpareTime.Event.articleSaveStarting, this.itemSaveStarted)
    this.controller.stopListening(document, SpareTime.Event.articleSaveComplete, this.itemSaveComplete)
    this.controller.stopListening(document, SpareTime.Event.articleSaveFailed, this.itemSaveFailure)
  },

  ready: function($super) {
    $super()
    this.refresh()
  },

  activate: function($super, itemToRemove) {
    $super()
    
    if(itemToRemove) {
      for(var i = 0; i < this.items.items.length; i++) {
        if(this.items.items[i] == itemToRemove) {
          this.items.items.splice(i, 1)
          this.controller.modelChanged(this.items)
        }
      }
    }
  },

  itemsRetrieved: function(items) {
    this.items.items.clear()
    this.items.items.push.apply(this.items.items, items)
    this.controller.modelChanged(this.items)
    this.spinnerOff()
  },

  retrieveFailure: function() {
    this.spinnerOff()
    this.controller.stageController.pushScene("bail", "Unable to retrieve items")
  },

  itemTapped: function(event) {
    if(event.originalEvent.target.hasClassName('star')) {
      event.originalEvent.target.toggleClassName('on')
      new Ajax.Request(event.item.starUrl, {method: 'get'})
    }
    else if(event.item.textUrl) {
      this.controller.stageController.pushScene("text", event.item)
    }
  },

  itemDeleted: function(event) {
    if(event.item.deleteUrl) {
      new Ajax.Request(event.item.deleteUrl, {method: "post"})
    }
  },

  handleCommand: function($super, event) {
    if("refresh" == event.command) {
      this.refresh()
    }
    else {
      $super(event)
    }
  },

  swapScene: function() {
    items = []

    this.otherScenes.each(function(scene) {
      items.push({label: scene.capitalize(), command: scene})
    })

    this.controller.popupSubmenu({
      placeNear: $("switch"),
      items: items,

      onChoose: function(command) {
        if(command) {
          this.controller.stageController.swapScene(command)
        }
      }.bind(this)
    })
  },

  refresh: function() {
    this.firstTime = false
    this.spinnerOn("retrieving articles...")
    this.retrieveItems(this.itemsRetrieved.bind(this), this.retrieveFailure.bind(this))
  },

  itemRendered: function(listWidget, item, node) {
    ArticleSaver.isSaved(item.id, function() {node.down(".saved").show()})
  },

  itemSaveStarted: function() {
    this.controller.sceneElement.querySelector("#item" + event.model.id + " .saving").show()
  },

  itemSaveComplete: function() {
    this.controller.sceneElement.querySelector("#item" + event.model.id + " .saving").hide()
    this.controller.sceneElement.querySelector("#item" + event.model.id + " .saved").show()
  },

  itemSaveFailure: function() {
    this.controller.sceneElement.querySelector("#item" + event.model.id + " .saving").hide()
  }
})