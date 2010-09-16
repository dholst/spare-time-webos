/*
 * Copyright 2008-2009 Palm, Inc. All rights reserved.
 */

// The applications custom menu command  
MenuData = {};
MenuData.ApplicationMenu = {

	NewCard: {
		label: $L('New Card'),
		command: 'new-page-cmd'
	},
	
	SharePage: {
		label: $L('Share'),
		command: 'share-page-cmd',
		checkEnabled: true
	},
	
	AddToLauncher: {
		label: $L('Add to Launcher'),
		command: 'add-launch-icon-cmd',
		checkEnabled: true
	},
	
	AddBookmark: {
		label: $L('Add Bookmark'),
		command: 'add-bookmark-cmd',
		checkEnabled: true
	},
	
	ShowBookmarks: {
		label: $L('Bookmarks'),
		command: 'show-bookmarks-cmd',
		checkEnabled: true
	},
	
	ShowHistory: {
		label: $L('History'),
		command: 'show-history-cmd',
		checkEnabled: true
	}
};

