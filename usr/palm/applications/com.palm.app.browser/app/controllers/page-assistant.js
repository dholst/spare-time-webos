/*
 * Copyright 2008-2009 Palm, Inc. All rights reserved.
 */

var WebKitErrors = {
	ERR_SYS_FILE_DOESNT_EXIST: 14,
	ERR_WK_FLOADER_CANCELLED: 1000,
	ERR_CURL_FAILURE: 2000,
	ERR_CURL_COULDNT_RESOLVE_HOST: 2006,
	ERR_CURL_SSL_CACERT: 2060
};

/**
 * The assistant for the browser page scene.
 */
var BrowserServerStatus;

function PageAssistant(params){

	// Record our launch parameters for later use in adapter setup.
	this.launchParams = params.launchParams;
	this._submittedUrl = this.launchParams.target;
	this._orientation = this.launchParams.orientation || 'up'; // Orientation is UP by default.
	this.currPageBookmark = this.launchParams.bookmark; ///< Bookmark for the current page

	this.cmdMenuModel = undefined;
	this.currentUrl = undefined;
	this.currentTitle = undefined;
	this.loadingPage = false;
	this.firstPageLoaded = false;
	this.disableSceneScrolling = false;
	this._editorInPageFocused = false;
	this._spacerHeight = 0;
	this._wkCanGoBack = false; ///< WebKit can go backward
	this._wkCanGoForward = false; ///< WebKit can go forward
	this.hasFocus = true;
	this.imagesToDelete = [];
	this._adapterConnected = true;
	this._isActivated = undefined;
	this._bookmarkDialog = null;
	this._webView = undefined;
	this._disconnectedScrim = null;
	this._disconnectedSpinner = null;
	this._spotlightModeEnabled = false;

	this.historyStore = new HistoryStore({
		database: Mojo.Controller.appController.assistant.getDatabase()
	});
	this.bookmarkStore = new BookmarkStore({
		database: Mojo.Controller.appController.assistant.getDatabase()
	});

	this._onTitleUrlChangeHandler = this._onTitleUrlChange.bind(this);
	this._onLoadProgressHandler = this._onLoadProgress.bind(this);
	this._onLoadStartedHandler = this._onLoadStarted.bind(this);
	this._onLoadStoppedHandler = this._onLoadStopped.bind(this);
	this._onDidFinishDocumentLoadHandler = this._onDidFinishDocumentLoad.bind(this);
	this._onSetMainDocumentErrorHandler = this._onSetMainDocumentError.bind(this);
	this._onCreatePageHandler = this._onCreatePage.bind(this);
	this._onTapRejectedHandler = this._onTapRejected.bind(this);

	this._onDragStartHandler = this._onDragStart.bind(this);
	this._addAsScrollListenerHandler = this._addAsScrollListener.bind(this);
	this._onCardDeactivateHandler = this._onCardDeactivate.bindAsEventListener(this);
	this._onCardActivateHandler = this._onCardActivate.bindAsEventListener(this);
	this._onEditorFocusedHandler = this._onEditorFocused.bind(this);
	this._onKeyDownEventHandler = this._onKeyDownEvent.bind(this);
	this._onKeyPressEventHandler = this._onKeyPressEvent.bind(this);
	this._onKeyUpEventHandler = this._onKeyUpEvent.bind(this);
	this._onAdapterConnectHandler = this._onAdapterConnect.bind(this);
	this._onAdapterDisconnectHandler = this._onAdapterDisconnect.bind(this);
	this._onUpdateHistoryHandler = this._onUpdateHistory.bind(this);
	this._onImageSavedHandler = this._onImageSaved.bind(this);
	this._onUrlRedirectHandler = this._onUrlRedirect.bind(this);
	this._onWebViewResourceHandoffHandler = this._onWebViewResourceHandoff.bind(this);
	this._onWebViewSingleTap = this._onWebViewSingleTap.bind(this);

	// Spotlight handlers (flash support)
	this._onSpotlightStartHandler = this._onSpotlightStart.bind(this);
	this._onSpotlightEndHandler = this._onSpotlightEnd.bind(this);

	this._stopSceneScrolling = this._stopSceneScrolling.bindAsEventListener(this);
}

/**
 * Setup this scene.
 */
PageAssistant.prototype.setup = function() {

	try {
		
		this._updateOrientation();

		// Allow override of 'back' gesture in landscape mode.
		this.controller.useLandscapePageUpDown(true);

		// Create the browser server status control.
		this._browserServerStatus = new BrowserServerStatus(this.controller);
		this._browserServerStatus.setup({
			onConnect: function() {
				if (this.currentUrl) {
					this.openUrl(this.currentUrl);
				}
			}.bind(this)});

		// Setup the download panel
		this._downloadPanel = new DownloadController(this.controller);
		this._downloadPanel.setup();

		this._setupMenus();
		this._setupWebView();

		// save the current scene controller physics parameters
		var scroller = this.controller.getSceneScroller();
		this.savedFlickSpeed = scroller.mojo.kFlickSpeed;
		this.savedFlickRatio = scroller.mojo.kFlickRatio;
		scroller.mojo.updatePhysicsParameters({flickSpeed: 0.12, flickRatio: 0.2});


		// Listen for drag events, and stop them when appropriate
		Mojo.Event.listen(this.controller.getSceneScroller(), Mojo.Event.dragStart, this._stopSceneScrolling, true);

		// Listen for scene scope keyboard events.
		this.controller.listen(this.controller.sceneElement, Mojo.Event.keyup, this._onKeyUpEventHandler);
		this.controller.listen(this.controller.sceneElement, Mojo.Event.keydown, this._onKeyDownEventHandler);
		this.controller.listen(this.controller.sceneElement, Mojo.Event.keypress, this._onKeyPressEventHandler);

		this._webView = this.controller.get('web_view');
		this._webView.addEventListener(Mojo.Event.webViewMimeNotSupported, this._onWebViewResourceHandoffHandler, false);
		this._webView.addEventListener(Mojo.Event.webViewMimeHandoff, this._onWebViewResourceHandoffHandler, false);
		this._webView.addEventListener(Mojo.Event.webViewUrlRedirect, this._onUrlRedirectHandler, false);
		this._webView.addEventListener(Mojo.Event.webViewUpdateHistory, this._onUpdateHistoryHandler, false);
		this._webView.addEventListener(Mojo.Event.webViewImageSaved, this._onImageSavedHandler, false);

		// Spotlight mode
		this._webView.addEventListener(Mojo.Event.webViewPluginSpotlightStart, this._onSpotlightStartHandler, false);
		this._webView.addEventListener(Mojo.Event.webViewPluginSpotlightEnd, this._onSpotlightEndHandler, false);
	}
	catch (e) {
		Mojo.Log.logException(e, 'PageAssistant#setup');
	}
};

PageAssistant.prototype.cleanup = function() {

	try {
		// Clean up the controls
		this._pageControls.cleanup();

		// Clean up the downloads - stops anything currently downloading.	
		this._downloadPanel.cleanup();

		// Remove listeners on the webview widget.
		this._webView.removeEventListener(Mojo.Event.webViewMimeNotSupported, this._onWebViewResourceHandoffHandler, false);
		this._webView.removeEventListener(Mojo.Event.webViewMimeHandoff, this._onWebViewResourceHandoffHandler, false);
		this._webView.removeEventListener(Mojo.Event.webViewUrlRedirect, this._onUrlRedirectHandler, false);
		this._webView.removeEventListener(Mojo.Event.webViewUpdateHistory, this._onUpdateHistoryHandler, false);
		this._webView.removeEventListener(Mojo.Event.webViewImageSaved, this._onImageSavedHandler, false);

		// Remove Spotlight mode support
		this._webView.removeEventListener(Mojo.Event.webViewPluginSpotlightStart, this._onSpotlightStartHandler, false);
		this._webView.removeEventListener(Mojo.Event.webViewPluginSpotlightEnd, this._onSpotlightEndHandler, false);

		this.controller.stopListening(this.controller.sceneElement, Mojo.Event.keyup, this._onKeyUpEventHandler);
		this.controller.stopListening(this.controller.sceneElement, Mojo.Event.keydown, this._onKeyDownEventHandler);
		this.controller.stopListening(this.controller.sceneElement, Mojo.Event.keypress, this._onKeyPressEventHandler);

		Mojo.Event.stopListening( this.controller.getSceneScroller(), Mojo.Event.dragStart, this._stopSceneScrolling, true);

		// Delete old history
		var now = new Date();
		this.historyStore.deleteHistoryBefore(now.addDays(-this.kMaxHistoryDays));

		// restore scroller params
		this.controller.getSceneScroller().mojo.updatePhysicsParameters({flickSpeed: this.savedFlickSpeed, flickRatio: this.savedFlickRatio});

		this._addressBar.cleanup();
	}
	catch (e) {
		Mojo.Log.logException(e, 'PageAssistant#cleanup');
	}
};

PageAssistant.prototype._onImageSaved = function(event) {
	
	if (event.status) {
	
		var filepath = this._makeTitleFromUrl(event.filepath);
		var message = $L('Saving "#{path}"').interpolate({path: filepath});
		Mojo.Controller.appController.showBanner(
			{messageText: message}, 
			{banner: 'image', filename: event.filepath});
	} 
};

PageAssistant.prototype._makeTitleFromUrl = function(url) {
	
	if (url) {

		var result = url.match(/^.*\/([^\/]+)$/);
		if ((result !== null) && (result.length > 1)) {
			return result[1];
		}
	}
	
	return url;
};

PageAssistant.prototype._updateOrientation = function() {
	
	var targetWindow = this.controller.window;
	if (targetWindow.PalmSystem && targetWindow.PalmSystem.setWindowOrientation) {
		this._orientation = Mojo.Controller.appController.getScreenOrientation();
		targetWindow.PalmSystem.setWindowOrientation(this._orientation);
	}
};

PageAssistant.prototype.orientationChanged = function(orientation) {

	// Switch the orientation of the menu spacer or other components..
	//Mojo.Log.info("ORIENTATIONCHANGED: old: %s, new: %s", this._orientation, orientation);
	var targetWindow = this.controller.window;
	if (this._orientation === orientation) {
		return;
	}

	// Update the web browser UI components to reflect the new orientation.
	// Setting 'free' after an override doesn't currently work so we are
	// always explicit.
	this._orientation = orientation;
	if (targetWindow.PalmSystem && targetWindow.PalmSystem.setWindowOrientation && this._isActivated) {
		if (this._bookmarkDialog) {
			// When not 'activated' or have the bookmark/launcher dialog up we force 'up'
			this._orientation = 'up';
		}

		// Calling this will cause another orientationChanged event to we
		// protect against recursion by testing current orientation against
		// the new setting on re-entry.
		targetWindow.PalmSystem.setWindowOrientation(this._orientation);
	}

	this._setOrientation(this._orientation);
};

