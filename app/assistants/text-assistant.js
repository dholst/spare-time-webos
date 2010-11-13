var TextAssistant = Class.create(BaseAssistant, {
  initialize: function($super, item) {
    $super()
    this.item = item
    this.firstStopAttempt = false
    this.spinner = {spinning: true}
  },

  setup: function($super) {
    $super()

    this.controller.update("title", this.item.title)

    if(this.item.archiveUrl) {
      this.controller.setupWidget(Mojo.Menu.commandMenu, {}, {items: [{label: "Archive", command: "archive"}]});
    }
    else if(this.item.restoreUrl) {
      this.controller.setupWidget(Mojo.Menu.commandMenu, {}, {items: [{label: "Restore", command: "restore"}]});
    }

    this.controller.listen("header", Mojo.Event.tap, this.headerTapped = this.headerTapped.bind(this))
    this.controller.listen("header", Mojo.Event.hold, this.linkOptions = this.linkOptions.bind(this))
    this.controller.listen(document, "keydown", this.keyDown = this.keyDown.bind(this))
    this.controller.listen(document, "keyup", this.keyUp = this.keyUp.bind(this))

    this.setFontSize()
  },

  cleanup: function($super) {
    $super()
    this.controller.stopListening("header", Mojo.Event.tap, this.headerTapped)
    this.controller.stopListening("header", Mojo.Event.hold, this.linkOptions)
    this.controller.stopListening(document, "keydown", this.keyDown)
    this.controller.stopListening(document, "keyup", this.keyUp)
    this.removeAnchorFix()
  },

  activate: function($super, changes) {
    $super()

    if(!this.loaded) {
      ArticleSaver.isSaved(this.item.id,
        function() {
          var url = "file:///media/internal/files/.sparetime/.cache/" + this.item.id + "/index.html"
          this.loadUrl(url)
        }.bind(this),

        function() {
          this.loadUrl(this.item.textUrl)
        }.bind(this)
      )
    }

    if(changes && changes.fontSizeChanged) {
      this.setFontSize()
    }
  },

  setFontSize: function() {
    var content = this.controller.get("content")
    content.removeClassName("small")
    content.removeClassName("medium")
    content.removeClassName("large")
    content.addClassName(Preferences.fontSize())
  },

  loadUrl: function(url) {
    var self = this;
    self.spinnerOn("retrieving article")

    new Ajax.Request(url, {
      method: "GET",

      onSuccess: function(response) {
        self.controller.update('content', response.responseText)
        self.loaded = true
      },

      onFailure: function() {
        console.log("AHHHH CRAP")
      },

      onComplete: function() {
        DataStore.get(self.item.id + "scroller", function(scrollState) {
          self.spinnerOff()
          self.addAnchorFix()

          if(scrollState) {
            self.controller.getSceneScroller().mojo.setState(scrollState, true)
          }
        })
      }
    })
  },

  linkOptions: function(event) {
    this.headerHeld = true

    var items = [
      {label: "Copy It", command: "copy-url"},

      {label: "Tweet It", items: [
        {label: "Bad Kitty", command: "send-to-bad-kitty"}
      ]},

      {label: "Share It", items: [
        {label: "Email", command: "send-to-email"},
        {label: "SMS", command: "send-to-sms"}
      ]}
    ]

    if(this.item.moveTo) {
      var moveSelections = {label: "Move It", items: []}

      this.item.moveTo.each(function(moveTo) {
        moveSelections.items.push({label: moveTo.name, command: moveTo.url})
      })

      items.push(moveSelections)
    }

    this.controller.popupSubmenu({
      placeNear: $("header"),
      items: items,

      onChoose: function(command) {
        switch(command) {
          case "copy-url":
            this.copyUrl()
            break

          case "send-to-bad-kitty":
            this.sendToBadKitty()
            break

          case "send-to-email":
            this.sendToEmail()
            break

          case "send-to-sms":
            this.sendToSms()
            break

          default:
            this.moveToFolder(command)
            break
        }
      }.bind(this)
    })
  },

  moveToFolder: function(url) {
    if(url && url.startsWith("http://")){
      this.callAndReturn(url)
    }
  },

  copyUrl: function() {
    this.controller.stageController.setClipboard(this.item.url);
    SpareTime.notify("URL copied to clipboard")
  },

  sendToBadKitty: function() {
    this.controller.serviceRequest("palm://com.palm.applicationManager", {
      method: "open",

      parameters: {
        id: "com.superinhuman.badkitty",
        params: {action: "tweet", tweet: this.item.title + "\n\n" + this.item.url}
      },

      onFailure: this.offerToInstallApp.bind(this, "Bad Kitty", "com.superinhuman.badkitty")
    })
  },

  sendToEmail: function() {
    this.controller.serviceRequest("palm://com.palm.applicationManager", {
      method: "open",

      parameters: {
  			id: "com.palm.app.email",
        params: {summary: this.item.title, text: this.item.title + "\n\n" + this.item.url}
      }
    })
  },

  sendToSms: function() {
    this.controller.serviceRequest("palm://com.palm.applicationManager", {
      method: "open",

      parameters: {
  			id: "com.palm.app.messaging",
        params: {messageText: this.item.title + "\n\n" + this.item.url}
      }
    })
  },

  offerToInstallApp: function(name, id) {
    this.controller.showAlertDialog({
      title: $L(name + " is not installed"),
      message: $L(name + " is not installed. Would you like to install it?"),

      choices:[
        {label:$L("Yes"), value:"yes", type:"affirmative"},
        {label:$L("No"), value:"no", type:"dismissal"}
      ],

      onChoose: function(value){
        if("yes" == value){
          this.controller.serviceRequest("palm://com.palm.applicationManager", {
            method:"open",
            parameters:{target: "http://developer.palm.com/appredirect/?packageid=" + id}
          })
        }
      }
    })
  },

  keyDown: function(event) {
    if("Meta" == event.keyIdentifier) {
      this.metaKey = true
    }
  },

  keyUp: function(event) {
    if("Meta" == event.keyIdentifier) {
      this.metaKey = false
    }
  },

  headerTapped: function(event) {
    if(this.headerHeld) {
      this.headerHeld = false
    }
    else if(this.metaKey) {
      this.linkOptions()
    }
    else if(this.item.url) {
      this.controller.serviceRequest("palm://com.palm.applicationManager", {
        method: "open",
        parameters: {
          id: "com.palm.app.browser",
          params: {
            target: this.item.url
          }
        }
      })
    }
  },

  handleCommand: function($super, event) {
    if(Mojo.Event.back == event.type) {
      DataStore.add(this.item.id + "scroller", this.controller.getSceneScroller().mojo.getState())
    }
    else if(event.command == 'archive') {
      this.archive(this.item)
    }
    else if(event.command == 'restore') {
      this.restore(this.item)
    }
    else {
      $super(event)
    }
  },

  archive: function(item) {
    this.callAndReturn(item.archiveUrl)
  },

  restore: function(item) {
    this.callAndReturn(item.restoreUrl)
  },

  callAndReturn: function(url) {
    new Ajax.Request(url, {method: "get"})
    this.controller.stageController.popScene(this.item)
  },

  //
  // Prevent tapping link while scrolling, from http://github.com/deliciousmorsel/Feeds/blob/master/app/assistants/view-article-assistant.js
  //

  getTimestamp: function() {
    var d = new Date();
    return Math.floor(d.getTime() / 1000);
  },

  addAnchorFix: function() {
    this.anchorTap = this.anchorTap.bind(this)
    this.onDragStart = this.onDragStart.bind(this)
    this.onDragging = this.onDragging.bind(this)
    this.onDragEnd = this.onDragEnd.bind(this)
    this.onMouseUp = this.onMouseUp.bind(this)

    $$("#content a").each(function(anchor) {
      anchor.observe('click' , this.anchorTap)
    }.bind(this))

    var scroller = this.controller.getSceneScroller()
    scroller.observe(Mojo.Event.dragStart , this.onDragStart)
    scroller.observe(Mojo.Event.dragging , this.onDragging)
    scroller.observe(Mojo.Event.dragEnd , this.onDragEnd)
    scroller.observe('mouseup' , this.onMouseUp)
  },

  removeAnchorFix: function() {
    $$("#content a").each(function(anchor) {
      anchor.stopObserving('click' , this.anchorTap)
    }.bind(this))

    var scroller = this.controller.getSceneScroller()
    scroller.stopObserving(Mojo.Event.dragStart , this.onDragStart)
    scroller.stopObserving(Mojo.Event.dragging , this.onDragging)
    scroller.stopObserving(Mojo.Event.dragEnd , this.onDragEnd)
    scroller.stopObserving('mouseup' , this.onMouseUp)
  },

  anchorTap: function(e) {
    if(this.lastDrag && this.lastDrag > this.getTimestamp() - 1) {
      e.preventDefault()
      e.stop()
      return false
    }
  },

  onDragStart: function() {
    this.lastDrag = this.getTimestamp()
  },

  onDragging: function() {
    this.lastDrag = this.getTimestamp()
  },

  onMouseUp: function() {
  },

  onDragEnd: function() {
    this.lastDrag = this.getTimestamp()
    this.onMouseUp()
  }
})
