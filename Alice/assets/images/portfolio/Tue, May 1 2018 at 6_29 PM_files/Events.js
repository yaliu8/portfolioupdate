// Copyright 2007-2010 Panopto, Inc.
// All rights reserved.  Reuse and redistribution strictly prohibited.
Type.registerNamespace("Panopto.Events");
// Fired when a search is submitted in the top bar.
Panopto.Events.SubmitSearchEventArgs = function (query) {
    this._query = query;
};
Panopto.Events.SubmitSearchEventArgs.prototype = {
    get_query: function () {
        return this._query;
    }
};
Panopto.Events.SubmitSearchEventArgs.registerClass("Panopto.Events.SubmitSearchEventArgs", Sys.EventArgs);
(function () {
    if (!Panopto.Events.crossbrowserEventAttached) {
        // Event listener for cross domains.
        var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent", eventEnter = window[eventMethod], messageEvent = eventMethod === "attachEvent" ? "onmessage" : "message";
        // Listen to message from child window
        eventEnter(messageEvent, function (e) {
            var e = e || window.event;
            var jsonMessage = JSON.parse(e.data), sessions, returnMessage, source = e.source;
            if (jsonMessage.cmd === 'updateModalTitle') {
                if (jsonMessage.title) {
                    // Update the code behind so it knows it has a new header.
                    Panopto.ModalPopup.defaultInstance.asyncHeaderUpdate(jsonMessage.title);
                }
            }
            // Command for our embedded iFrame
            if (jsonMessage.cmd === 'createEmbeddedFrame') {
                // Certain providers have an extra option to push All Users access when sharing
                Panopto.BatchUpload.EmbeddedView.syncSharing(function onComplete() {
                    sessions = Panopto.BatchUpload.EmbeddedView.getSelectedSessions();
                    returnMessage = {
                        ids: _.pluck(sessions, "deliveryId"),
                        names: _.pluck(sessions, "name"),
                        playableObjectTypes: _.pluck(sessions, "playableObjectType"),
                        cmd: 'deliveryList'
                    };
                    source.postMessage(JSON.stringify(returnMessage), "*");
                });
            }
            // Command for our embedded iFrame for a folder
            if (jsonMessage.cmd === 'createEmbeddedFolder') {
                returnMessage = {
                    id: '',
                    name: '',
                    cmd: 'createEmbeddedFolder'
                };
                // IE8 can't always find source property on an event if within a $.ajax callback.
                // So we cache it here.
                source = e.source;
                // We are previewing the folder for the user. Get the folder Id from the URL in the
                // folder preview mode.
                var previewUrl = $('.folder-preview').children().first().attr('src');
                var urlParts = previewUrl.split('folderID=');
                var folderId = '';
                if (urlParts.length > 1) {
                    folderId = urlParts[1];
                }
                // Get the folder name
                var folderName = null;
                if ($('.folder-preview-name')) {
                    folderName = $('.folder-preview-name').html();
                }
                // Include the folder ID in the message and post.
                returnMessage.id = folderId;
                returnMessage.name = folderName;
                source.postMessage(JSON.stringify(returnMessage), "*");
                // Ensure permissions on the folder
                if (Panopto.Selector) {
                    Panopto.Selector.ensurePermissions(folderId);
                }
            }
        }, false);
        Panopto.Events.crossbrowserEventAttached = true;
    }
}());

//# sourceMappingURL=Events.js.map