/*
 * Disable the scene scroller to prevent the web view from scrolling underneath whatever is being displayed on top of it
 */
PageAssistant.prototype.disableSceneScroller = function() {
	this.disableSceneScrolling = true;
};

/*
 * Enable the scene scroller (everything back to normal)
 */
PageAssistant.prototype.enableSceneScroller = function() {
	this.disableSceneScrolling = false;
};

/*
 * If the scene must not be scrolled then stop the propagation of the DragStart event
 */
PageAssistant.prototype._stopSceneScrolling = function(event) {

	if (!this.disableSceneScrolling) {
		return;
	}
	var scroller = event.down.target.up('div[x-mojo-element=Scroller]');

	if (scroller.id === this.controller.getSceneScroller().id) {
		event.stopPropagation();
	}
};

/**
 * Show the startpage which displays the list of current bookmarks.
 */
PageAssistant.prototype._showStartPage = function() {

	this._webView.mojo.focus();
	this._addressBar.hide();
	this.chrome.hide();
	// If asked to show the startpage then stop any pending loads
	this._webView.mojo.stopLoad();
	this._handleAction('userstop');
	this.controller.stageController.pushScene({
			name: 'startpage',
			transition: Mojo.Transition.crossFade
		},
		{
			lastUrl: this.currentUrl,
			orientation: this._orientation
		});
};

PageAssistant.prototype.activate = function(message) {

	this._isActivated = true;
	try {
		
		this._updateOrientation();
		
		// Update any pending web preferences changes
		AppAssistant.WebPreferences.activate(this._webView.mojo);

		// Signal we are interested in showing browser server status.
		this._browserServerStatus.showActivateState();

		this.controller.document.addEventListener(Mojo.Event.activate, this._onCardActivateHandler, false);
		this.controller.document.addEventListener(Mojo.Event.deactivate, this._onCardDeactivateHandler, false);

		var webView = this.controller.get('web_view');
		webView.addEventListener(Mojo.Event.webViewLinkClicked, this._onLinkClickedHandler, true);
		webView.addEventListener(Mojo.Event.webViewTitleUrlChanged, this._onTitleUrlChangeHandler, true);
		webView.addEventListener(Mojo.Event.webViewLoadProgress, this._onLoadProgressHandler, true);
		webView.addEventListener(Mojo.Event.webViewLoadStarted, this._onLoadStartedHandler, true);
		webView.addEventListener(Mojo.Event.webViewLoadStopped, this._onLoadStoppedHandler, true);
		webView.addEventListener(Mojo.Event.webViewSetMainDocumentError, this._onSetMainDocumentErrorHandler, false);
		webView.addEventListener(Mojo.Event.webViewCreatePage, this._onCreatePageHandler, true);
		webView.addEventListener(Mojo.Event.webViewDidFinishDocumentLoad, this._onDidFinishDocumentLoadHandler, true);

		webView.addEventListener(Mojo.Event.webViewTapRejected, this._onTapRejectedHandler, true);
		webView.addEventListener(Mojo.Event.dragStart, this._onDragStartHandler, true);
		webView.addEventListener(Mojo.Event.webViewEditorFocused, this._onEditorFocusedHandler, true);
		webView.addEventListener(Mojo.Event.webViewServerConnect, this._onAdapterConnectHandler, false);
		webView.addEventListener(Mojo.Event.webViewServerDisconnect, this._onAdapterDisconnectHandler, false);
		webView.addEventListener('singletap', this._onWebViewSingleTap, true);

		this.controller.getSceneScroller().addEventListener(Mojo.Event.scrollStarting,
			this._addAsScrollListenerHandler, false);

		// Process any activate parameters passed to use from the assistant that popped us.
		// We defer the processing to allow any native components to become 'active' after
		// activate is complete.
		if (message) {
			switch (message.type) {
				case 'bookmarks':
					this.openBookmark.bind(this, message.payload).defer();
					break;

				case 'history' :
					this.openUrl.bind(this, message.payload).defer();
					break;

				case 'bookmarks-dialog':
					// This is to work around the current implementation
					// calling the page assistants showBookmarkDialog from the
					// bookmark assistant. This will be rearchitected.
					this.showBookmarkDialog(BookmarkDialogAssistant.editBookmarkTask, message.payload);
					break;

				case 'customizeicon':
					// The customizeicon dialog was dismissed via a save/error.
					break;

				case 'startpage':
					if (message.payload) {
						// If we arrived here as a result of a bookmark tap
						// of a types URL from the startpage we make sure to
						// clear the session history
						webView.mojo.clearHistory();
						this.openUrl.bind(this, message.payload).defer();
					} else {
						// forward from the startpage?
						this._pageControls.showIdle();
					}
					break;
					
				case 'startpage-bookmark':
					if (message.payload) {
						// If we arrived here as a result of a bookmark tap
						// with a bookmark payload from the startpage we make 
						// sure to clear the session history
						webView.mojo.clearHistory();
						this.openBookmark.bind(this, message.payload).defer();
					} 
					break;

				default:
					Mojo.Log.warn("Unknown Activate message type: " + message.type);
					break;
			}
		}

		// Activate the addressbar.
		this._addressBar.closeSearchResults();
		this._addressBar.startObserving();
		
		// Update the current history state. We could of had a history wipe 
		// before this seen became activate again.
		this._updateHistoryState();
		
		// On an activate we make sure to refocus the webview widget
		// so we have a focused element. Workaround for some focus issue
		// on input fields in the webview widget when move from startpage 
		// back to the page assistant.
		this._webView.mojo.focus();
	}
	catch (e) {
		Mojo.Log.logException(e, 'PageAssistant.activate');
	}
};

PageAssistant.prototype.deactivate = function() {

	try {
		this._isActivated = false;

		// Signal we are not interesting in showing the browser server status.
		this._browserServerStatus.showDeactivateState();

		// Cleanup focus handlers.
		this.controller.document.removeEventListener(Mojo.Event.activate, this._onCardActivateHandler, false);
		this.controller.document.removeEventListener(Mojo.Event.deactivate, this._onCardDeactivateHandler, false);

		var webView = this.controller.get('web_view');
		webView.removeEventListener(Mojo.Event.webViewTitleUrlChanged, this._onTitleUrlChangeHandler, true);
		webView.removeEventListener(Mojo.Event.webViewLoadProgress, this._onLoadProgressHandler, true);
		webView.removeEventListener(Mojo.Event.webViewLoadStarted, this._onLoadStartedHandler, true);
		webView.removeEventListener(Mojo.Event.webViewLoadStopped, this._onLoadStoppedHandler, true);
		webView.removeEventListener(Mojo.Event.webViewSetMainDocumentError, this._onSetMainDocumentErrorHandler, false);
		webView.removeEventListener(Mojo.Event.webViewCreatePage, this._onCreatePageHandler, true);
		webView.removeEventListener(Mojo.Event.webViewDidFinishDocumentLoad, this._onDidFinishDocumentLoadHandler, true);

		webView.removeEventListener(Mojo.Event.webViewTapRejected, this._onTapRejectedHandler, true);
		webView.removeEventListener(Mojo.Event.dragStart, this._onDragStartHandler, true);
		webView.removeEventListener(Mojo.Event.webViewEditorFocused, this._onEditorFocusedHandler, true);
		webView.removeEventListener(Mojo.Event.webViewUpdateHistory, this._onUpdateHistoryHandler, false);
		webView.removeEventListener(Mojo.Event.webViewServerConnect, this._onAdapterConnectHandler, false);
		webView.removeEventListener(Mojo.Event.webViewServerDisconnect, this._onAdapterDisconnectHandler, false);
		webView.removeEventListener('singletap', this._onWebViewSingleTap, true);

		this.controller.getSceneScroller().removeEventListener(Mojo.Event.scrollStarting,
			this._addAsScrollListenerHandler, false);

		this._addressBar.stopObserving();
	}
	catch (e) {
		Mojo.Log.logException(e, 'deactivate');
	}
};

/**
 * Called by the webview widget when setup is complete?
 */
PageAssistant.prototype.ready = function() {

	try {
		var self = this;

		// Update the web preferences.
		AppAssistant.WebPreferences.activate(this._webView.mojo);

		// Set the initial orientation.
		this._setOrientation(this._orientation);

		// Register any system redirects for this application.
		if (this._webView) {
			this._webView.mojo.addUrlRedirect('^file:', true, '', 0);
			this._webView.mojo.addSystemRedirects('com.palm.app.browser');
		}
		
		// Test the network and setup our network alerts.
		var netAlert = function(params){

			// Show a custom network alert dialog.
			self.controller.showAlertDialog({
				
				onChoose: function(value) {
					
					if (value === 'help') {
						AppAssistant.launchNetworkHelp();
					}
				},
				
				title: $L('No Internet Connection'),
				message: $L('Please enable networking before using the browser.'),
				choices: [{
						label: $L('Help'),
						value: 'help',
						type: 'dismiss',
						buttonClass: 'secondary'
					}, {
						label: $L('OK'),
						value: 'OK',
						type: 'alert',
						buttonClass: 'primary'
					}]
			});
			
			// We have shown a dialog so defocus anything on the scene to avoid
			// input.
			self._addressBar.blur();
		};

		AppAssistant.Network.addNetworkCheckedMethods({
			target: this,
			methods: ['openUrl', '_goBack', '_goForward', '_reload'],
			onNetworkDown: netAlert
		});

		// Never display the search results on first launch.
		this._addressBar.enableTitleView();
		this._addressBar.closeSearchResults();
		this._pageControls.showIdle();

		// Hide the address bar if we have a URL or identifier
		if (this._getStartupUrl() || (this._getStartupPageIdentifier() !== undefined)) {
			this._addressBar.hide();
			this.chrome.hide();
		}

		// On first launch we alway attempt to connect to the network if we are not online.
		if (!AppAssistant.Network.online) {

			ConnectionWidget.connect({
				type: 'data',
				onSuccess: function(response){
					// If the connection widget was previously cancelled and we
					// are under its internal timeout limit then popup the network
					// alert dialog.
					if (response === "WiFi-UserCancelled") {
						// Show the simple alert
						netAlert({});
					}
				}
			}, self.controller.stageController);
		}

		if (this.currPageBookmark) {
			this.openBookmark(this.currPageBookmark);
		}
		else {
			// One way we can currently load a new webpage is to pass a
			// URL via the setup params to the webview widget so we need
			// to strip the URL of trailing/preceeding whitespace before
			// submission.
			var url = this._getStartupUrl();
			if (url) {
				this.openUrl(url);
			}
		}
	}
	catch (e) {
		Mojo.Log.logException(e, 'ready');
	}
};

