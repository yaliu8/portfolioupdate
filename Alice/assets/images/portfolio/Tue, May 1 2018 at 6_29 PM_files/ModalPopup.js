// Copyright 2007-2010 Panopto, Inc.
// All rights reserved.  Reuse and redistribution strictly prohibited.
/// <reference path="../Data.js"/>
/// <reference path="../Util.js"/>
/// <reference path="../Application.js"/>
Type.registerNamespace("Panopto");
Panopto.ModalPopup = function () {
    // Global namespaced ref to singleton modal instance.
    Panopto.ModalPopup.defaultInstance = this;
    Sys.converters.displayModalPageName = this._getPageName;
    // Navigation links list, populated per page type on modal display.
    this._modalNavigationDataview = Sys.create.dataView("#modalNavigation", {
        // Decorate item ID with page name and wire up click handler.
        itemRendered: Function.createDelegate(this, function (sender, args) {
            var data = args.dataItem, item = args.get("li");
            item.id = "modalLink-" + data.Name;
            // Hide tabs based on role and hosted master
            if ((data.HideOnMaster && Panopto.isHostedMaster)
                || ((data.RequiredRole === Panopto.Data.AclRoleType.Admin)
                    && !Panopto.user.isAdmin)
                || ((data.RequiredRole === Panopto.Data.AclRoleType.Creator)
                    && (!this.userHasCreatorRole && !Panopto.user.isVideographer))
                || (data.RequiresWriteAccess && !this.userHasWriteAccess)
                || (data.AccessRoles && !this.hasAccessRoles(data.AccessRoles))) {
                item.style.display = "none";
            }
            // shouldShow is an optional predicate the tab can have.
            // call() should show with this context.
            if (data.shouldShow && !data.shouldShow.call(this)) {
                item.style.display = "none";
            }
            Panopto.Core.UI.Handlers.button($(item), function () {
                // Check if modal page specifies a pre-unload confirmation message.
                if (this._checkLeavePageConfirmation()) {
                    Panopto.Application.defaultInstance.updateState({ modalPage: data.Name });
                }
            }, { context: this });
        })
    });
    // Close modal popup when user clicks "X" at top right.
    Panopto.Core.UI.Handlers.button($("#closeLink"), this.close, { context: this });
    // Close modal popup on [Esc]
    // Allow default action, so [Esc] will retain its normal behavior (e.g. clear text box).
    // This doesn't effect key events in the iFrame
    Panopto.Core.UI.Handlers.key($(document), this.close, [Panopto.Core.Key.Esc], { context: this, preventDefault: false });
    // Close modal popup when user clicks outside of the modal window.
    $(".modal-background").click(Function.createDelegate(this, function (e) {
        // Only close the modal if the click was not on a descendant of the modal window itself.
        if (!$(e.target).closest(".modal-wrapper").length) {
            this.close();
        }
    }));
    // wire up onload handler for iframes
    $("#modalIframe").on("load", function () {
        // Make sure we're actively displaying a page.
        // Keeps initial iframe load from clobbering list load indicator.
        // Use static class ref because we need jQuery's this reference to IFRAME.
        if (Panopto.ModalPopup.defaultInstance._page) {
            // hide loading message
            $("#loadingMessage").hide();
            // Update the outer frame
            Panopto.ModalPopup.defaultInstance.updateFrame();
            // If all the resizing messed up the scroll position of the frame, fix it here
            // Wrap it in a try/catch to avoid mixed content console errors on certain modals
            try {
                this.contentWindow.scrollTo(0, 0);
            }
            catch (e) { }
            // Execute onload handlers
            _.each(Panopto.ModalPopup.defaultInstance.onLoadHandlers, function (onLoadHandler) {
                onLoadHandler();
            });
        }
    });
    // Wire up window resize event
    $(window).resize(function () {
        if (Panopto.ModalPopup.defaultInstance.isShowing()) {
            Panopto.ModalPopup.defaultInstance.resizeContent();
        }
    });
    // Bind our navigation confirmation message to the beforeunload method
    $(window).bind("beforeunload", function () {
        return Panopto.ModalPopup.defaultInstance.windowNavigationMessage || undefined;
    });
    // Wire up navigate handler.
    // Call to add_navigate immediately fires handler with current state.
    // Probably should be the last call since this will fire a modal load.
    Panopto.Application.defaultInstance.add_navigate(Function.createDelegate(this, this._handleNavigate));
};
Panopto.ModalPopup.prototype =
    {
        // Host UI can register for updates by setting an opener with an updateData() function.
        //BUGBUG: This should be a custom event.
        opener: null,
        _page: null,
        _pageSet: null,
        _modalNavigationDataview: null,
        // Info about selected item in list.
        _selectedItemName: null,
        _queryParams: null,
        reloadFrame: true,
        windowNavigationMessage: null,
        // Animation intervals
        fadeInterval: 300,
        stretchInterval: 200,
        // Flags for when the modal closes
        _hasChanges: false,
        _modalUpdateArgs: null,
        _additionalArgs: null,
        showHeader: true,
        // Navigation handler to be added to by specific pages
        onNavigate: [],
        onLoadHandlers: [],
        // Keeps track of which controls are in the editing state
        // for the purposing of alerting the user should the user try
        // to leave without finishing what they started
        editingIds: [],
        // Collection of functions required to return true before the modal can close
        closeCriteria: [],
        // Whether or not the current user has write access - defaults to true since modal pages
        // default to requiring write access
        userHasWriteAccess: true,
        // Whether or not the current user has the explicit creator role - defaults to true
        // since modal pages default to creator-only
        userHasCreatorRole: true,
        accessRoles: {},
        // Attach navigation events to modal
        navigate: function (handler, clear) {
            // optionally clear the handler first
            if (clear) {
                this.onNavigate.length = 0;
            }
            this.onNavigate.push(handler);
        },
        addOnLoadHandler: function (handler, clear) {
            // optionally clear the handler first
            if (clear) {
                this.clearOnLoadHandlers();
            }
            this.onLoadHandlers.push(handler);
        },
        clearOnLoadHandlers: function () {
            this.onLoadHandlers.length = 0;
        },
        // Populate modal navigation links with links relevant to current item.
        _setPageSet: function () {
            // Localize page set name.
            var pageSetDisplayName = Panopto.ModalPopup.getPageSetDisplayName(this._pageSet);
            // Set item header text.
            $("#modalHeader").text(this._selectedItemName || "");
            // If there is no item header text, use the page set display name.
            if (!$("#modalHeader").text()) {
                $("#modalHeader").text(pageSetDisplayName || "");
            }
        },
        refreshNavigation: function () {
            // Only display nav links if there are more than one.
            if (this._pageSet.pages.length > 1) {
                this._modalNavigationDataview.set_data(this._pageSet.pages);
                this._modalNavigationDataview.refresh();
                $("#modalNavigation").show();
            }
            else {
                $("#modalNavigation").hide();
            }
        },
        // Sets roles for the current user
        setRoles: function (hasWriteAccess, hasCreatorRole) {
            this.userHasWriteAccess = hasWriteAccess;
            this.userHasCreatorRole = hasCreatorRole;
            this.refreshNavigation();
        },
        setAccessRoles: function (roles) {
            this.accessRoles = roles;
        },
        hasAccessRoles: function (roles) {
            var that = this;
            return _.every(roles, function (role) {
                return that.accessRoles[role];
            });
        },
        isShowing: function () {
            return $("#modalWindow").is(":visible");
        },
        animateIn: function () {
            $(".modal-background").fadeIn(this.fadeInterval);
            // Fade in and slide up the window
            $("#modalWindow").css({ display: "table", opacity: "0", top: "20px" }).animate({ opacity: "1", top: "0px" }, this.fadeInterval, "easeOutQuad", function () {
                $(this).show();
                Panopto.ModalPopup.defaultInstance.resizeContent();
            });
        },
        animateOut: function () {
            // Fade out and hide the background
            $(".modal-background").fadeOut(this.fadeInterval, function () {
                $(this).hide();
            });
            // Fade out and slide down the window
            $("#modalWindow").animate({ opacity: "0", top: "20px" }, this.fadeInterval, "easeInQuad", function () {
                $(this).hide();
            });
        },
        updateFrame: function () {
            // Set the page set to adjust the header accordingly
            this._setPageSet();
            if (this.reloadFrame) {
                // Update navigation and un-hide navigation/header controls
                this.refreshNavigation();
                $(".modal-header").css("visibility", "visible");
                $("#modalNavigation").css("visibility", "visible");
            }
            // Un-highlight currently selected item.
            $("#modalNavigation li").removeClass("selected");
            // The selected navigation item (if any).
            var $selectedItem = $("#modalLink-" + this._page);
            // There is a navigation item to select.
            if ($selectedItem.length) {
                // Highlight new selected item.
                $selectedItem.addClass("selected");
                // Use the selected item for the ARIA label, and the title text for the ARIA description.
                $("#modalWindow")
                    .attr("aria-labelledby", $selectedItem.attr("id"))
                    .attr("aria-describedby", "modalHeader");
            }
            else {
                // Use the modal title for the ARIA label, and remove the ARIA description.
                $("#modalWindow")
                    .attr("aria-labelledby", "modalHeader")
                    .removeAttr("aria-describedby");
            }
            // Show iframe content.
            this._displayDiv(false);
            // Show modal if it's not already shown
            if (!this.isShowing()) {
                this.animateIn();
            }
            // Reset the value of reloadFrame
            this.reloadFrame = false;
        },
        resizeContent: function () {
            // ".modal-view" should fill remaining vertical space
            var headerHeight = this._pageSet && this._pageSet.hasOwnHeader ? 0 : $(".modal-header").outerHeight();
            $("#modalIframe, #modalContentPlaceholder").height($(window).height() - headerHeight);
            // For mobile we want to make the modal the height of the page full window(not just iframe) but this causes an ugly scroll bar on desktop
            if (Panopto.Core.Browser.isMobileOrTablet) {
                $(".modal-background").height($(document).height());
            }
            _.each(this.onModalResize, function (resizeHandler) {
                resizeHandler();
            });
        },
        expandWindow: function (newClass) {
            // Swap class of modal window to fix the width
            var windowClass = $("#modalWindow").attr("class");
            if (windowClass !== newClass) {
                $("#modalWindow").switchClass($("#modalWindow").attr("class"), newClass, this.stretchInterval);
            }
        },
        // Pop up modal dialog with specified page, storing and display specified item name and queryParams (hash from names to values).
        show: function (page, selectedItemName, queryParams) {
            this._page = page;
            this._selectedItemName = selectedItemName;
            this._queryParams = queryParams;
            // Move any div content back into the main page prior to updating.
            this._unloadDivContent();
            Panopto.Core.UI.Accessibility.trapFocus($("#modalWindow"));
            // Display DIV
            if (page.indexOf("#") === 0) {
                // The recorder popup div requires write access to view
                // Other div content is available to all users
                if (page !== "#recorderPopup" || Panopto.user.hasWriteAccess) {
                    // Always show header for div content
                    $(".modal-header").show();
                    // Set item header text.
                    $("#modalHeader").text(this._selectedItemName || "");
                    // DIV modals always use "#modalHeader" for their title, and have no separate description.
                    $("#modalWindow")
                        .attr("aria-labelledby", "modalHeader")
                        .removeAttr("aria-describedby");
                    // Hide help link for div content
                    $("#modalHelp").hide();
                    // Move the specified div to the content placeholder.
                    $(page).appendTo($("#modalContentPlaceholder")).show();
                    // Show DIV content.
                    this._displayDiv(true);
                    this.animateIn();
                }
                else {
                    this.close();
                }
            }
            else {
                // Unauthenticated users can't view any iframe-based modal, redirect through login.
                if (!Panopto.user.isAuthenticated) {
                    location.href = Panopto.appRoot
                        + "/Pages/Auth/Login.aspx?ReturnUrl="
                        + encodeURIComponent(location.href);
                }
                // Set current pageset
                for (var pageSet in Panopto.ModalPopup.pageSets) {
                    if (Panopto.ModalPopup.isInSet(pageSet, page)) {
                        // We need to reload the outer frame if we're switching to another page set
                        if (this._pageSet !== Panopto.ModalPopup.pageSets[pageSet]) {
                            this.reloadFrame = true;
                            this._pageSet = Panopto.ModalPopup.pageSets[pageSet];
                        }
                        break;
                    }
                }
                if (this.reloadFrame) {
                    this.expandWindow(this._pageSet.windowClass);
                    // Determine whether or not to show the header
                    if (this._pageSet.hasOwnHeader) {
                        $(".modal-header").hide();
                    }
                    else {
                        $(".modal-header").show();
                    }
                    // Hide navigation/header controls until the inner page loads
                    $(".modal-header").css("visibility", "hidden");
                    $("#modalNavigation").css("visibility", "hidden");
                }
                // Load specified page in modal's iframe.
                this._setPage(page);
            }
        },
        // Move inline content in the modal back into the main page at the end of the DOM and hide.
        _unloadDivContent: function () {
            $("#modalContentPlaceholder").contents().appendTo($("body")).hide();
        },
        // Getter/Setter for modalUpdateArgs which can be read by updateData()
        updateArgs: function (modalUpdateArgs) {
            // take any falsy input except undefined
            if (modalUpdateArgs !== undefined) {
                this._modalUpdateArgs = modalUpdateArgs;
            }
            return this._modalUpdateArgs;
        },
        // Getter/Setter for hasChanges which tells the list view
        // whether to update after the modal is closed
        flagChanges: function (shouldFlag) {
            // take any falsy input except undefined
            if (shouldFlag !== undefined) {
                // Cast any truthy/falsey input to a bool
                this._hasChanges = !!shouldFlag;
            }
            return this._hasChanges;
        },
        _displayDiv: function (isShown) {
            if (isShown) {
                var queryObj = Panopto.Core.StringHelpers.parseQueryString(this._queryParams);
                // Clear item header class.
                $("#modalIcon").attr("class", "");
                if (queryObj.modalIcon) {
                    $("#modalIcon").addClass(queryObj.modalIcon);
                }
                this.hideNavigation();
                // Hide iframe.
                $("#modalIframe").hide();
                $("#modalContentPlaceholder").show();
            }
            else {
                // Set item header class.
                $("#modalIcon").attr("class", this._pageSet.itemClass);
                // Show iframe.
                $("#modalIframe").show();
                $("#modalContentPlaceholder").hide();
            }
        },
        // Hide handler to be added to by specific pages
        onHide: [],
        // Show handler to be added by specific pages
        onModalResize: [],
        // When the iframe attaches event handlers on its parent
        // then we need to keep track of them so that we can clean them
        // up before navigating off the iFrame
        childEventHandlers: [],
        // Close modal, updating host UI if requested by client page.
        hide: function (handler, clear) {
            if (handler && typeof (handler) === "function") {
                if (clear) {
                    this.onHide.length = 0;
                }
                this.onHide.push(handler);
            }
            else {
                this._page = null;
                // Reset values of user roles
                this.userHasWriteAccess = true;
                this.userHasCreatorRole = true;
                // Always reload the frame when re-opening
                this.reloadFrame = true;
                // Hide loading message, in case we haven't finished loading the current page yet.
                $("#loadingMessage").hide();
                // Unset any navigation message
                this.windowNavigationMessage = null;
                // Stop capturing focus.
                Panopto.Core.UI.Accessibility.releaseFocus($("#modalWindow"));
                // Hide our modal
                this.animateOut();
                // Execute attached hide handlers
                for (var i = 0; i < this.onHide.length; i++) {
                    this.onHide[i]();
                }
                // Move any div content back into the main page.
                this._unloadDivContent();
                if (this.flagChanges()) {
                    // Update the navbar if applicable
                    if (Panopto.NavBar) {
                        Panopto.NavBar.defaultInstance.afterSessionFolderAddOrDelete();
                    }
                }
                if (this.flagChanges() && this.opener && this.opener.updateData) {
                    this.opener.updateData(false, false, this.updateArgs());
                }
                // Clear flag.
                this.flagChanges(false);
                // Blank out iframe
                // location.replace() to avoid clobbering forward history.
                $get("modalIframe").contentWindow.location.replace(Panopto.Core.Constants.BlankPageUrl);
            }
        },
        // Switch pages within the current set.
        _setPage: function (page) {
            // Keep track of current page for state diffs.
            this._page = page;
            // Find the data for the current page within the current page set's page list.
            var pageData = $.grep(this._pageSet.pages, function (item) { return (item.Name === page); })[0];
            // Show "Loading..." message while iframe is loading
            $("#loadingMessage").show();
            $("#modalHelp")
                .toggle(!!pageData.HelpUrl)
                .prop('href', pageData.HelpUrl);
            // Build URL to target page.
            var scheme = location.href.substring(0, location.href.indexOf(":"));
            var url = "{0}://{1}{2}{3}".format(scheme, Panopto.webServerFQDN, this._pageSet.baseUrl, pageData.URL);
            if (this._queryParams) {
                url += "?" + this._queryParams;
                //HACKHACK: Share page is the one grouped page that has different params than its siblings.
                if (this._page === "SessionShare") {
                    url += "&isFolder=false";
                }
                else if (this._page == "PlaylistShare") {
                    url += "&isFolder=false&isPlaylist=true";
                }
                var mobilePromptParam = Panopto.Core.StringHelpers.parseQueryString(window.location.search)["nomobileprompt"];
                if (mobilePromptParam) {
                    url += ("&nomobileprompt=" + mobilePromptParam);
                }
            }
            // Populate iframe with URL of clicked link.
            // location.replace() to avoid clobbering forward history.
            $get("modalIframe").contentWindow.location.replace(url);
        },
        _getPageName: function (page) {
            return Panopto.GlobalResources["ModalPopup_" + page + "DisplayName"] || page;
        },
        // Configure modal based on application state.
        _handleNavigate: function (sender, args) {
            // Check if modal page specifies a pre-unload confirmation message.
            if (this._checkLeavePageConfirmation()) {
                // Since we may have events attached by the iframe on the parent and IE is very sensitive about this
                // in order to avoid freed script errors we need to clean up any handlers that may have been attached
                _.each(this.childEventHandlers, function (childEventHandler) {
                    $(document).off(childEventHandler.eventName, childEventHandler.handler);
                });
                // Now that the events are removed, clear the list
                this.childEventHandlers.length = 0;
                // Clear any previous resize handlers
                this.onModalResize.length = 0;
                // Execute navigation handlers
                for (var i = 0; i < this.onNavigate.length; i++) {
                    this.onNavigate[i]();
                }
                var appState = args.get_state();
                if ((appState.modalPage != this._page) || (appState.modalHeader != this._selectedItemName) || (appState.modalParams != this._queryParams)) {
                    if (appState.modalPage != null) {
                        this.show(appState.modalPage, appState.modalHeader, appState.modalParams);
                    }
                    else {
                        this.hide();
                    }
                }
                // Clear navigation handlers and confirmation dialog on successful navigation
                this.onNavigate = [];
                try {
                    var iframeWindow = $get("modalIframe").contentWindow;
                    if (iframeWindow && iframeWindow.Panopto) {
                        // Clear our navigation warnings
                        iframeWindow.Panopto.leavePageConfirmationMessage = null;
                        this.editingIds.length = 0;
                    }
                }
                catch (e) {
                    // Catch security exceptions when trying to access inner frame
                }
            }
        },
        modalArguments: function (args) {
            if (args !== undefined) {
                this._additionalArgs = args;
            }
            // Return an empty object if no args exist so that
            // it is easier to call properties
            return this._additionalArgs || {};
        },
        asyncHeaderUpdate: function (newHeader) {
            $('#modalHeader').text(newHeader);
            this._selectedItemName = newHeader;
        },
        // Close modal via page state.
        close: function () {
            if (this._checkLeavePageConfirmation()
                && _.all(this.closeCriteria, function (criteria) { return criteria(); })) {
                // Clear closeCriteria
                this.closeCriteria.length = 0;
                // Set the null state
                Panopto.Application.defaultInstance.updateState({
                    modalPage: null,
                    modalHeader: null,
                    modalParams: null
                });
                return true;
            }
            return false;
        },
        // flagControlAsEditing() flags a control as being edited so we can
        // warn the user if they are navigating away and have controls in the
        // editing state.
        // Takes controlId which is the asp control id of the editing panel
        flagControlAsEditing: function (controlId) {
            if (!_.contains(this.editingIds, controlId)) {
                this.editingIds.push(controlId);
            }
        },
        // flagControlAsNotEditing() removes a control id from the list of editing ids.
        // See comment on flagControlAsEditing()
        // Takes controlId which is the asp control id of the editing panel
        flagControlAsNotEditing: function (controlId) {
            this.editingIds = _.filter(this.editingIds, function (editingId) {
                return editingId !== controlId;
            });
        },
        // Check if the modal page has specified a confirmation message to display before leaving the page.
        // This must be triggered before page state is updated to prevent inconsistent state if user blocks navigation.
        // This also requires that the modal page use the same scheme as the outer page
        _checkLeavePageConfirmation: function () {
            // Wrap in a try/catch to avoid mixed content errors on certain modal pages
            try {
                // Get "window" of IFRAME.
                var iframeWindow = $get("modalIframe").contentWindow;
                // Get confirmation message (if any).
                var confirmationMessage = (iframeWindow && iframeWindow.Panopto)
                    ? iframeWindow.Panopto.leavePageConfirmationMessage
                    : null;
                // Warn user if they are editing controls and navigating away
                // distinct from confirmationMessage so that we don't clobber
                // either message since they arise in two different cases
                if (this.editingIds.length) {
                    if (confirm(Panopto.GlobalResources.ModalPopup_StillEditingNavigationWarning)) {
                        this.editingIds.length = 0;
                        return true;
                    }
                    else {
                        return false;
                    }
                }
                // A message is specified.
                if (confirmationMessage) {
                    // User selects "Leave page" in confirmation dialog.
                    if (confirm(confirmationMessage)) {
                        // This avoids double-prompting from in-page "onbeforeunload" handler when we actually trigger the page navigate.
                        iframeWindow.Panopto.leavePageConfirmationMessage = null;
                        // Allow navigate action to proceed.
                        return true;
                    }
                    // User selects "Stay on page" in confirmation dialog, block navigate action.
                    return false;
                }
            }
            catch (e) { }
            // If no message is specified, allow navigate action to proceed.
            return true;
        },
        // Toggles the loading indicator in the modal header
        toggleLoading: function (show) {
            $("#modalSpinner").toggleClass("spinning", !!show);
        },
        // Handlers can not be attached directly from an iframe
        // to parent in ie8 so we attach here instead
        attachDocumentHandler: function (handler, eventName) {
            $(document).on(eventName, handler);
            this.childEventHandlers.push({ handler: handler, eventName: eventName });
        },
        /**
         * Hides the side navigation
         */
        hideNavigation: function () {
            // Shrink the window down when hiding the navigation
            this.expandWindow("modal-div-content");
            // Hide tabs.
            $("#modalNavigation").hide();
        },
        /**
         * Shows the side navigation
         */
        showNavigation: function () {
            // Expand the window to make room for the navigation
            this.expandWindow(this._pageSet.windowClass);
            // Show tabs.
            $("#modalNavigation").show();
        }
    };
