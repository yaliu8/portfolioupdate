// Copyright 2007-2010 Panopto, Inc.
// All rights reserved.  Reuse and redistribution strictly prohibited.
/// <reference path="./Data.js"/>
/// <reference path="./Events.js"/>
/// <reference path="./Util.js"/>
/// <reference path="./RenderBranding.js" />
Type.registerNamespace("Panopto");
Panopto.Application = function () {
    // Initialize Sys.Component base class.
    Panopto.Application.initializeBase(this);
    // Cache static ref to default instance.
    Panopto.Application.defaultInstance = this;
    // Handle framework "navigate" event to dynamically update state.
    Sys.Application.add_navigate(Function.createDelegate(this, this._handleNavigate));
};
Panopto.Application.prototype =
    {
        // Store current state
        _state: {},
        // Threshold for showing the auth cookie expiry message to the user (in ms)
        authCookieMessageThreshold: 30000,
        init: function () {
            var self = this;
            // Grab the folder id parameter name
            var folderId = Panopto.Core.Constants.FolderIdParameter;
            var placeholderInputs = "#usernameInput, #passwordInput";
            // Instantiate modal popup control.
            // tslint:disable-next-line:no-unused-expression
            new Panopto.ModalPopup();
            // Wire up the "Home" and "Sessions" mini nav buttons in EmbeddedView.Nav mode
            Panopto.Core.UI.Handlers.button($("#embeddedHomeButton, #embeddedSessionsButton"), function () {
                // Select destination page based on which button was pressed
                var subPath = $(this).is($("#embeddedHomeButton")) ? "Home.aspx" : "Sessions/List.aspx";
                // Navigate, maintaining current embedded mode (always EmbeddedView.Nav, for now)
                location.href = "{0}/Pages/{1}?embedded={2}".format(Panopto.appRoot, subPath, Panopto.embeddedModeView);
            });
            // Wire up search controls if present.
            if ($get("searchQuery")) {
                $get("searchQuery").blur();
                // Set up default search watermark ("Search slides, notes, captions and more").
                this._searchWatermark = Sys.create.watermark("#searchQuery", Panopto.GlobalResources.Application_js_SearchMessage, "ghosted");
                this.ellipsisWatermarkText();
                // Submit search on [Enter]
                Panopto.Core.UI.Handlers.key($("#searchQuery"), this._handleSearchEntry, [Panopto.Core.Key.Enter], { context: this });
                // Submit search when search icon is clicked.
                Panopto.Core.UI.Handlers.button($("#searchImageWrapper"), this._handleSearchEntry, { context: this, allowPropagation: true });
                // Cancel search button
                Panopto.Core.UI.Handlers.button($("#cancelSearch"), this._handleSearchCancel, { context: this, allowPropagation: true });
            }
            Panopto.Core.UI.Components.popup($("#loginDropdown"), $("#loginLink, #loginButton"));
            Panopto.Core.UI.Components.popup($("#supportDropdown"), $("#supportLink"));
            Panopto.Core.UI.Handlers.button($(".logged-in .login-btn"), function () {
                $('.logging-out-spinner').show();
                $("#accountLink").hide();
                // Hack, asp registers the onLogout function to a click handler
                // and it registers the enter key to call something similar to $.click()
                // If we immediately set click to return false then the keypress
                // will no longer work in asp world.
                _.defer(function () {
                    $(".logged-in .logout-button").click(function () {
                        return false;
                    });
                });
            }, { allowPropagation: true, allowDefault: true });
            // Select the version when it gets focus (either through keyboard or mouse)
            Panopto.Core.UI.Handlers.button($("#supportDropdown .version-container-js input"), function () {
                this.select();
            });
            // Wire up the android and ios mobile launch button so that it is context aware
            Panopto.Core.UI.Handlers.button($("#launchAndroidApp, #launchIosApp"), function () {
                // Get the recorder launch url
                var url = Panopto.Application.defaultInstance.getMobileLaunchUrl(Panopto.Core.Constants.AppBrowseAction);
                window.location.href = url;
            });
            Panopto.Branding.brandElements(Panopto.branding.accentColor);
            // Wire up the create menu
            this.initCreateMenu();
            function iePlaceholderToggle($input) {
                // Settimeout hack to replicate the input event in IE
                // This is necessary if you put an event on keydown then it won't know what was entered into the
                // input but you don't want to wait until keyup necessarily.
                // What if they hold down the button.
                setTimeout(function () {
                    self.placeholderToggle($input);
                }, 1);
            }
            // IE doesn't support the lovely input event
            if (!Panopto.Core.Browser.isIE) {
                $(document).on('input', placeholderInputs, function () {
                    self.placeholderToggle($(this));
                });
            }
            else {
                $(document).on('keydown mouseup', placeholderInputs, function () {
                    iePlaceholderToggle($(this));
                });
            }
            // Make sure that if the user clicks on the placeholder then the input is focused
            $(document).on('click', "#userNamePlaceholder, #passwordPlaceholder", function () {
                var $associatedInput = $("#" + $(this).attr("data-input"));
                $($associatedInput).focus();
            });
            // Set up initial placeholders
            this.dropDownPlaceholders();
            // Add aria labels for all icon links with titles (for mozilla/NVDA)
            $("a").each(function () {
                $(this).attr("aria-label", $(this).attr("title"));
            });
            $(document).on('click', ".ipad-login-form .user-input-row", function (e) {
                var $row = $(e.target);
                if (!$row.hasClass('user-input-row')) {
                    $row = $(e.target).parent();
                }
                $row.find('input[type="password"], input[type="text"]').focus();
            });
            $(document).on('click', ".ipad-login-form .login-btn", function (e) {
                var elements = $(".ipad-login-form input[type='text'], .ipad-login-form input[type='password']");
                var numberOfElements = elements.length;
                var message = Panopto.GlobalResources.Controls_Login_LoggingInText_iOS;
                // Checks that there is text in each of the inputs before it changes the sign in button's text to 'signing in..'
                while (numberOfElements--) {
                    if ($(elements[numberOfElements]).val().length === 0) {
                        return true;
                    }
                }
                // If you are on the forget password page the sending message says 'Sending email' instead of 'Signing in'
                if ($("#PageContentPlaceholder_loginControl_forgotPasswordControls").length) {
                    return true;
                }
                $(".ipad-login-form .login-btn").text(message);
            });
            $(".utilityNav").toggleClass('is-logged-out', !Panopto.user.isAuthenticated);
            // Styling tweaks for Mobile Safari
            if (Panopto.Core.Browser.isMobileSafari) {
                $(".leftcolumn")
                    .css("height", "auto");
                $("#content")
                    .css("border-left", "1px solid #989898");
                $(".pagination")
                    .css("bottom", "inherit")
                    .css("border-left", "1px solid #989898")
                    .css("margin-left", "-1px");
            }
            this.startAuthCookieTimer();
            // see if a notification banner should be shown
            this.showNotificationBannerIfNeeded();
        },
        placeholderToggle: function ($input, skipAnimation) {
            var $placeholder = $("#" + $input.attr("data-placeholder"));
            var visibleAnimation = 'placeholder-visible';
            var visibleNoAnimation = 'placeholder-visible-no-animation';
            if ($input.length) {
                if ($input.val().length
                    // Chrome fills in password but as a security precaution doesn't return val()
                    // so as a hack we can test if it applied the auto fill pseudoclass
                    || (Panopto.Core.Browser.isWebkit && $input.is(":-webkit-autofill"))) {
                    $placeholder.removeClass(visibleAnimation);
                    $placeholder.removeClass(visibleNoAnimation);
                }
                else {
                    if (skipAnimation) {
                        $placeholder.addClass(visibleNoAnimation);
                    }
                    else {
                        $placeholder.addClass(visibleAnimation);
                    }
                }
            }
        },
        // init placeholders, called if dropdown changes or when page is initialized
        dropDownPlaceholders: function () {
            var self = this;
            // Change event fires on autofill, should the form be autofilled in then we need to adjust the placeholder
            $("#usernameInput, #passwordInput").on('mouseover change', function () {
                self.placeholderToggle($(this));
            });
            // Set up the initial placeholder toggle state sans animation
            this.placeholderToggle($("#usernameInput"), true);
            this.placeholderToggle($("#passwordInput"), true);
        },
        showNotificationBannerIfNeeded: function () {
            // see if a notification banner should be displayed
            if (Panopto.notificationMessage) {
                Panopto.notificationMessage = Panopto.Core.StringHelpers.displayStringFromResourceString(Panopto.notificationMessage, 'Resources.GlobalResources', Panopto.lang, Panopto.GlobalResources);
                // show a banner with the message
                this.showNotificationBanner(Panopto.notificationMessage, Panopto.notificationMessageId, true);
            }
        },
        // Shows the notification banner
        // message - the message to show
        // dismissable - whether or not the notification is dismissable
        // iconClass - optional class to add to the icon to switch icons
        showNotificationBanner: function (message, messageId, dismissable, iconClass) {
            var $notificationBanner = $("#notificationBanner");
            var $icon = $notificationBanner.find("#notificationIcon");
            var $dismiss = $notificationBanner.find("#dismissButton");
            // Clear and re-add icon class if applicable
            $icon.removeClass();
            if (iconClass) {
                $icon.addClass(iconClass);
            }
            // Replace any encoded single quotes with single quotes and add the
            // message
            message = message.replace(/&#39;/g, "'");
            $notificationBanner.find("#notificationMessageText").html(message);
            // Wire up dismiss button if applicable
            if (dismissable) {
                $dismiss.show();
                Panopto.Core.UI.Handlers.button($dismiss, function () {
                    // Hide the banner with a slide animation
                    $notificationBanner.slideUp();
                    Panopto.Core.CookieHelpers.setCookie(messageId + "_" + Panopto.user.userKey, "true", 30);
                });
            }
            else {
                $dismiss.hide();
            }
            // Show the banner
            $notificationBanner.slideDown();
        },
        startAuthCookieTimer: function () {
            var that = this;
            // If the user is logged in and the auth cookie has a timeout, start a
            // timer to see if the user needs to be redirected to the login page
            if (Panopto.user.isAuthenticated && (Panopto.authCookieTimeoutMinutes > 0) && !Panopto.isIOS) {
                // Wire up the UI
                this.wireUpLogoutWarningLink();
                var checkAuthCookie = function () {
                    var redirect = true;
                    // Get the cookie that contains the last time the auth cookie
                    // was refreshed on the server
                    var authRefreshTime = Panopto.Core.CookieHelpers.getCookie("AuthRefreshTime");
                    if (authRefreshTime) {
                        // See if the cookie has already expired
                        var now = new Date();
                        var expirationTime = new Date(parseInt(authRefreshTime, 10));
                        expirationTime.setMinutes(expirationTime.getMinutes() + Panopto.authCookieTimeoutMinutes);
                        // Add a little bit of a buffer to the redirect so that the
                        // auth cookie doesn't get refreshed on the redirect just
                        // before it expires
                        expirationTime.setSeconds(expirationTime.getSeconds() + 1);
                        redirect = (now > expirationTime);
                        if (!redirect) {
                            var remainingTime = expirationTime.getTime() - now.getTime();
                            // Show the expiry message if the threshold is met
                            if (remainingTime <= that.authCookieMessageThreshold) {
                                if (!$("#logoutWarningMessage").is(":visible")) {
                                    that.showAuthExpiryWarning(Math.round(remainingTime / 1000));
                                }
                                // Check again in 1 second
                                setTimeout(checkAuthCookie, 1000);
                            }
                            else {
                                that.hideAuthExpiryWarning();
                                // Check again at the threshold
                                setTimeout(checkAuthCookie, remainingTime - that.authCookieMessageThreshold);
                            }
                        }
                    }
                    // If there was no cookie or the cookie has expired, redirect
                    // to the login page
                    if (redirect) {
                        if (!window.location.href.startsWith(Panopto.loginUrl)) {
                            // Encode the return url parameter
                            var url = encodeURIComponent(window.location.href);
                            // Redirect to the login page
                            window.location.href = String.format("{0}?AuthExpired=true&ReturnUrl={1}", Panopto.loginUrl, url);
                        }
                    }
                };
                // Check the auth cookie which will take care of setting a timer
                // for when the cookie should be checked next
                checkAuthCookie();
            }
        },
        showAuthExpiryWarning: function (remainingSeconds) {
            var $warningText = $("#logoutWarningText");
            var updateCountdown = function () {
                $warningText.text(Panopto.GlobalResources.Site_AuthCookieExpiry_Warning.format(remainingSeconds));
                if (remainingSeconds > 0) {
                    remainingSeconds--;
                }
            };
            // Set initial state of countdown
            updateCountdown();
            // Set countdown interval
            this.countdownInterval = setInterval(updateCountdown, 1000);
            $("#logoutWarningLink").text(Panopto.GlobalResources.Site_AuthCookieExpiry_StayLoggedIn);
            // Show warning message
            $("#logoutWarningMessage").show();
        },
        hideAuthExpiryWarning: function () {
            // Revert link to visible state
            $("#logoutWarningInfo").hide();
            $("#logoutWarningLink").show();
            // Clear interval
            if (this.countdownInterval) {
                window.clearInterval(this.countdownInterval);
            }
            // Hide control
            $("#logoutWarningMessage").hide();
        },
        wireUpLogoutWarningLink: function () {
            var that = this;
            var $link = $("#logoutWarningLink");
            var $info = $("#logoutWarningInfo");
            Panopto.Core.UI.Handlers.button($link, function () {
                // Update text to indicate something is happening
                $link.hide();
                $info.text(Panopto.GlobalResources.Site_AuthCookieExpiry_Communicating);
                $info.show();
                Panopto.Util.callWebMethod({
                    serviceURL: "{0}/Services/Data.svc".format(Panopto.appRoot),
                    methodName: "RefreshAuthCookie",
                    onSuccess: function (data) {
                        that.hideAuthExpiryWarning();
                    },
                    onFailure: function (e) {
                        // Show the "something went wrong" message and "Try again" button
                        $info.text(Panopto.GlobalResources.Site_AuthCookieExpiry_SomethingWentWrong);
                        $link.text(Panopto.GlobalResources.Site_AuthCookieExpiry_TryAgain);
                        $link.show();
                    }
                });
            });
        },
        initCreateMenu: function () {
            // Grab the folder id parameter name
            var folderId = Panopto.Core.Constants.FolderIdParameter;
            var showSimplifiedRecorderDownload = Panopto.features.simplifiedRecorderDownloadEnabled
                && !Panopto.user.isAdmin && !Panopto.user.isVideographer;
            // Toggles simplified download view
            var toggleSimplifiedOptions = function (showSimplifiedOptions) {
                $("#simplifiedRecorderOptions").toggle(showSimplifiedOptions);
                $("#allRecorderOptions").toggle(!showSimplifiedOptions);
            };
            // Toggles launch options on both download views
            var toggleLaunchOptions = function (showLaunchOptions) {
                // Hide launch options if there is no href set, because it means launch is not supported
                // for the client version
                showLaunchOptions = showLaunchOptions && !!$("#launchRecorderLink")[0].href;
                // Do the necessary toggles
                $("#simplifiedRecorderLaunch, #launchOptions").toggle(showLaunchOptions);
                // There are different styles/text for recorder download when launch is present
                // in order to emphasize the launch button
                $("#simplifiedDownloadTitle").toggle(!showLaunchOptions);
                $("#simplifiedDownloadDefaultTitle").toggle(showLaunchOptions);
                $("#simplifiedDownloadButton").toggleClass("branded-gradient-button", !showLaunchOptions);
            };
            // Set the initial state of simplified options for fresh page loads
            toggleSimplifiedOptions(showSimplifiedRecorderDownload);
            toggleLaunchOptions(false);
            if (Panopto.user.hasWriteAccess && !Panopto.isHostedMaster) {
                // Show the create menu
                $("#createMenu").show();
                Panopto.Core.UI.Components.popup($("#createDropdown"), $("#createButton"));
                // Wire up download panopto button
                Panopto.Core.UI.Handlers.button($("#downloadRecorderButton"), function () {
                    Panopto.Application.defaultInstance.updateState({
                        modalPage: "#recorderPopup",
                        modalHeader: Panopto.GlobalResources.Controls_RecorderDownload_DisplayName,
                        modalParams: Panopto.Core.StringHelpers.serializeObjectToQueryString({ modalIcon: "download-icon" })
                    });
                    // Toggle download UI
                    toggleSimplifiedOptions(showSimplifiedRecorderDownload);
                    toggleLaunchOptions(false);
                    // Put the user's focus in the modal
                    Panopto.Core.ElementHelpers.putFocusIntoModal($("#recorderPopup"));
                }, { allowPropagation: true });
                // Wire up recorder link
                Panopto.Core.UI.Handlers.button($("#newRecordingLink"), function newRecordingHandler() {
                    Panopto.GoogleAnalytics.sendEvent({
                        source: "create-menu",
                        action: "record-new-session"
                    });
                    var shouldLaunch = false;
                    if (Panopto.isIOS) {
                        // Always launch the recorder on iOS
                        shouldLaunch = true;
                    }
                    else if (!Panopto.isAndroid) {
                        // Don't launch the app on Android because the app doesn't support
                        // recording. This should be desktop, so check some cookies to
                        // determine whether the app should be launched.
                        Panopto.Application.defaultInstance.updateState({
                            modalPage: "#recorderPopup",
                            modalHeader: Panopto.GlobalResources.Site_NewSessionLink,
                            modalParams: Panopto.Core.StringHelpers.serializeObjectToQueryString({ modalIcon: "download-icon" })
                        });
                        // Toggle download UI
                        toggleSimplifiedOptions(showSimplifiedRecorderDownload);
                        toggleLaunchOptions(true);
                        // Toggle back to pre-launch state in case we're reopening this UI.
                        $("#recorderLaunchedMessage").hide();
                        $("#createDropdown").hide();
                        // If the user has launched the recorder before, launch automatically.
                        shouldLaunch = !!Panopto.Core.CookieHelpers.getCookie("launchRecorderCookie");
                    }
                    if (shouldLaunch) {
                        // Launch the recorder
                        Panopto.Application.defaultInstance.launchRecorder();
                    }
                }, { allowPropagation: true });
                // Wire up link to switch from simplified recorder download to full recorder download
                Panopto.Core.UI.Handlers.button($("#advancedDownloadLink"), function () {
                    toggleSimplifiedOptions(false); // showSimplifiedOptions=false
                });
                // Wire up launch recorder links once DIV is rendered.
                Panopto.Core.UI.Handlers.button($("#launchRecorderLink"), this.launchRecorder);
                Panopto.Core.UI.Handlers.button($("#simplifiedLaunchButton"), this.launchRecorder);
                // Wire up upload link
                if (Panopto.user.hasUnison && document.URL.split(":")[0] === Panopto.uriScheme) {
                    $("#uploadLink").show();
                    Panopto.Core.UI.Handlers.button($("#uploadLink"), function uploadMediaHandler() {
                        Panopto.GoogleAnalytics.sendEvent({
                            source: "create-menu",
                            action: "upload-media"
                        });
                        var params = null;
                        if (Panopto.Application.defaultInstance._state[folderId]) {
                            var createParams = {
                                folderID: Panopto.Application.defaultInstance._state[folderId]
                            };
                            params = Panopto.Core.StringHelpers.serializeObjectToQueryString(createParams);
                            $("#createDropdown").hide();
                        }
                        // Hide dropdown
                        $("#createDropdown").hide();
                        Panopto.Application.defaultInstance.updateState({
                            modalPage: "BatchUpload",
                            modalHeader: null,
                            modalParams: params
                        });
                    }, { allowPropagation: true });
                }
                else {
                    $("#uploadLink").hide();
                }
                var showCreateSession = function (createParams, headerText) {
                    // Add folder param
                    if (Panopto.Application.defaultInstance._state[folderId]) {
                        createParams.folderID = Panopto.Application.defaultInstance._state[folderId];
                    }
                    // Hide dropdown
                    $("#createDropdown").hide();
                    if (createParams.schedule) {
                        Panopto.Application.defaultInstance.updateState({
                            modalPage: "CreateScheduledSession",
                            modalHeader: headerText,
                            modalParams: Panopto.Core.StringHelpers.serializeObjectToQueryString(createParams)
                        });
                    }
                    else {
                        Panopto.Application.defaultInstance.updateState({
                            modalPage: "CreateSession",
                            modalHeader: headerText,
                            modalParams: Panopto.Core.StringHelpers.serializeObjectToQueryString(createParams)
                        });
                    }
                };
                if (Panopto.features.broadcastEnabled) {
                    // Wire up webcast link
                    $("#webcastLink").show();
                    Panopto.Core.UI.Handlers.button($("#webcastLink"), function webcastHandler() {
                        Panopto.GoogleAnalytics.sendEvent({
                            source: "create-menu",
                            action: "webcast"
                        });
                        showCreateSession({ broadcast: true }, null);
                    }, { allowPropagation: true });
                }
                else {
                    $("#webcastLink").hide();
                }
                // Wire up the scheduled recording link
                Panopto.Core.UI.Handlers.button($("#scheduledLink"), function scheduleRecordingHandler() {
                    Panopto.GoogleAnalytics.sendEvent({
                        source: "create-menu",
                        action: "scheduled-recording"
                    });
                    showCreateSession({ schedule: true }, Panopto.GlobalResources.ModalPopup_CreateScheduledRecordingDisplayName);
                }, { allowPropagation: true });
                // Wire up build link
                Panopto.Core.UI.Handlers.button($("#buildLinkUnison"), function buildLinkUnisonHandler() {
                    Panopto.GoogleAnalytics.sendEvent({
                        source: "create-menu",
                        action: "build-session",
                        label: "unison"
                    });
                    showCreateSession({ build: true }, Panopto.GlobalResources.Site_BuildSessionLink);
                }, { allowPropagation: true });
                Panopto.Core.UI.Handlers.button($("#buildLinkNoUnison"), function buildLinkNoUnisonHandler() {
                    Panopto.GoogleAnalytics.sendEvent({
                        source: "create-menu",
                        action: "build-session",
                        label: "no-unison"
                    });
                    showCreateSession({ build: true }, Panopto.GlobalResources.Site_NewPlaceholderSessionLink);
                }, { allowPropagation: true });
                // Wire up the create playlist link
                Panopto.Core.UI.Handlers.button($("#playlistLink"), function createPlaylistHandler() {
                    var createParams = {};
                    Panopto.GoogleAnalytics.sendEvent({
                        source: "create-menu",
                        action: "playlist"
                    });
                    // Add folder param
                    if (Panopto.Application.defaultInstance._state[folderId]) {
                        createParams.folderID = Panopto.Application.defaultInstance._state[folderId];
                    }
                    $("#createDropdown").hide();
                    Panopto.Application.defaultInstance.updateState({
                        modalPage: "CreatePlaylist",
                        modalHeader: null,
                        modalParams: Panopto.Core.StringHelpers.serializeObjectToQueryString(createParams)
                    });
                }, { allowPropagation: true });
                // Wire up the build session link
                $("#buildLinkUnison").toggle(Panopto.user.hasUnison);
                $("#buildLinkNoUnison").toggle(!Panopto.user.hasUnison);
                // Wire up the new folder link
                if (Panopto.user.canCreateFolders) {
                    // Update the text
                    this.updateCreateFolderLink(null);
                    $("#folderLink").show();
                    Panopto.Core.UI.Handlers.button($("#folderLink"), function newFolderHandler() {
                        Panopto.GoogleAnalytics.sendEvent({
                            source: "create-menu",
                            action: "new-folder"
                        });
                        var params = null;
                        if (Panopto.Application.defaultInstance._state[folderId]) {
                            var createParams = {
                                parentID: Panopto.Application.defaultInstance._state[folderId]
                            };
                            params = Panopto.Core.StringHelpers.serializeObjectToQueryString(createParams);
                        }
                        $("#createDropdown").hide();
                        Panopto.Application.defaultInstance.updateState({
                            modalPage: "CreateFolder",
                            modalHeader: null,
                            modalParams: params
                        });
                    }, { allowPropagation: true });
                }
                else {
                    $("#folderLink").hide();
                }
                if (Panopto.features.isSchedulingAvailableToCreators
                    || Panopto.user.isVideographer
                    || Panopto.user.isAdmin
                    || Panopto.user.canRecordRemoteRecorders) {
                    $("#scheduledLink").show();
                }
                else {
                    $("#scheduledLink").hide();
                }
                if (Panopto.user.isCreator
                    || Panopto.user.isVideographer
                    || Panopto.user.isAdmin) {
                    $("#playlistLink").show();
                }
                else {
                    $("#playlistLink").hide();
                }
            }
            else {
                $("#createMenu").hide();
            }
        },
        // Update the folder link text based on whether the user is in a folder
        updateCreateFolderLink: function (folderName) {
            // Either "At the top level or anywhere else" or "In <folder name> or
            // anywhere else"
            var text = folderName
                ? String.format(Panopto.GlobalResources.Site_FolderLink_TextChild, folderName)
                : Panopto.GlobalResources.Site_FolderLink_TextTopLevel;
            $("#folderLinkText").text(text);
        },
        // Update application state by merging in the passed values.
        updateState: function (newState) {
            // Merge new values into state.
            // Only overwrites properties that are specified in newState.
            $.extend(this._state, newState);
            // History can't safely store objects in the state object
            // Serialize state values into strings
            for (var prop in this._state) {
                if (this._state[prop] !== null) {
                    this._state[prop] =
                        Sys.Serialization.JavaScriptSerializer.serialize(this._state[prop]);
                }
            }
            // Create a history point for the current state.
            // Triggers updates via "navigate" event.
            Sys.Application.addHistoryPoint(this._state);
        },
        currentlySearching: function () {
            return !!this._state.query;
        },
        /* Handle Sys.Application.navigate event */
        _handleNavigate: function (sender, args) {
            // Store current state.
            this._state = args.get_state();
            // History can't safely store objects in the state object
            // Deserialize state values from strings
            for (var prop in this._state) {
                if (this._state[prop] !== null) {
                    try {
                        this._state[prop] =
                            JSON.parse(this._state[prop]);
                    }
                    catch (e) {
                        // Handle "bare" state strings gracefully.
                        // This should not happen unless there are user-entered values.
                    }
                }
            }
            // Fire off our own "navigate" event to listeners.
            this._navigate(sender, args);
        },
        /* Panopto.Application "navigate" event */
        // Custom event handlers.
        add_navigate: function (handler) {
            this.get_events().addHandler("navigate", handler);
            // Fire the handler with current state on add.
            // This allows listeners to catch up to state loaded from bookmarks, e.g.
            handler(this, new Sys.HistoryEventArgs(this._state));
        },
        remove_navigate: function (handler) {
            this.get_events().removeHandler("navigate", handler);
        },
        // Raise "navigate" event.
        _navigate: function (sender, args) {
            var handler = this.get_events().getHandler("navigate");
            // Delegate to listener(s) if present.
            if (handler) {
                handler(this, args);
            }
        },
        /* searchSubmit event */
        // Framework boilerplate to add/remove custom event handlers.
        add_searchSubmit: function (handler) {
            this.get_events().addHandler("searchSubmit", handler);
        },
        remove_searchSubmit: function (handler) {
            this.get_events().removeHandler("searchSubmit", handler);
        },
        // Raise "searchSubmit" event.
        _searchSubmit: function (query) {
            var handler = this.get_events().getHandler("searchSubmit");
            // Delegate to listener(s) if present.
            if (handler) {
                handler(this, new Panopto.Events.SubmitSearchEventArgs(query));
            }
            else {
                location.href = Panopto.Application.getBookmarkURL(Panopto.appRoot + "/Pages/Sessions/List.aspx", {
                    query: query
                });
            }
        },
        // Handle search submit from icon or [Enter] key.
        _handleSearchEntry: function () {
            var query = this._searchWatermark ? this._searchWatermark.get_Text() : $get("searchQuery").value;
            // Fire "searchSubmit" event (convert "" to null).
            this._searchSubmit(query || null);
        },
        _handleSearchCancel: function () {
            // Don't outline search cancel image.
            $get("cancelSearch").blur();
            // Clear search box.
            this.setSearchText("");
            // Handle empty search.
            this._handleSearchEntry();
        },
        /* Watermark extender for header search box */
        _searchWatermark: null,
        setSearchWatermarkText: function (searchWatermarkText) {
            this._searchWatermark.set_WatermarkText(searchWatermarkText);
            this.ellipsisWatermarkText();
        },
        setSearchText: function (searchText) {
            this._searchWatermark.set_Text(searchText);
        },
        // This ellipsis the text when its too long and it also sets a
        // title attribute with the full text so that it can be read on hover
        ellipsisWatermarkText: function () {
            var searchWatermark = Panopto.Core.ElementHelpers.inputEllipsis($("#searchQuery"), this._searchWatermark._watermarkText, Panopto.GlobalResources.ViewerPlus_TitleEllipsis);
            if (searchWatermark.ellipsied) {
                $("#searchQuery").attr("title", this._searchWatermark._watermarkText);
            }
            else {
                $("#searchQuery").attr("title", Panopto.GlobalResources.Site_SearchHover);
            }
            this._searchWatermark.set_WatermarkText(searchWatermark.text);
        },
        /* Recorder launch */
        launchRecorder: function () {
            // Get the launch URL from the launch button link.
            var launchUrl = $("#launchRecorderLink")[0].href;
            if (launchUrl) {
                // Show "launched" message and hide main launch button.
                $("#recorderLaunchDiv").hide();
                $("#recorderLaunchedMessage").fadeIn('slow');
                // Set the IFRAME location to the Launch Recorder button's target HREF.
                $("#launchRecorderFrame")[0].contentWindow.location.href = Panopto.Application.defaultInstance.getRecorderLaunchUrl(Panopto.Core.Constants.AppRecordAction);
            }
        },
        // Get a recorder launch url that passes all current query params and hash info to
        // the launch page
        getRecorderLaunchUrl: function (actionType) {
            // The base launch url is the launch recorder page
            var launchUrl = Panopto.appRoot + "/Pages/Recorder/LaunchRecorder.aspx";
            // Create a query parameter for the action type
            var queryParams = {};
            queryParams[Panopto.Core.Constants.AppActionTypeParameter] = actionType;
            // Add any query parameters and hash from the current url to the launch url
            launchUrl = launchUrl + window.location.search + window.location.hash;
            // Convert the hash to query parameters
            launchUrl = Panopto.Core.StringHelpers.convertFragmentToQuery(launchUrl);
            // Add the action query parameter
            launchUrl = Panopto.Core.StringHelpers.addQueryParameter(launchUrl, queryParams);
            return launchUrl;
        },
        // Get a mobile app launch url that passes all current query params and hash info to
        // the mobile app launch page
        getMobileLaunchUrl: function (actionType) {
            // The base launch url is the mobile launch page
            var launchUrl = Panopto.appRoot + "/Pages/Mobile/iOSAppLaunch.aspx";
            // Convert the hash to query parameters
            var returnUrl = Panopto.Core.StringHelpers.convertFragmentToQuery(window.location.href);
            // Create a query parameter for the action type and return url
            var queryParams = {};
            queryParams[Panopto.Core.Constants.AppActionTypeParameter] = actionType;
            queryParams[Panopto.Core.Constants.MobileLaunchChoice] = Panopto.Core.Constants.MobileLaunchIgnoreCookie;
            queryParams.ReturnUrl = returnUrl;
            // Add the action query parameter
            launchUrl = Panopto.Core.StringHelpers.addQueryParameter(launchUrl, queryParams);
            return launchUrl;
        }
    };
// Create a bookmark URL for deep-linking into a page with predefined client-side state.
//[BUGBUG 42504]: Point refs to Panopto.Application.getBookmarkURL() to Panopto.Core.UrlHelpers.getStateURL().
Panopto.Application.getBookmarkURL = function (url, state) {
    return Panopto.Core.UrlHelpers.getStateURL(url, state);
};
// sets the class name for the content div for each list page and removes other pages specific class names
Panopto.Application.SetClassName = function (className) {
    var $content = $("#content"), classList = [
        "content-allSessions", "content-scheduled", "content-processing", "content-allFolders", "content-usage",
        "content-users", "content-groups", "content-remoteRecorders", "content-licenses", "content-remote-recorders",
        "content-oauth-client"
    ];
    for (var i = 0; i < classList.length; i++) {
        $content.removeClass(classList[i]);
    }
    // Check that class name is in the list
    if (classList.indexOf(className) >= 0) {
        $content.addClass(className);
    }
};
Panopto.Application.registerClass("Panopto.Application", Sys.Component);
// Make sure the class hasn't already been instantiated, then instantiate our singleton class.
// We instantiate early to catch history navigation events from the framework at load time.
if (!Panopto.Application.defaultInstance) {
    // tslint:disable-next-line:no-unused-expression
    new Panopto.Application();
}

//# sourceMappingURL=Application.js.map