PageAssistant.prototype._onAdapterConnect = function(event) {
	this._browserServerStatus.connected();
};

PageAssistant.prototype._onAdapterDisconnect = function(event) {
	Mojo.Log.error("Disconnected from browser server.");
	this._browserServerStatus.disconnected();
};

PageAssistant.prototype._showOkAlert = function(title, message)
{
	this.controller.showAlertDialog({
		title: title, message: message,
		choices:[{label:$L('OK'), value:'1', type:'dismiss'}]
	});
};

PageAssistant.prototype._getImageType = function(url, mimeType)
{
	url = url || '';
	mimeType = mimeType || '';
	var suffix = '';
	try {
		suffix = UrlUtil.getResourceExtension(url);
		if (suffix === null) {
			suffix = '';
		}
	}
	catch (e) {}

	suffix = suffix.toLowerCase();
	mimeType = mimeType.toLowerCase();

	if (suffix === 'jpg' || suffix === 'jpeg' || suffix === 'jpe' || mimeType === 'image/jpeg') {
		return 'jpeg';
	}
	else if (suffix === 'bmp' || mimeType === 'image/bmp') {
		return 'bmp';
	}
	else if (suffix === 'png' || mimeType === 'image/png') {
		return 'png';
	}
	else if (suffix === 'gif' || mimeType === 'image/gif') {
		return 'gif';
	}
	else {
		return 'unknown';
	}
};

/**
 * Is this image type supported by the Photo app and as a wallpaper
 * image?
 */
PageAssistant.prototype._supportedImageType = function(url, mimeType)
{
	switch (this._getImageType(url, mimeType)) {
		case 'jpeg':
		case 'png':
		case 'bmp':	// We only support 24/32 bit BMP's and don't differentiate here
			// GIF not yet supported
			return true;
		default:
			return false;
	}
};


PageAssistant.prototype._onWebViewSingleTap = function(event) {

	try {
		var tapPt = Element.viewportOffset(this._webView);
		tapPt.left = event.centerX - tapPt.left;
		tapPt.top  = event.centerY - tapPt.top;

		if (event.altKey) {

			var popupItems = [
				{label: $L('Open In New Card'), command:'openNew'},
				{label: $L('Share Link'), command:'shareUrl'},
				{label: $L('Copy URL'), command:'copyUrl'},
				{label: $L('Copy to Photos'), command:'copyToPhotos'},
				{label: $L('Share Image'), command:'shareImage'},
				{label: $L('Set Wallpaper'), command:'setWallpaper'}
			];

			var findItem = function(command) {
				var i;
				for (i = 0; i < popupItems.length; i++) {
					if (popupItems[i].command === command) {
						return popupItems[i];
					}
				}
			};

			var selectedCommand;
			var imageInfo;

			var saveImageCallback = function(succeeded, path) {
				if (succeeded) {
					switch (selectedCommand) {
						case 'shareImage':
							this._shareImage(imageInfo, path);
							break;
						case 'setWallpaper':
							this._setWallpaper(path);
							break;
						case 'copyToPhotos':
							this._showOkAlert($L('Image Saved'),
									$L('The image was successfully added to your photo album.'));
							break;
					}
				}
				else {
					this._showOkAlert($L('Error Saving Image'),
							$L('There was an error saving the selected image.'));
				}
			}.bind(this);

			var urlInfo = {};
			var popupSelectFunc = function(value) {
				selectedCommand = value;
				switch (value) {
					case 'openNew':
						this._newBrowserPage(urlInfo.url);
						break;
					case 'shareUrl':
						this._shareUrl(urlInfo.url, urlInfo.desc, false /*no capture*/);
						break;
					case 'copyUrl':
						this.controller.stageController.setClipboard(urlInfo.url);
						break;
					case 'copyToPhotos':
						this._webView.mojo.saveImageAtPoint(tapPt.left, tapPt.top, "/media/internal", saveImageCallback);
						break;
					case 'shareImage':
						this._webView.mojo.saveImageAtPoint(tapPt.left, tapPt.top, "/tmp", saveImageCallback);
						break;
					case 'setWallpaper':
						this._webView.mojo.saveImageAtPoint(tapPt.left, tapPt.top, "/media/internal", saveImageCallback);
						break;
				}
			}.bind(this);

			var imageInfoResponse = function(response) {

				imageInfo = response;
				var usedItems = [];
				if (urlInfo.url) {
					usedItems.push( findItem('openNew') );
					usedItems.push( findItem('shareUrl') );
					usedItems.push( findItem('copyUrl') );
				}

				if (response.src) {
					usedItems.push( findItem('shareImage') );
				}

				if (this._supportedImageType(response.src, response.mimeType)) {
					usedItems.push( findItem('copyToPhotos') );
					// Disabled until we have cropping UI
					//usedItems.push( findItem('setWallpaper') );
				}

				if (usedItems.length) {
					this.controller.popupSubmenu({ onChoose: popupSelectFunc, items: usedItems });
				}
			}.bind(this);

			var urlInspectResponse = function(response) {

				urlInfo = response || {};
				this._webView.mojo.getImageInfoAtPoint(tapPt.left, tapPt.top, imageInfoResponse);
			}.bind(this);

			this._webView.mojo.inspectUrlAtPoint(tapPt.left, tapPt.top, urlInspectResponse);
		}
	}
	catch (e) {
		Mojo.Log.logException(e);
	}
};

PageAssistant.prototype._onCardActivate = function(event) {

	this.hasFocus = true;

	// Update any pending web preferences changes
	AppAssistant.WebPreferences.activate(this._webView.mojo);

	// If we are 'full-screen' the show activate version of the browser
	// server status.
	this._browserServerStatus.showActivateState();
	
};

PageAssistant.prototype._onCardDeactivate = function(event) {

	this.hasFocus = false;

	// If we have been 'minimized' then show the deactivated version of
	// the browser server status.
	this._browserServerStatus.showDeactivateState();

	// Bookmark dialog must be dismissed if the window loses focus
	if (this._bookmarkDialog) {
		this._bookmarkDialog.mojo.close();
		this._bookmarkDialog = null;
	}

	// Dismiss any search lists and switch to 'title' mode if we
	// are not at the start page otherwise switch to URL mode.
	this._addressBar.closeSearchResults();
	this._addressBar.enableTitleView();
	
	if (this._spotlightModeEnabled) {
		this._webView.mojo.pluginSpotlightRemove();
	}
	
};

PageAssistant.prototype._addAsScrollListener = function(event) {

	if (event.target === this.controller.getSceneScroller()) {
		event.scroller.addListener(this);
	}
};

PageAssistant.prototype._setupMenus = function() {

	try {
		// Setup the navigation and page load buttons.
		this._pageControls = new PageControls(this.controller);
		// We enable IDLE command button for page-assistant.
		this._pageControls.setup(true);

		// Create the application menus and shortcuts (once the modifier keys work).
		this.appMenuModel = {
			visible: true,
			items: [
				MenuData.ApplicationMenu.NewCard,
				MenuData.ApplicationMenu.AddBookmark,
				MenuData.ApplicationMenu.AddToSpareTime,
				{
					label: $L("Page"),
					items: [
						MenuData.ApplicationMenu.AddToLauncher,
						MenuData.ApplicationMenu.SharePage]
				},
				MenuData.ApplicationMenu.ShowBookmarks,
				MenuData.ApplicationMenu.ShowHistory]
		};

		this.controller.setupWidget(Mojo.Menu.appMenu, undefined, this.appMenuModel);

		// Create the URL Bar
		this._addressBar = new AddressBar(this.controller);
		this._addressBar.setup({
			onPropertyChange: this._onAddressBarPropertyChange.bind(this),
			orientation: this._orientation,
			onSelect: this._onAddressBarSelect.bind(this),
			onEnableSceneScroller: this._onEnableSceneScroller.bind(this)
		});

		// Create the chrome helper.
		this.chrome = new Chrome(this.controller);
		this.chrome.setup({
			elementName: 'view_menu_bkgnd',
			orientation: this._orientation
		});

	} catch(e) {

		Mojo.Log.logException(e, "PageAssistant#_setupMenus");
	}
};

PageAssistant.prototype._onEnableSceneScroller = function(enable) {

	if (enable) {
		this.enableSceneScroller();
	} else {
		this.disableSceneScroller();
	}
};

PageAssistant.prototype._onAddressBarSelect = function(selection) {
	
	if (selection instanceof UrlReference) {
		// It's a bookmark
		this.openBookmark(selection);
	} else {
		// It's a simple string URL otherwise.
		this.openUrl(selection);
	}
};

/**
 * Called when the URL entry field text is submitted. This occurs on
 * both a blur and a user pressing the ENTER key. We therefore test
 * for the cause of the event before performing a URL submission.
 *
 * @param {Object} event
 */
PageAssistant.prototype._onAddressBarPropertyChange = function(propertyChangeEvent){

	try {
		// With the new TextField widget we can query the action that
		// caused this event on the URL text field by looking at the
		// originalEvent property. Nice.
		var url;
		switch (propertyChangeEvent.type) {

			case 'keyCode':

				// If we receive a key event then always show the address bar.
				if (!this._addressBar.isVisible()){
					this._addressBar.show();
				}

				url = propertyChangeEvent.value;
				
				// We keep the title insync with an address update. 
				this._addressBar.setAddressAndTitle(url, UrlUtil.cleanup(url));
				if (propertyChangeEvent.keyCode === Mojo.Char.enter) {
					// Clear the timers and hide the search list.
					this._addressBar.closeSearchResults();

					// Check we have a URL and if not then don't do anything.
					if (url) {
						this.openUrl(this._addressBar.convertInputToUrl(url));
					}
					else {
						this._addressBar.hide();
						this.chrome.hide();
						this._webView.mojo.focus();
					}
				}
				break;

			case 'blur':

				// Always switch to title mode on a blur.
				this._addressBar.enableTitleView();
				this._addressBar.closeSearchResults();

				// Hide the URL bar is we aren't over-scrolled.
				if (!this.chrome.isVisible()) {
					this._addressBar.hide();
					this._webView.mojo.focus();
				}
				break;
				
			case 'mojo-property-change':
			
				// Update the title with the new URL resulting from a copy/paste action.
				url = propertyChangeEvent.value;
				this._addressBar.setAddressAndTitle(url, UrlUtil.cleanup(url));
				break;

			default:
				Mojo.Log.warn("Unknown propertyChangeEvent");
				break;
		}
	}
	catch (e) {
		Mojo.Log.logException(e, '_onAddressBarPropertyChange');
	}
};