// Navigation links for various types of items the modal can display.
// Page lists are arrays so we can bind them (otherwise would use hash).
// Titles are strings because global resources haven't been bound yet.
Panopto.ModalPopup.pageSets =
    {
        CreateSessionLinks: {
            title: "CreateSessionDisplayName",
            windowClass: "create-session-window",
            itemClass: "session",
            baseUrl: Panopto.appRoot + "/Pages/Sessions/",
            pages: [
                { Name: "CreateSession", URL: "Create.aspx" }
            ]
        },
        CreateScheduledSessionLinks: {
            title: "CreateSessionDisplayName",
            windowClass: "create-scheduled-session-window",
            itemClass: "session",
            baseUrl: Panopto.appRoot + "/Pages/Sessions/",
            pages: [
                { Name: "CreateScheduledSession", URL: "Create.aspx" }
            ]
        },
        UploadSessionLinks: {
            title: "BatchUpload",
            windowClass: "upload-window",
            baseUrl: Panopto.appRoot + "/Pages/Sessions/",
            hasOwnHeader: true,
            pages: [
                { Name: "BatchUpload", URL: "Upload.aspx" }
            ]
        },
        BatchSessionLinks: {
            title: "BatchEdit",
            windowClass: "batch-edit-window",
            baseUrl: Panopto.appRoot + "/Pages/Sessions/",
            hasOwnHeader: true,
            pages: [
                { Name: "BatchEdit", URL: "BatchEdit.aspx" }
            ]
        },
        SessionLinks: {
            title: "SessionSettings",
            windowClass: "session-window",
            itemClass: "session",
            baseUrl: Panopto.appRoot + "/Pages/",
            pages: [
                { Name: "SessionInfo", URL: "Sessions/Info.aspx" },
                { Name: "SessionShare", URL: "Share.aspx", HideOnMaster: true, RequiresWriteAccess: true, HelpUrl: "http://support.panopto.com/documentation/video-management/how-do-i-share-session" },
                { Name: "SessionOutputs", URL: "Sessions/Outputs.aspx", RequiresWriteAccess: true },
                { Name: "SessionQuizResults", URL: "Sessions/QuizResults.aspx",
                    shouldShow: function () { return Panopto.features.isQuizzingAvailable; }
                },
                { Name: "SessionContents", URL: "Sessions/Contents.aspx", RequiredRole: Panopto.Data.AclRoleType.Creator },
                { Name: "SessionClips", URL: "Sessions/Clips.aspx", RequiresWriteAccess: true },
                { Name: "SessionSearch", URL: "Sessions/Search.aspx", RequiredRole: Panopto.Data.AclRoleType.Creator,
                    shouldShow: function () {
                        return Panopto.user.isAdmin || Panopto.features.isOCREnabled || Panopto.features.isASREnabled;
                    }
                },
                { Name: "SessionTranscript", URL: "Sessions/Transcript.aspx", RequiredRole: Panopto.Data.AclRoleType.Creator },
                { Name: "SessionManage", URL: "Sessions/Manage.aspx", RequiredRole: Panopto.Data.AclRoleType.Creator },
                { Name: "SessionLog", URL: "Sessions/Log.aspx", RequiredRole: Panopto.Data.AclRoleType.Creator }
            ]
        },
        BatchShareLinks: {
            title: "BatchShare",
            itemClass: "share",
            windowClass: "batch-share-window",
            baseUrl: Panopto.appRoot + "/Pages/",
            pages: [
                { Name: "BatchShare", URL: "Share.aspx", HelpUrl: "http://support.panopto.com/documentation/video-management/how-batch-share-folder-or-session" }
            ]
        },
        CreateFolderLinks: {
            title: "CreateFolderDisplayName",
            windowClass: "create-folder-window",
            itemClass: "folder",
            baseUrl: Panopto.appRoot + "/Pages/Folders/",
            pages: [
                { Name: "CreateFolder", URL: "Create.aspx" }
            ]
        },
        FolderLinks: {
            title: "FolderSettings",
            windowClass: "folder-window",
            itemClass: "folder",
            baseUrl: Panopto.appRoot + "/Pages/",
            pages: [
                { Name: "FolderInfo", URL: "Folders/Info.aspx" },
                { Name: "FolderShare", URL: "Share.aspx", HideOnMaster: true, HelpUrl: "http://support.panopto.com/documentation/video-management/how-do-i-share-folder" },
                { Name: "FolderSettings", URL: "Folders/Settings.aspx" },
                { Name: "FolderSearch", URL: "Folders/Search.aspx", RequiredRole: Panopto.Data.AclRoleType.Admin },
                { Name: "FolderOrder", URL: "Folders/Order.aspx" },
                { Name: "FolderManage", URL: "Folders/Manage.aspx" }
            ]
        },
        BatchCreateUserLinks: {
            title: "BatchCreateUserDisplayName",
            windowClass: "batch-create-user-window",
            itemClass: "user",
            baseUrl: Panopto.appRoot + "/Pages/Admin/Users/",
            pages: [
                { Name: "BatchCreateUsers", URL: "BatchCreate.aspx" }
            ]
        },
        CreateUserLinks: {
            title: "CreateUserDisplayName",
            windowClass: "create-user-window",
            itemClass: "user",
            baseUrl: Panopto.appRoot + "/Pages/Admin/Users/",
            pages: [
                { Name: "CreateUser", URL: "Create.aspx" }
            ]
        },
        UserLinks: {
            title: "UserSettings",
            windowClass: "user-window",
            itemClass: "user",
            baseUrl: Panopto.appRoot + "/Pages/Admin/Users/",
            pages: [
                { Name: "UserInfo", URL: "Info.aspx" },
                { Name: "UserPassword", URL: "Password.aspx",
                    // Only show user password for internal user
                    shouldShow: function () {
                        var userMeta = Panopto.Core.StringHelpers.parseQueryString(this._queryParams);
                        // parseQueryString() parses all types as type string
                        return userMeta.isInternal === "true";
                    }
                },
                { Name: "UserAccess", URL: "Access.aspx", RequiredRole: Panopto.Data.AclRoleType.Admin },
                { Name: "UserGroups", URL: "Groups.aspx", RequiredRole: Panopto.Data.AclRoleType.Admin },
                { Name: "UserPreset", URL: "Preset.aspx", RequiredRole: Panopto.Data.AclRoleType.Admin },
                {
                    Name: "UserApiKeys",
                    URL: "UserOauthKeys.aspx",
                    shouldShow: function () {
                        return Panopto.features.oauthClientsEnabled;
                    }
                }
            ]
        },
        UsageReport: {
            title: "UsageReportDisplayName",
            windowClass: "usage-window",
            itemClass: "usage-report",
            baseUrl: Panopto.appRoot + "/Pages/Admin/",
            pages: [
                { Name: "UsageGenerateReport", URL: "GenerateReport.aspx", RequiredRole: Panopto.Data.AclRoleType.Admin }
            ]
        },
        BatchCreateGroupLinks: {
            title: "BatchCreateGroupDisplayName",
            windowClass: "batch-create-group-window",
            itemClass: "group",
            baseUrl: Panopto.appRoot + "/Pages/Admin/Groups/",
            pages: [
                { Name: "BatchCreateGroup", URL: "BatchCreate.aspx" }
            ]
        },
        CreateGroupLinks: {
            title: "CreateGroupDisplayName",
            windowClass: "create-group-window",
            itemClass: "group",
            baseUrl: Panopto.appRoot + "/Pages/Admin/Groups/",
            pages: [
                { Name: "CreateGroup", URL: "Create.aspx" }
            ]
        },
        GroupLinks: {
            title: "GroupSettings",
            windowClass: "group-window",
            itemClass: "group",
            baseUrl: Panopto.appRoot + "/Pages/Admin/Groups/",
            pages: [
                { Name: "GroupInfo", URL: "Info.aspx" },
                {
                    Name: "GroupMembership",
                    URL: "Membership.aspx",
                    // With a new site configuration option, only show this if the "HideGroupMembership"
                    // configuration flag is turned off, the user is an admin, or the user is the
                    // group creator.
                    shouldShow: function () {
                        var userMeta = Panopto.Core.StringHelpers.parseQueryString(this._queryParams);
                        // parseQueryString() parses all types as type string
                        var showLink = Panopto.features.hideGroupMembership !== true
                            || (Panopto.user.isAdmin
                                || Panopto.user.userId === userMeta.creatorId);
                        return showLink;
                    }
                },
                { Name: "GroupAccess", URL: "Access.aspx" }
            ]
        },
        RemoteRecorderLinks: {
            title: "RemoteRecorderSettings",
            windowClass: "remote-recorder-window",
            itemClass: "remote-recorder",
            baseUrl: Panopto.appRoot + "/Pages/Admin/RemoteRecorders/",
            pages: [
                { Name: "RemoteRecorderPreview", URL: "Preview.aspx", AccessRoles: [Panopto.Core.AccessRoleType.ViewInfo] },
                { Name: "RemoteRecorderConfiguration", URL: "Configuration.aspx", AccessRoles: [Panopto.Core.AccessRoleType.EditConfiguration] },
                { Name: "RemoteRecorderSchedule", URL: "Schedule.aspx", AccessRoles: [Panopto.Core.AccessRoleType.ViewSchedule] },
                { Name: "RemoteRecorderAccess", URL: "Access.aspx", AccessRoles: [Panopto.Core.AccessRoleType.EditAccessEntries] }
            ]
        },
        StatsLinks: {
            title: "StatsDisplayName",
            windowClass: "stats-window",
            itemClass: "chart",
            baseUrl: Panopto.appRoot + "/Pages/Stats/",
            pages: [
                { Name: "Stats", URL: "Default.aspx" }
            ]
        },
        RemoteRecorderAdminLinks: {
            title: "RemoteRecorderSettingsAdmin",
            windowClass: "remote-recorder-admin-window",
            itemClass: "remote-recorder",
            baseUrl: Panopto.appRoot + "/Pages/Admin/RemoteRecorders/",
            pages: [
                { Name: "QualitySettings", URL: "AdminSettings.aspx" }
            ]
        },
        CreatePlaylistLinks: {
            title: "CreatePlaylistDisplayName",
            windowClass: "create-playlist-window",
            itemClass: "playlist",
            baseUrl: Panopto.appRoot + "/Pages/Playlists/",
            pages: [
                { Name: "CreatePlaylist", URL: "Create.aspx" }
            ]
        },
        PlaylistLinks: {
            title: "PlaylistDisplayName",
            windowClass: "playlist-window",
            itemClass: "playlist",
            baseUrl: Panopto.appRoot + "/Pages/",
            pages: [
                { Name: "PlaylistInfo", URL: "Playlists/Info.aspx" },
                {
                    Name: "PlaylistShare",
                    URL: "Share.aspx",
                    HideOnMaster: true,
                    RequiresWriteAccess: true
                },
                { Name: "PlaylistAccess", URL: "Playlists/Access.aspx" }
            ]
        },
        CreateOauthClientLinks: {
            title: "CreateOauthClientDisplayName",
            windowClass: "create-oauth-client-window",
            itemClass: "oauth-client",
            baseUrl: Panopto.appRoot + "/Pages/Admin/OauthClients/",
            pages: [
                { Name: "CreateOauthClient", URL: "Create.aspx" }
            ]
        },
        OauthClientLinks: {
            title: "OauthClientDisplayName",
            windowClass: "oauth-client-window",
            itemClass: "oauth-client",
            baseUrl: Panopto.appRoot + "/Pages/Admin/OauthClients/",
            pages: [
                { Name: "OauthClientInfo", URL: "Info.aspx" }
            ]
        }
    };
// Searches the specified set for the specified page and returns whether or not it was found.
Panopto.ModalPopup.isInSet = function (setName, pageName) {
    // Filter the pages array down to the items that match the current page name (0 or 1 in practice).
    var matches = $.grep(Panopto.ModalPopup.pageSets[setName].pages, function (item) {
        return item.Name === pageName;
    });
    // Convert to bool.
    return !!matches.length;
};
// Localize names for modal groupings.
Panopto.ModalPopup.getPageSetDisplayName = function (pageSet) {
    return Panopto.GlobalResources["ModalPopup_" + pageSet.title];
};
// Register the class with MicrosoftAjax once defined.
Panopto.ModalPopup.registerClass("Panopto.ModalPopup");

//# sourceMappingURL=ModalPopup.js.map