PageAssistant.prototype._safeGetSafeStringLength = function(str) {
	if (str === null || str === undefined) {
		return 0;
	}
	else {
		return str.length;
	}
};

PageAssistant.prototype._onEditorFocused = function(event) {

	// If the URL doesn't have focus then set the focus to the
	// webview widget.
	this._editorInPageFocused = event.focused;
};

/**
 * Setup the web view.
 */
PageAssistant.prototype._setupWebView = function() {
	var params = {};

	params.pageIdentifier = this._getStartupPageIdentifier();
	params.showClickedLink = true;

	this.controller.setupWidget('web_view', params);
};

/**
 * Return the page identifier (if there is one) sent with the launch
 * params. This is used when creating a new page.
 */
PageAssistant.prototype._getStartupPageIdentifier = function() {

	if (this.launchParams !== undefined) {
		return this.launchParams.pageIdentifier;
	}
	else {
		return undefined;
	}
};

/**
 * Return the startup URL for this page. This may be passed in as a parameter or
 * and if not then it's the user's preferences. Will return undefined if the
 * launch params also contain a page identifier.
 */
PageAssistant.prototype._getStartupUrl = function() {
	var url = undefined;
	var pageIdentifier = undefined;

	if (this.currPageBookmark !== undefined) {
		url = this.currPageBookmark.url;
	}
	else if (this.launchParams !== undefined && this.launchParams.target !== undefined) {
		url = this.launchParams.target;
		pageIdentifier = this.launchParams.pageIdentifier;
	}
	else {
		var query = location.toString().toQueryParams();
		if (query) {
			url = query.url;
		}
	}

	if (pageIdentifier !== undefined) {
		url = undefined;
	}

	return url;
};

/**
 * Navigate this page to the specified URL.
 * @param {Object} url
 */
PageAssistant.prototype.openUrl = function(newurl) {

	try {
		// This URL the user will submit to the webview widget. We are
		// careful to strip leading/trailing whitespace before submission.
		var url = newurl && newurl.strip();
		this._submittedUrl = url;

		// For fresh pages we make sure the editorInPageFocused flag is cleared.
		// and let the callback event tell us otherwise.
		this._editorInPageFocused = false;
		delete this.currentTitle;
		delete this.currPageBookmark; // will be set after this load starts if loading bookmark

		// HI requirement. Switch the addressbar to a title mode and
		// explicitly set the focus to the webview widget. 
		this._addressBar.setAddressAndTitle(url, UrlUtil.cleanup(url));
		this._addressBar.enableTitleView();
		this._webView.mojo.openURL(url);
		this._webView.mojo.focus();
		this._handleAction('useropen');
	}
	catch (e) {
		Mojo.Log.logException(e, 'openUrl');
	}
};


/**
 * Go to the URL specified by the URL reference and update the bookmark.
 *
 * @param {UrlReference} bookmark The bookmark
 */
PageAssistant.prototype.openBookmark = function(bookmark) {
	try {
		this.openUrl(bookmark.url);
		this.currPageBookmark = bookmark;
		this.bookmarkStore.updateVisitCount(bookmark, function() {
		}, function() {
		});
	}
	catch (e) {
		Mojo.Log.logException(e, 'openBookmark');
	}
};

/**
 * Return the title of the page for display purposes. If there is no
 * title then a cleaned up URL is returned.
 */
PageAssistant.prototype._getDisplayTitle = function() {

	if (this.currentTitle && this.currentTitle.length > 0) {
		return this.currentTitle;
	}
	else {
		return UrlUtil.cleanup(this.currentUrl);
	}
};

PageAssistant.prototype._updateHistory = function() {

	if (!this.currentUrl || (this.currentUrl.length === 0)) {
		return;
	}

	var title = this.currentTitle || null;
	this.historyStore.addHistory(this.currentUrl, title, new Date(),
		function() {},
		function(transaction, err) {
			Mojo.Log.error("Failure adding history entry: code: %d, message:'%s'.", err.code, err.message);
		}
	);
};

/**
 * Called with both the title and URL changes. This event comes *after* loadStopped.
 * @param {Object} event The event object.
 */
PageAssistant.prototype._onTitleUrlChange = function(event) {

	try {
		// Force all titles from this point forward to be single line entities
		// by removing any newlines. We will also strip the title of any leading
		// and trailing spaces. We do all this because many of the visuals expect
		// the title to be a single line.
		this.currentTitle = event.title && event.title.replace(/\n/g, ' ').strip();
		this.currentUrl = event.url;

		// Clear any cached URLs
		this._submittedUrl = undefined;

		// We use the URL changed event to determine if we should show
		// a secure-lock graphic in the title bar.
		if (this.currentUrl && this.currentUrl.toUpperCase().startsWith('HTTPS://')) {
			this._addressBar.enableSSLLock(true);
		} else {
			this._addressBar.enableSSLLock(false);
		}

		// Configure the URL bar to reflect a URL/Title change
		if (!this._addressBar.hasFocus()) {
			var title = this.currentTitle || UrlUtil.cleanup(this.currentUrl);
			this._addressBar.setAddressAndTitle(event.url, title);
			this._addressBar.enableTitleView();
		}

		// Update the command menu and history after a  title change.
		this._updateHistory();
		this._updateHistoryState();
	}
	catch (e) {
		Mojo.Log.logException(e, '_onTitleUrlChange');
	}
};

/**
 * Handle a tap-rejected event on the page. This is only called if the
 * tap is on a non-interactive portion of the page
 */
PageAssistant.prototype._onTapRejected = function(event) {

	try {
		if (!this._webView) {
			return;
		}

		// On a Tap we hide the search list and switch to title and clear
		// any cached URLs.
		this._addressBar.enableTitleView();
		this._addressBar.closeSearchResults();

		// If we are NOT overscrolled then hide the address bar
		if (!this.chrome.isVisible()) {
			this._addressBar.hide();
			this._webView.mojo.focus();
		}
	}
	catch (e) {
		Mojo.Log.logException(e, "_onTapRejected");
	}
};

PageAssistant.prototype._onDragStart = function(event) {

};

PageAssistant.prototype._isResource  = function(uri) {

	// Parse the URL
	try {
		var p = new Poly9.URLParser(uri);

		// Get the protocol and then normalize the text
		var protocol = p.getProtocol();
		if (protocol) {
			protocol = protocol.toLowerCase();
		}

		return (!protocol || (protocol == 'http') || (protocol == 'https'));
	}
	catch (e) {
		return false;
	}
};

PageAssistant.prototype._isValidMimeType = function(mimeType)
{
	return mimeType !== '' && mimeType !== 'unknown';
};

/**
 * Retrieve the information for a given resource.
 *
 * @param {String} uri	The URI of the resource to retrieve the information for.
 * @param {String} mimeType	The mimeType of the resource to retrieve the information for.
 * @param {function} onSuccess	Called when call is successful
 * @param {function} onFailure	Called when call fails
 */
PageAssistant.prototype._getResourceInfo = function(uri, mimeType, onSuccess, onFailure) {

	var params = {uri: uri};

	if (this._isValidMimeType(mimeType)) {
		params.mime = mimeType;
	}

	this.controller.serviceRequest('palm://com.palm.applicationManager/getResourceInfo', {
		parameters: params,
		onSuccess: onSuccess,
		onFailure: onFailure
	});
};

PageAssistant.prototype._newBrowserPage = function(url, pageIdentifier){

	var params = {scene: 'page'};
	if (url !== undefined) {
		params.target = url;
	}
	if (pageIdentifier !== undefined) {
		params.pageIdentifier = pageIdentifier;
	}

	this.controller.serviceRequest('palm://com.palm.applicationManager', {
		method: 'open',
		parameters: {
			'id': 'com.palm.app.browser',
			'params': params
		}
	});
};

/**
 * Stream the resource. The caller should have already called getResourceInfo
 * to determine that this application can stream.
 *
 * @param {String} uri The resource to stream.
 * @param {String} appid The application id to open.
 * @param {String} mimeType uri mime type.
 */
PageAssistant.prototype._streamResource = function(uri, appid, mimeType){

	// Only a few select applications can be
	var crossAppScene = {
		'com.palm.app.videoplayer': 'nowplaying',
		'com.palm.app.streamingmusicplayer': 'nowplaying'
	};
	var params = {target: uri, mimeType: mimeType};
	if (crossAppScene[appid]) {

		var args = { appId: appid, name: crossAppScene[appid] };
		this.controller.stageController.pushScene(args, params);
	}
	else {
		this.controller.serviceRequest('palm://com.palm.applicationManager', {
			method: 'open',
			parameters: {
				'id': appid,
				'params': params
			}
		});
	}
};

/**
 * Download a resource using the download manager.
 *
 * @param {String} uri	The resource to download
 */
PageAssistant.prototype._downloadResource = function(uri) {

	try {
		// Hand the download request to the download controller for managing.
		// We cap the number of current downloads per card. (HI request).
		// We only show banner messages IF the card if not focused. HI request).
		if (this._downloadPanel.count() < 2) {
			
			var self = this;
			var downloadcb = function(success, status) {
				
				var fname = self._makeTitleFromUrl(uri);
				var message;
				
				if (success) {
					switch (status) {
					case 'start':
						if (!self.hasFocus) {
							message = $L('Downloading "#{url}"').interpolate({
								url: fname
							});
							Mojo.Controller.appController.showBanner({
								messageText: message
							}, {
								banner: 'download',
								filename: uri
							});
						}
						break;
						
					case 'complete':
						if (!self.hasFocus) {
							message = $L('Download complete');
							Mojo.Controller.appController.showBanner({
								messageText: message
							}, {
								banner: 'download',
								filename: uri
							});
						}
						break;
						
					case 'abort':
						if (!self.hasFocus) {
							message = $L('Download cancelled');
							Mojo.Controller.appController.showBanner({
								messageText: message
							}, {
								banner: 'download',
								filename: uri
							});
						}
						break;
						
					case 'interrupted':
						if (!self.hasFocus) {
							message = $L('Download interrupted');
							Mojo.Controller.appController.showBanner({
								messageText: message
							}, {
								banner: 'download',
								filename: uri
							});
						}
						break;
						
					case 'progress':
						break;

					default:
						if (!self.hasFocus) {
							message = $L('Download error');
							Mojo.Controller.appController.showBanner({
								messageText: message
							}, {
								banner: 'download',
								filename: uri
							});
						}
						break;
					}							
				} else {
					if (!self.hasFocus) {
						message = $L('Download failed');
						Mojo.Controller.appController.showBanner({
							messageText: message
						}, {
							banner: 'download',
							filename: uri
						});
					}
				}
			};
			
			// Start the download of the give URI and send status messages to the
			// banner IF we do not have focus.
			this._downloadPanel.download(uri, downloadcb);
			
		} else {
			this.controller.showAlertDialog({
				onChoose: function(value) { /* Do Nothing */},
				title: $L('Sorry, Too Many Downloads'),
				message: $L('Please dismiss an existing download before starting another.'),
				choices:[{label:$L('OK'), value:'1', type:'dismiss'}]
			});		
		}
		
	} catch (e) {
		Mojo.Log.logException(e, "#_downloadResource");
	}

	// Hide the chrome & address bar.
	this.chrome.hide();
	this._addressBar.hide();
	this._webView.mojo.focus();
};

/**
 * Open a resource using the applicationManager.
 */
PageAssistant.prototype._openResource = function(uri, mimeType) {

	var params = { target: uri };
	if (mimeType) {
		params.mime = mimeType;
	}

	this.controller.serviceRequest('palm://com.palm.applicationManager', {
			method: 'open',
			parameters: params,
			onSuccess: function(response, payload) {

				if (!response.returnValue) {
					this.controller.showAlertDialog({
						onChoose: function(value) {},
						title: $L("Unable to Open Resource"),
						message: response.errorText,
						choices:[ {label:$L('OK'), value:'OK', type:'dismiss'} ]
					});

					Mojo.Log.error("Error handing off '%s', msg:'%s'", uri, response.errorText);
				}

				this._handleAction('userstop');

			}.bind(this),
			onFailure: function(response) {

				this.controller.showAlertDialog({
					onChoose: function(value) {},
					title: $L("Unable to Open Resource"),
						message: response.errorText,
					choices:[ {label:$L('OK'), value:'OK', type:'dismiss'} ]
				});

				this._handleAction('userstop');
				
				Mojo.Log.error("Failure handing off '%s', msg:'%s'", uri, response.errorText);
			}.bind(this)
		});
};

/**
 * WebView widget isn't going to handle this "main" resource so this
 * is our callback.
 *
 * @param {Object} event @see Mojo.Widget.WebView
 */
PageAssistant.prototype._onWebViewResourceHandoff = function(event) {
	
	try {
		if (event.url && event.url.toUpperCase().startsWith("FILE:")) {
			this.controller.showAlertDialog({
				onChoose: function(value) { /* Do Nothing */},
				message: $L('Cannot display local files.'),
				choices:[{label:$L('OK'), value:'1', type:'dismiss'}]
			});
			
			// Dismiss any open search list and dismiss the address bar if
			// if we are overscrolled.
			this._addressBar.enableTitleView();
			this._addressBar.closeSearchResults();
			if (!this.chrome.isVisible()) {
				this._addressBar.hide();
				this._webView.mojo.focus();
			}
			
			// Signal the page controls we've stopped attempting to load
			// a local resource.
			this._handleAction('userstop');
			return;
		}

		var getResInfoSuccess = function(response) {

			if (response.returnValue) {
				if (response.appIdByExtension === 'com.palm.app.browser') {
					// Don't handoff to app mgr because it'll just reopen me and I'll 
					// wind up in an infinite card open loop. (NOV-58615).
					this._downloadResource(event.url);
					this._handleAction('userstop');
				}
				else {
					if (response.canStream) {
						this._streamResource(event.url, response.appIdByExtension, response.mimeByExtension);
					}
					else if (UrlUtil.isCommand(event.url)) {
						this._openResource(event.url, event.mimeType);
					}
					else {
						this._downloadResource(event.url);
					}
				}
			}
			else {
				this._downloadResource(event.url);
			}
		}.bind(this);

		var getResInfoFailure = function(response) {

			this.controller.showAlertDialog({
				onChoose: function(value) {
					this._handleAction('userstop');
				}.bind(this),
				title: $L("Unable to Handle Resource"),
				message:$L("This protocol is not supported."),
				choices:[ {label:$L('OK'), value:'OK', type:'dismiss'} ]
			});

		}.bind(this);

		this._getResourceInfo(event.url, event.mimeType, getResInfoSuccess, getResInfoFailure);
	}
	catch (e) {
		Mojo.Log.logException(e, '_onWebViewResourceHandoff');
		throw e;
	}
};

/**
 * Called when the WebView has redirected a URL to me. Handoff to the applicationManager.
 */
PageAssistant.prototype._onUrlRedirect = function(event) {
	this._onWebViewResourceHandoff(event);
};

PageAssistant.prototype._onLoadProgress = function(event) {
	this._handleAction('progress', {progress: event.progress});
};

PageAssistant.prototype._onLoadStarted = function(event) {

	this.loadingPage = true;
	this.firstPageLoaded = true;

	// If the page is loading then hide and disable chrome and
	// the URL bar
	if (!this._addressBar.hasFocus()) {
		this._addressBar.hide();
		this.controller.get('web_view').mojo.focus();
	}

	this.chrome.hide();
	this._handleAction('start');
};

function SimpleOkDialogAssistant(sceneAssistant, onClose) {
	this.controller = sceneAssistant.controller;
	this._okButtonHandler = this.handleOk.bindAsEventListener(this);
	this.onClose = onClose;
}

SimpleOkDialogAssistant.prototype.setup = function(widget) {
	this.widget = widget;
};

SimpleOkDialogAssistant.prototype.cleanup = function() {
	if (this.onClose) {
		this.onClose();
	}
};

SimpleOkDialogAssistant.prototype.activate = function() {
	this.controller.get('okButton').addEventListener(Mojo.Event.tap, this._okButtonHandler, false);	
};

SimpleOkDialogAssistant.prototype.deactivate = function() {
	this.controller.get('okButton').removeEventListener(Mojo.Event.tap, this._okButtonHandler, false);
};

SimpleOkDialogAssistant.prototype.handleOk = function(widget) {
	
	this.widget.mojo.close();
};

PageAssistant.prototype._onSetMainDocumentError = function(event) {

	if (event.errorCode === WebKitErrors.ERR_WK_FLOADER_CANCELLED) {
		// We get this when the user does something to interrupt a page load.
		return;
	}

	// Create the error assistant once and once only. (load on demand)
	if (!this.errorDialogAssistant) {
		this.errorDialogAssistant = new SimpleOkDialogAssistant(this,
			function() {
				// HI requirement. Jump to URL bar after dialog closes.
				this._gotoUrlBar.bind(this, this._jumpToUrl).defer();
			}.bind(this));
	}

	// If we have a submitted URL then use this as the source of the
	// error else we switch to using the failing URL given to us from
	// the event. The submitted URL gets wiped when a new Title/Url
	// change event comes in so we persist the submitted URL here
	// for use by the alert dialog.  
	this._jumpToUrl = this._submittedUrl || event.failingURL;
	
	var msg;
	switch (event.errorCode) {
		case WebKitErrors.ERR_SYS_FILE_DOESNT_EXIST:
			msg = $L('File does not exist.');
			break;
		case WebKitErrors.ERR_CURL_COULDNT_RESOLVE_HOST:
			msg = $L('Unable to resolve host.');
			break;
		case WebKitErrors.ERR_CURL_SSL_CACERT:
			msg = $L('Unable to verify certificate.');
			break;
		default:
			Mojo.Log.warn("Got an error with no mapping to a message '%s'", event.message);
			msg = $L('Error loading page.');
	}

	if (msg.length > 110) {
		// Trying to limit the number of lines to approximately 3.
		msg = msg.truncate(110);
	}
	else if (!msg.endsWith('.')) {
		msg += '.';
	}

	// Display the error.
	this.controller.showDialog({
		template: 'page/loadfailed-dialog',
		assistant: this.errorDialogAssistant,
		message: msg,
		errorCode: event.errorCode,
		failingURL: event.failingURL
	});
};


/**
 * Get's called multiple times when loading a page.
 * @param {Object} event
 */
PageAssistant.prototype._onDidFinishDocumentLoad = function(event) {
	
	// Moved thumbnail creation code to on recieving a LoadStopped event.
 };

PageAssistant.prototype._onLoadStopped = function(event) {

	/*
	 * On a stop message we switch state to STOP (which
	 * is the IDLE view)
	 */
	this._handleAction('stop');

	// If the page has loaded then hide and disable chrome on
	// the URL bar ONLY if the user doesn't have the URL bar
	// active.
	if (!this._addressBar.hasFocus()) {
		this._addressBar.hide();
		this.chrome.hide();
	}

	// Take a thumbnail snapshot after load is completed.
	try {
		if (this.loadingPage) {
			this.loadingPage = false;
			if (this.currPageBookmark) {
				// Only update the thumbnail image if we are not
				// a default bookmark.
				if (!this.currPageBookmark.defaultEntry) {
					this._updateCurrentBookmarkThumbnailImage();
				}
			}
		}
	} catch (e) {
		Mojo.Log.logException(e, '_onLoadStopped');
	}
};

PageAssistant.prototype._updateHistoryState = function() {
	
	var backForward = function(back, forward) {

		this._wkCanGoBack = back;
		this._wkCanGoForward = forward;

		// Update the UI back/forward - We can always go back.
		this._pageControls.updateBackForward(true, this._wkCanGoForward);

	}.bind(this);

	try {
		this._webView.mojo.getHistoryState(backForward);
	} catch (e) {
		Mojo.Log.logException(e, '_updateHistoryState');
	}	
};

PageAssistant.prototype._onUpdateHistory = function(event) {

	this._updateHistoryState();
};

/**
 * Update the thumbnail image for the current bookmark.
 */
PageAssistant.prototype._updateCurrentBookmarkThumbnailImage = function() {

	var now = new Date();
	var oldThumbnail = this.currPageBookmark.thumbnailFile;
	this.currPageBookmark.thumbnailFile = CustomizeiconAssistant.createBrowserImageName('thumbnail', now.getTime());
	var bookmark = this.currPageBookmark;

	delete this.currPageBookmark;
	try {
		var webView = this.controller.get('web_view');
		webView.mojo.saveViewToFile(bookmark.thumbnailFile, 0, 0, this.kBookmarkSrcWidth, this.kBookmarkSrcHeight);
		// Now save it to the database
		this.bookmarkStore.updateThumbnail(bookmark, function() {
			this.deleteImage(oldThumbnail);
		}.bind(this), function() {
			Mojo.Log.error("Failed to update thumbnail.");
			this.deleteImage(bookmark.thumbnailFile);
			bookmark.thumbnailFile = oldThumbnail;
		}.bind(this));
	}
	catch (e) {
		Mojo.Log.logException(e, '_updateCurrentBookmarkThumbnailImage');
		bookmark.thumbnailFile = oldThumbnail;
	}

};

PageAssistant.prototype._onCreatePage = function(event){
	Mojo.Log.info("PageAssistant#_onCreatePage: " + event.pageIdentifier);
	this._newBrowserPage(undefined, event.pageIdentifier);
};

/**
 * Create a new browser page stage.
 *
 * @param {String} url The URL to which this page should originally display (undefined = default)
 * @param {String} pageIdentifier The page identifier (used when responding to BrowserServer request to
 *        create a new page).
 */
PageAssistant.prototype._newBrowserPage = function(url, pageIdentifier){

	var params = {scene: 'page'};
	if (url !== undefined) {
		params.target = url;
	}
	if (pageIdentifier !== undefined) {
		params.pageIdentifier = pageIdentifier;
	}

	this.controller.serviceRequest('palm://com.palm.applicationManager', {
		method: 'open',
		parameters: {
			'id': 'com.palm.app.browser',
			'params': params
		}
	});
};

/**
 * Sometimes we need to delete an image in a scene which has no WebView widget and hence
 * no
 * @param {String} filename The full path to the file to delete. Can be null/undefined if
 *                  the caller just wants to do all the deferred deletes.
 */
PageAssistant.prototype.deleteImage = function(filename) {

	try {
		var webView = this.controller.get('web_view');	// May be undefined.

		if (filename) {
			webView.mojo.deleteImage(filename);
		}

		while (this.imagesToDelete.length > 0) {
			filename = this.imagesToDelete.shift();
			webView.mojo.deleteImage(filename);
		}
	}
	catch (e) {
		Mojo.Log.warn("Unable to delete '%s', will try later.", filename);
		this.imagesToDelete.push(filename);
	}
};

/**
 * Share the url and optional image capture with an email recipient.
 */
PageAssistant.prototype._shareUrl = function(url, title, withCapture) {

	if (url === undefined) {
		return;
	}

	if (!title) {
		try {
			title = $L("page at #{host}").interpolate({host: UrlUtil.getUrlHost(url)});
		}
		catch (e) {
			title = url;
		}
	}

	var captureFile;
	if (withCapture) {
		captureFile = '/tmp/captures/browser_page.png';

		this._webView.mojo.saveViewToFile(captureFile);
	}

	var msg = $L("Here's a website I think you'll like: <a href='#{src}'>#{title}</a>").interpolate(
			{src: url, title: title});
	var parameters = {
		id: 'com.palm.app.email',
		params: {
			summary: $L('Check out this web page...'),
			text: msg
		}
	};

	if (withCapture) {
		parameters.params.attachments = [{fullPath: captureFile}];
	}

	this.controller.serviceRequest('palm://com.palm.applicationManager', {
		method: 'open',
		parameters: parameters
	});
};

PageAssistant.prototype._setWallpaper = function(pathToImage) {
	var errorTitle = $L("Error Setting Wallpaper");
	
	var onSetSuccess = function(response) {
		this._showOkAlert($L("Wallpaper has been set"),
				$L("The image has been successfully set as your wallpaper."));
	}.bind(this);
	
	var onSetFailure = function(response) {
		this._showOkAlert(errorTitle, $L("Cannot set picture as current wallpaper."));
	}.bind(this);

	var onImportSuccess = function(response) {
		this.controller.serviceRequest('palm://com.palm.systemservice/',
		{
			method : 'setPreferences',
			parameters: {wallpaper: response.wallpaper},
			onSuccess: onSetSuccess,
			onFailure: onSetFailure
		});
	}.bind(this);
	
	var onImportFailure = function() {
		this._showOkAlert(errorTitle, $L("Cannot import picture into wallpaper database."));
	}.bind(this);

	this.controller.serviceRequest('palm://com.palm.systemservice/', {
			method : 'wallpaper/importWallpaper',
			parameters: {
				target: encodeURIComponent(pathToImage),
				scale: "1.0"
			},
			onSuccess: onImportSuccess,
			onFailure: onImportFailure
		});
};

/**
 * Send an email with the supplied image attached.
 */
PageAssistant.prototype._shareImage = function(imageInfoObj, pathToImage) {

	var title;
	if (imageInfoObj.title && imageInfoObj.title.length) {
		title = imageInfoObj.title;
	}
	else if (imageInfoObj.altText && imageInfoObj.altText.length) {
		title = imageInfoObj.altText;
	}
	else {
		title = $L('picture link');
		try {
			if (imageInfoObj.src !== 'data:') {
				title = $L("picture at #{host}").interpolate(
						{host: UrlUtil.getUrlHost(imageInfoObj.src)});
			}
		}
		catch (e) {}
	}

	var text = $L("Here's a picture I think you'll like: <a href='#{src}'>#{title}</a>").interpolate(
			{src: imageInfoObj.src, title: title});

	var parameters = {
		id: 'com.palm.app.email',
		params: {
			summary: $L('Check out this picture...'),
			text: text
		}
	};

	parameters.params.attachments = [{fullPath: pathToImage}];

	this.controller.serviceRequest('palm://com.palm.applicationManager', {
		method: 'open',
		parameters: parameters
	});
};

/**
 * Called whenever the scroller is moved.
 */
PageAssistant.prototype.moved = function() {

	// Extract the current position and use the value to determine how
	// the UrlBar should be displayed.
	// We can keep calling animate because if an existing animation
	// on and elements attributes already exists it automagically
	// gets cancelled.
	var pos = this.controller.getSceneScroller().mojo.getScrollPosition();

	if (pos.top < 0) {

		// We have moved the scene above (0,0) BUT we only hide the
		// URL bar IF if doesn't have focus.
		if (!this._addressBar.hasFocus()) {

			this._addressBar.hide();
			this.chrome.hide();

			// Only focus this webview widget if this assistant has
			// focus. All page-assisants can receive 'moved' events
			// so we have to be careful when explicitly setting the
			// focus.
			if (this.controller.stageController.focused) {
				this._webView.mojo.focus();
			}
		}
		else {
			//Mojo.Log.info("-> TOP < 0 AND FOCUS SO NOT HIDING");
			// We always dispose of the spacer
			this.chrome.hide();
		}



	} else if (pos.top > 0) {

		// We always animate the spacer and show the bar if we
		// have dragged off the top.
		//Mojo.Log.info("-> TOP > 0 SO SHOWING");
		this._addressBar.show();
		this.chrome.show();

	} else {
		//Mojo.Log.info("-> TOP == 0 Do Nothing.");
		// Do nothing.
	}
};

PageAssistant.prototype._goBack = function() {

	if (this._wkCanGoBack) {
		try {
			this._handleAction('userback');
			// For fresh pages we make sure the editorInPageFocused flag is cleared.
			// and let the callback event tell us otherwise.
			this._editorInPageFocused = false;
			this._addressBar.enableTitleView();
			this._webView.mojo.goBack();
		} catch (e) {
			Mojo.Log.logException(e, "Page Back");
			this._handleAction('userstop');
		}
	}
	else {
		this._showStartPage();
	}
};

PageAssistant.prototype._goForward = function() {

	try {
		this._handleAction('userforward');
		// For fresh pages we make sure the editorInPageFocused flag is cleared.
		// and let the callback event tell us otherwise.
		this._editorInPageFocused = false;
		this._addressBar.enableTitleView();
		this._webView.mojo.goForward();
	} catch (e) {
		Mojo.Log.logException(e,  "Page Foward");
		this._handleAction('userstop');
	}
};

PageAssistant.prototype._reload = function() {

	try {
		this._handleAction('userreload');
		this._addressBar.enableTitleView();
		this._webView.mojo.reloadPage();
	} catch (e) {
		Mojo.Log.logException(e, "Page Reload");
		this._handleAction('userstop');
	}
};

PageAssistant.prototype._stopLoad = function() {

	try {
		this._handleAction('userstop');
		this._addressBar.enableTitleView();
		this._webView.mojo.stopLoad();
	} catch (e) {
		Mojo.Log.logException(e, 'User Stop');
	}
};

/**
 * handle a menu command.
 */
PageAssistant.prototype.handleCommand = function(event) {
	try {
		var urlReference;

		if (event.type == Mojo.Event.back) {
			// Halt any loading currently running.
			this._webView.mojo.stopLoad();

			// Spotlight mode special handling
			if (this._spotlightModeEnabled) {
				event.preventDefault();
				event.stopPropagation();

				this._webView.mojo.pluginSpotlightRemove();
				
				return;
			}

			// On the first BACK we dismiss any search list and
			// switch the URL bar to title mode.
			//
			// If no search list is visible but the URL bar IS
			// visible and 'chrome/spacer' is NOT visible we
			// switch the title mode and dismiss the URL bar.
			//
			// If no search list is visible but the URL bar IS
			// visible and 'chrome/spacer' IS visible we
			// switch to title mode and keep the URL bar in view.
			//
			// If no search list is visible and the URL bar IS
			// visible and in title mode and 'chrome/spacer' IS
			// visible we perform the default back operations.
			//
			// Otherwise the default back operation is performed.
			//
			if (this._addressBar.areSearchResultsVisible()) {

				this._addressBar.enableTitleView();
				this._addressBar.closeSearchResults();
				if (!this.chrome.isVisible()) {
					this._addressBar.hide();
					this._webView.mojo.focus();
				}
				event.preventDefault();
				event.stopPropagation();
			}
			else if (this._addressBar.isVisible()) {
				// If we have the spacer visible then switch to title mode.
				// If we are in title mode then we go back a page.
				if (this.chrome.isVisible()) {
					if (this._addressBar.isInUrlView()) {
						this._addessBar.enabelTitleView();
						this._webView.mojo.focus();
						event.preventDefault();
						event.stopPropagation();

					} else if (this._wkCanGoBack) {
						event.preventDefault();
						event.stopPropagation();
						this._goBack();

					} else {
						// If we can't go back further in history we show the startpage.
						event.preventDefault();
						event.stopPropagation();
						this._showStartPage();
					}
				} else {
					this._addressBar.hide();
					this.chrome.hide();
					this._webView.mojo.focus();
					event.preventDefault();
					event.stopPropagation();
				}
			}
			else if (this._wkCanGoBack) {
				event.preventDefault();
				event.stopPropagation();
				this._goBack();
			} else {
				// If we can't go back further in history we show the startpage.
				event.preventDefault();
				event.stopPropagation();
				this._showStartPage();
			}
		}
		else if (event.type == Mojo.Event.forward) {

			// Spotlight mode special handling
			if (this._spotlightModeEnabled) {
				event.preventDefault();
				event.stopProgation();
				this._webView.mojo.pluginSpotlightRemove();
				return;
			}

			// NOTE: According to HI we should keep this simple 
			// and just move forward.
			if (this._wkCanGoForward) {
				this._addressBar.enableTitleView();
				this._addressBar.closeSearchResults();
				this._webView.mojo.focus();

				event.preventDefault();
				event.stopPropagation();
				this._goForward();
			}			
		}
		else if (event.type == Mojo.Event.command) {

			switch (event.command) {
				case MenuData.ApplicationMenu.ShowHistory.command:
					this._openHistoryView();
					break;

				case MenuData.ApplicationMenu.ShowBookmarks.command:
					this._openBookmarkView();
					break;

				case MenuData.ApplicationMenu.NewCard.command:
					this._newBrowserPage();
					break;

				case MenuData.ApplicationMenu.AddBookmark.command:
					urlReference = new UrlReference(this.currentUrl, this.currentTitle, new Date());
					this._createDefaultBookmarkImages(urlReference);
					this.showBookmarkDialog(BookmarkDialogAssistant.createBookmarkTask, urlReference);
					break;

        case MenuData.ApplicationMenu.AddToSpareTime.command:
          this.controller.serviceRequest("palm://com.palm.applicationManager", {
            method: "open",

            parameters: {
              id: "com.semicolonapps.sparetime",
              params: {action: "add_url", url: this.currentUrl, title: this.currentTitle}
            },

            onFailure: function() {
              this.controller.showAlertDialog({
                title: $L("Spare Time Not Installed"),
                message: $L("Spare Time is not installed. Would you like to purchase it?"),

                choices:[
                  {label:$L("Yes"), value:"yes", type:"affirmative"},
                  {label:$L("No"), value:"no", type:"dismissal"}
                ],

                onChoose: function(value){
                  if("yes" == value){
                    this.controller.serviceRequest("palm://com.palm.applicationManager", {
                      method:"open",
                      parameters:{target: "http://developer.palm.com/appredirect/?packageid=com.semicolonapps.sparetime"}
                    });
                  }
                }
              });
            }.bind(this)
          });

          break;

				case MenuData.ApplicationMenu.AddToLauncher.command:
					// Bookmarks can deal with one that has no title, but not the launcher
					urlReference = new UrlReference(this.currentUrl, this._getDisplayTitle(), new Date());
					this._createDefaultBookmarkImages(urlReference);
					this.showBookmarkDialog(BookmarkDialogAssistant.createLaunchpointTask, urlReference);
					break;

				case MenuData.ApplicationMenu.SharePage.command:
					this._shareUrl(this.currentUrl, this._getDisplayTitle(), true /*capture*/);
					break;

				case MenuData.NavigationMenu.Back.command:
					this._goBack();
					break;

				case MenuData.NavigationMenu.Forward.command:
					this._goForward();
					break;

				case MenuData.NavigationMenu.Reload.command:
					this._reload();
					break;

				case MenuData.NavigationMenu.Stop.command:
					this._stopLoad();
					break;

				case UrlBar.Menu.TitleTap.command:
					this._processTitleTapCommand();
					break;

				case UrlBar.Menu.Go.command:
					this._processGoCommand();
					break;

				case Mojo.Menu.prefsCmd:
					this._openPreferencesView();
					break;

				case Mojo.Menu.helpCmd:
					this._showHelpCommand();
					break;
			}
		}
		else {

			if (event.type === Mojo.Event.commandEnable) {

				// Standard Application Menu commands.
				if (event.command === Mojo.Menu.prefsCmd ||
					event.command === Mojo.Menu.helpCmd) {

					event.stopPropagation(); // Enable the chosen menuitems
					return;
				}

				// Application specific Applicaiton Menu commands.
				if (event.command === MenuData.ApplicationMenu.SharePage.command) {
					// Only enable the menu items if we have a valid
					// pages... (define a valid page)
					if (!this.currentUrl) {
						event.preventDefault();
						return;
					}
				}

				if (event.command === MenuData.ApplicationMenu.AddToLauncher.command ||
					event.command === MenuData.ApplicationMenu.AddBookmark.command) {

					// Only enable the menu items if we have a valid
					// pages... (define a valid page)
					if (!this.currentUrl) {
						event.preventDefault();
						return;
					}

					// If we have a bookmark/launcher dialog up then disable the
					// app menu
					if (this._bookmarkDialog) {
						event.preventDefault();
						return;
					}
				}
			}
		}
	}
	catch (e) {
		Mojo.Log.logException(e, 'handleCommand');
	}
};

/**
 * Create the images for a bookmark: 1) thumbnail, 2) 32x32 pixel icon, and 3) 64x64 pixel image.
 * @param {UrlReference} urlReference The URL reference to create the images for.
 */
PageAssistant.prototype._createDefaultBookmarkImages = function(urlReference)
{
	var now = urlReference.date.getTime();

	var webView = this.controller.get('web_view');

	// First save out the page thumbnail image
	urlReference.thumbnailFile = CustomizeiconAssistant.createBrowserImageName('thumbnail', now);
	webView.mojo.saveViewToFile(urlReference.thumbnailFile, 0, 0, this.kBookmarkSrcWidth, this.kBookmarkSrcHeight);
	webView.mojo.resizeImage(urlReference.thumbnailFile, urlReference.thumbnailFile, this.kStartPageImageWidth, this.kStartPageImageHeight);

	// Now generate the default icon that the user can then customize
	webView.mojo.saveViewToFile(CustomizeiconAssistant.tmpCaptureFile, 0, 0, this.kStartPageImageWidth, this.kStartPageImageWidth /*yes we want it square*/);
	urlReference.tmpIconFile64 = CustomizeiconAssistant.createBrowserImageName('icon64', now);
	webView.mojo.generateIconFromFile(CustomizeiconAssistant.tmpCaptureFile, urlReference.tmpIconFile64, 0, 0,
			CustomizeiconAssistant.kIconCropRectWidth, CustomizeiconAssistant.kIconCropRectHeight);

	urlReference.tmpIconFile32 = CustomizeiconAssistant.createBrowserImageName('icon32', now);
	webView.mojo.saveViewToFile(CustomizeiconAssistant.tmpCaptureFile, 0, 0, CustomizeiconAssistant.kIconCropRectHeight, CustomizeiconAssistant.kIconCropRectHeight);
	webView.mojo.resizeImage(CustomizeiconAssistant.tmpCaptureFile, urlReference.tmpIconFile32, 32, 32);
	this.deleteImage(CustomizeiconAssistant.tmpCaptureFile);
};

/**
 * Display the bookmark dialog.
 *
 * @param {String} task	The task to perform (See BookmarkDialogAssistant).
 * @param {UrlReference} urlReference The URL reference to add. If undefined then new bookmark/launchpoint will be added.
 */
PageAssistant.prototype.showBookmarkDialog = function(task, urlReference) {

	Mojo.assert(urlReference, "Must supply valid URL reference");

	// Only show the bookmark dialog widget once...
	if (!this._bookmarkDialog) {
		// Force the dialog into portrait/up orientation.
		var targetWindow = this.controller.window;
		if (targetWindow.PalmSystem && targetWindow.PalmSystem.setWindowOrientation) {
			// Set to the default orientation on activation?
			targetWindow.PalmSystem.setWindowOrientation('up');
		}

		var closed = false;
		var onClosed = function(){
			this._bookmarkDialog = null;
			if (!closed) {
				closed = true;
			}
		}.bind(this);

		var params = {
			task: task,
			urlReference: urlReference,
			sceneController: this.controller,
			bookmarkStore: this.bookmarkStore,
			onClose: onClosed,
			deleteImage: this.deleteImage.bind(this)
		};
		
		// NOTE: Currently this dialog is non-cancellable so needs to be handled
		// directly and not rely on the framework to dismiss them on card deactivates.
		// NOTE: Any attempt to display a cancellable dialog will be automatically
		// dismissed while this dialog is visible. (see frameworks container stack).  
		this._bookmarkDialog = BookmarkDialogAssistant.showDialog(params);
	}
};


PageAssistant.prototype.kUrlInputTextFieldName = 'urlInputField';
PageAssistant.prototype.kMaxHistoryDays = 21;
PageAssistant.prototype.kStartPageImageWidth = 90;		// Keep in sync with startPageBookmark CSS class
PageAssistant.prototype.kStartPageImageHeight = 120;	// Keep in sync with startPageBookmark CSS class
PageAssistant.prototype.kBookmarkSrcWidth = 180;		// Scaled to kStartPageImageWidth
PageAssistant.prototype.kBookmarkSrcHeight = 240;		// Scaled to kStartPageImageHeight

/**
 * keydown handler. We currently use this to record key presses for later use
 * in the keypress handler until we have the modifier key fixes. We also handle
 * redirects to the URL bar if it doesn't already have focus and their are no
 * input fields  the have focus in the webview.
 * @param {Object} event
 */
PageAssistant.prototype._onKeyDownEvent = function(event) {

	// With the background scrim on dialogs we no longer have to
	// do our own popup reference count to protect against jumping
	// to the URL bar on keydown events.
		
	// If the URL textfield has the focus then do nothing.
	// If the webview has focus AND the editorInPageFocused
	// flag has NOT been set then jump to the URL text field.
	if (!this._addressBar.hasFocus() && !this._editorInPageFocused) {
		// Only jump to the URL bar IF we are a valid keycode that is
		// allowed to trigger the bar.
		if (this._addressBar.isAGotoAddressBarEvent(event.originalEvent)) {
			this._gotoUrlBar();
		}
	}
};

/**
 * keyup events are now ignored. 
 * @param {Object} event
 */
PageAssistant.prototype._onKeyUpEvent = function(event) {

};

/**
 * keypress events are now ignored.
 *
 * @param {Object} event
 */
PageAssistant.prototype._onKeyPressEvent = function(event){

};

/**
 * Helper function that will put the Url bar into URL input mode
 * and then set the input focus.
 */
PageAssistant.prototype._gotoUrlBar = function(url) {

	try {

		if (this._orientation === 'up') {

			// Dismiss any currently viewed searchlist
			this._addressBar.closeSearchResults();

			// Create/Show the URL bar and set input
			this._addressBar.setAddressAndTitle(url, UrlUtil.cleanup(url));
			this._addressBar.enableUrlView();
			this._addressBar.show();
			this._addressBar.focus();
		} else {
			// We do nothing for other orientations.
		}
	}
	catch (e) {
		Mojo.Log.logException(e, "PageAssistant#_gotoUrlBar()");
	}
};

PageAssistant.prototype._openBookmarkView = function() {

	var targetWindow = this.controller.window;
	if (targetWindow.PalmSystem && targetWindow.PalmSystem.setWindowOrientation) {
		targetWindow.PalmSystem.setWindowOrientation("up");
	}

	this.controller.stageController.pushScene('bookmarks', AppAssistant.WebPreferences);
};

PageAssistant.prototype._openHistoryView = function() {

	var targetWindow = this.controller.window;
	if (targetWindow.PalmSystem && targetWindow.PalmSystem.setWindowOrientation) {
		targetWindow.PalmSystem.setWindowOrientation('up');
	}

	this.controller.stageController.pushScene('history', AppAssistant.WebPreferences);
};

PageAssistant.prototype._openPreferencesView = function(){

	var targetWindow = this.controller.window;
	if (targetWindow.PalmSystem && targetWindow.PalmSystem.setWindowOrientation) {
		targetWindow.PalmSystem.setWindowOrientation('up');
	}

	this.controller.stageController.pushScene('preferences', AppAssistant.WebPreferences);
};

PageAssistant.prototype._openFindView = function() {

};

PageAssistant.prototype._launchNewBrowser = function() {
	Mojo.Log.info("Launching new browser.");
	this._newBrowserPage();
};
/**
 * End of keyboard shortcut handlers.
 */

PageAssistant.prototype._processGoCommand = function() {

	try {
		var value = this._addressBar.getValue();
		if (value) {
			this._addressBar.hide();
			this.chrome.hide();
			this._webView.mojo.focus();
			this.openUrl(this._addressBar.convertInputToUrl(value));
		}
		else {
			// We did nothing so switch focus back to the URL bar
			this._addressBar.focus();
		}
	} catch (e) {
		Mojo.Log.logException(e, 'PageAssistant#_processGoCommand()');
	}
};

PageAssistant.prototype._processTitleTapCommand = function() {

	this._addressBar.enableUrlView();
	this._addressBar.focus();
	this._addressBar.select();
};

PageAssistant.prototype._setOrientation = function(orientation) {

	try {
		// Notify the URL bar of orientation change
		this._addressBar.setOrientation(orientation);
		this.chrome.setOrientation(orientation);
	}
	catch (e) {
		Mojo.Log.logException(e, "PageAssistant#_setOrientation");
	}
};

PageAssistant.prototype._showHelpCommand = function() {

	// Launch the help system.
	AppAssistant.launchHelp();
};


/******************************************************************
 * Our state machine for navigation and page animations
 * @param {Object} contract
 */
PageAssistant.prototype._initialState = 'Idle';
PageAssistant.prototype._currentState = PageAssistant.prototype._initialState;

var PA = PA || {};
PA.Log = {};
PA.Log.info = function() {}; //Mojo.Log.info;
PA.Log.warn = Mojo.Log.warn;
PA.Log.error = Mojo.Log.error;
PA.Log.logException = Mojo.Log.logException;

PageAssistant.prototype._handleAction = function(someAction, details) {

	try {
		details = details || {};

		var nextState;
		var anActionFunction = this._actionFunctions[this._currentState][someAction];
		if (!anActionFunction) {
			PA.Log.warn("UNEXPECTED ACTION - STATE MACHINE: (CUR STATE: %s, ACTION: %s)", this._currentState, someAction);
			anActionFunction = this._undefinedAction;
		}

		PA.Log.info("STATE MACHINE: (CUR STATE: %s, ACTION: %s)", this._currentState, someAction);

		// call the state-machines action function with the current instance context.
		nextState = anActionFunction.call(this, details);

		PA.Log.info("STATE MACHINE: (%s -> %s -> %s)", this._currentState, someAction, nextState);
		if (!nextState) {
			nextState = this._currentState;
		}

		if (!this._actionFunctions[nextState]) {
			nextState = this._undefinedState(someAction, nextState);
		}

		this._currentState = nextState;
	} catch (e) {
		Mojo.Log.logException(e, '#_handleAction()');
	}
};

PageAssistant.prototype._undefinedAction = function(details) {

	PA.Log.warn("PageAssistant handled unexpected action");

	this._pageControls.showIdle();

	return this._initialState;
};

PageAssistant.prototype._undefinedState = function(someAction, state) {

	PA.Log.error("PageAssistant handled unexpected state: %s, for action: %s", state, someAction);

	this._pageControls.showIdle();

	return this._initialState;
};

PageAssistant.prototype._actionFunctions = {

	Idle: {

		stop: function() {
			return this._currentState;
		},

		start: function() {
			this._pageControls.showSearch();
			return 'Progress';
		},

		useropen: function() {
			this._pageControls.showSearch();
			return 'Pending';
		},

		userreload: function() {
			this._pageControls.showSearch();
			return 'Pending';
		},

		userforward: function() {
			this._pageControls.showSearch();
			return 'Pending';
		},

		userback: function() {
			this._pageControls.showSearch();
			return 'Pending';
		},

		userstop: function() {
			return this._currentState;
		},

		progress: function() {
			return this._currentState;
		}
	},

	Pending: {

		stop: function() {
			return this._currentState;
		},

		start: function() {
			this._pageControls.showSearch();
			return 'Progress';
		},

		useropen: function() {
			return this._currentState;
		},

		userreload: function() {
			return this._currentState;
		},

		userforward: function() {
			return this._currentState;
		},

		userback: function() {
			return this._currentState;
		},

		userstop: function() {
			this._pageControls.showIdle();
			return 'Idle';
		},

		progress: function() {
			this._pageControls.showProgress();
			return 'Progress';
		}
	},

	Progress: {

		stop: function() {
			this._pageControls.showIdle();
			return 'Idle';
		},

		start: function() {
			return this._currentState;
		},

		useropen: function() {
			this._pageControls.showSearch();
			return 'Pending';
		},

		userreload: function() {
			this._pageControls.showSearch();
			return 'Pending';
		},

		userforward: function() {
			this._pageControls.showSearch();
			return 'Pending';
		},

		userback: function() {
			this._pageControls.showSearch();
			return 'Pending';
		},

		userstop: function() {
			this._pageControls.showIdle();
			return 'Idle';
		},

		progress: function(details) {
			if (details.progress > 10) {
				// On a start progress is immediately set to 10
				// even though we've not downloaded content yet
				// nor are we sure the server is live.
				this._pageControls.showProgress();
				this._pageControls.updateProgress(details.progress);
				return 'Progress10';
			}
			return this._currentState;
		}
	},

	Progress10: {

		stop: function() {
			this._pageControls.showIdle();
			return 'Idle';
		},

		start: function() {
			return this._currentState;
		},

		useropen: function() {
			this._pageControls.showSearch();
			return 'Pending';
		},

		userreload: function() {
			this._pageControls.showSearch();
			return 'Pending';
		},

		userforward: function() {
			this._pageControls.showSearch();
			return 'Pending';
		},

		userback: function() {
			this._pageControls.showSearch();
			return 'Pending';
		},

		userstop: function() {
			this._pageControls.showIdle();
			return 'Idle';
		},

		progress: function(details) {
			this._pageControls.updateProgress(details.progress);
			return this._currentState;
		}
	}
};

BrowserServerStatus = function(controller) {
	this._controller = controller;
	this._adapterConnected = true;
};

BrowserServerStatus.prototype.setup = function(params) {

	this._onConnect = params.onConnect || function() {};
	this._controller.setupWidget('server-disconnected-spinner', {spinnerSize:Mojo.Widget.spinnerLarge});
	this._disconnectedScrim = this._controller.get('server-disconnected');
	this._disconnectedScrim.hide();
	this._disconnectedSpinner = this._controller.get('server-disconnected-spinner');
};

BrowserServerStatus.prototype.showActivateState = function() {

	this._activated = true;

	if (!this._adapterConnected) {
		this._disconnectedSpinner.mojo.start();
		this._disconnectedScrim.show();
	}
};

BrowserServerStatus.prototype.showDeactivateState = function() {

	this._activated = false;
	if (!this._adapterConnected) {
		this._disconnectedSpinner.mojo.stop();
	}
};

BrowserServerStatus.prototype.connected = function() {

	if (!this._adapterConnected) {
		this._disconnectedSpinner.mojo.stop();
		this._disconnectedScrim.hide();
		this._onConnect();
	}
	this._adapterConnected = true;
};

BrowserServerStatus.prototype.disconnected = function() {

	if (this._activated && this._adapterConnected) {
		this._disconnectedSpinner.mojo.start();
	}
	this._disconnectedScrim.show();
	this._adapterConnected = false;
};

// New Spotlight Support
PageAssistant.prototype._onSpotlightStart = function() {

	this._spotlightModeEnabled = true;

	/*	
	if (this.controller.window.PalmSystem) {
		this.controller.window.PalmSystem.enableFullScreenMode(true);
	}
	*/
	
	// First remove focus from the address bar and place it on adapter
	// and then hide the addressbar, the chrome spacer, and the command menu.
	if (this.controller.stageController.focused) {
		this._webView.mojo.focus();
	}

	try {
		this._addressBar.hide();
		this.chrome.hide();
		this._pageControls.setVisible(false);
	} catch (e) {
		
		Mojo.Log.logException(e, "###### SPOTLIGHT");
		
	}
};

PageAssistant.prototype._onSpotlightEnd = function() {

	this._spotlightModeEnabled = false;

	this._pageControls.setVisible(true);
	
	/*
	if (this.controller.window.PalmSystem) {
		this.controller.window.PalmSystem.enableFullScreenMode(false);
	}
	*/
	
};
