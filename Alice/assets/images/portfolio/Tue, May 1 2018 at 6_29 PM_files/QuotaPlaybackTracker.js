var PanoptoTS;
(function (PanoptoTS) {
    var Controls;
    (function (Controls) {
        // Tracks playback (working in conjunction with PlaybackLogger) to
        // enforce quotas when viewing sessions
        var QuotaPlaybackTracker = /** @class */ (function () {
            function QuotaPlaybackTracker(service, resources, deliveryId, deliveryDuration, ownerId, userId, togglePlayer) {
                var _this = this;
                this.service = service;
                this.resources = resources;
                this.deliveryId = deliveryId;
                this.deliveryDuration = deliveryDuration;
                this.ownerId = ownerId;
                this.userId = userId;
                this.togglePlayer = togglePlayer;
                this.secondsListened = 0;
                this.quotaBlockedCookieName = QuotaPlaybackTracker.quotaBlockedCookiePrefix + this.deliveryId;
                // Render the container
                this.render();
                // Respect the query param to use a mock service
                if (Panopto.Core.StringHelpers.parseQueryString(window.location.search).mock === "true") {
                    this.service = new PanoptoTS.ServiceInterface.MockUserService();
                }
                // Get the quota details
                this.service.getQuotaSnapshot(ownerId, function (detail) {
                    // Calculate the available quota
                    var remainingSeconds = detail.activePeriod.deliveredSummary.modifierSummary.sumBase +
                        detail.activePeriod.deliveredSummary.modifierSummary.sumReferral +
                        detail.activePeriod.deliveredSummary.modifierSummary.sumRollover -
                        detail.activePeriod.deliveredSummary.valueSummary.sumTotal;
                    _this.overQuota = remainingSeconds < deliveryDuration;
                    // If there is available quota remaining, remove any prior cookie blocking the user
                    if (!_this.overQuota) {
                        _this.setBlockedCookie(false);
                    }
                    // Determine if the user has been blocked in the past
                    _this.blocked = _this.getBlockedCookie();
                    // Use a default tease duration as the minimum value when over quota
                    _this.availableSeconds = Math.max(remainingSeconds, _this.blocked ? 0 : QuotaPlaybackTracker.playbackTeaseDuration);
                    // For anonymous users, show the modal immediately if not under quota
                    _this.showForAnonymous();
                }, function () {
                    // On failure, proceed as if under quota
                    _this.showForAnonymous();
                });
            }
            // Renders the component UX in the container
            QuotaPlaybackTracker.prototype.render = function () {
                $("body").append(QuotaPlaybackTracker.modalTemplate({}));
                this.container = $(".quota-playback-tracker");
                this.modalDialog = this.container.find(".quota-playback-tracker-modal");
                // Hide the container at the start
                this.container.hide();
            };
            // Shows the appropriate dialog and pauses the player
            QuotaPlaybackTracker.prototype.show = function () {
                this.togglePlayer(false);
                // Choose which version of the dialog to render
                if (!this.userId) {
                    this.renderAnonymousUserDialog();
                }
                else if (this.userId === this.ownerId) {
                    this.renderOwnerDialog();
                }
                else {
                    this.renderViewerDialog();
                }
                // Show the container and set the appropriate dialog height
                this.container.show();
                this.modalDialog.height(this.modalDialog.find(".quota-dialog").height());
            };
            // Hide the dialog and start the player
            QuotaPlaybackTracker.prototype.hide = function () {
                this.container.hide();
                this.togglePlayer(true);
            };
            // Shows the modal at the start only if the user is anonymous and hasn't
            // seen the signup modal in awhile
            QuotaPlaybackTracker.prototype.showForAnonymous = function () {
                if (!this.userId && !this.overQuota) {
                    // Figure out how many times the user has seen the sign up modal from the cookie
                    var timesShown = parseInt(Panopto.Core.CookieHelpers.getCookie(QuotaPlaybackTracker.signupViewedCookieName), 10) || 0;
                    // Only show the modal every n times
                    if (timesShown % QuotaPlaybackTracker.signupShowInterval === 0) {
                        this.show();
                    }
                    // Update the cookie every time we attempt to show the modal
                    Panopto.Core.CookieHelpers.setCookie(QuotaPlaybackTracker.signupViewedCookieName, timesShown + 1);
                }
            };
            // Renders the appropriate anonymous user dialog based on whether or not the owner
            // is over quota and the user is blocked
            QuotaPlaybackTracker.prototype.renderAnonymousUserDialog = function () {
                var _this = this;
                this.modalDialog.html(QuotaPlaybackTracker.anonymousUserDialogTemplate({
                    dialogTitle: this.overQuota
                        ? this.resources.QuotaDialog_Title_Anonymous_OverQuota
                        : this.resources.QuotaDialog_Title_Anonymous,
                    dialogInstructions: this.overQuota
                        ? this.resources.QuotaDialog_Instructions_Anonymous_OverQuota
                        : this.resources.QuotaDialog_Instructions_Anonymous,
                    dismissUrl: this.overQuota && this.blocked
                        ? "https://www.panopto.com/" // TODO: insert link to learn more (gyoung; 4/12/18)
                        : "#",
                    dismissText: this.overQuota && this.blocked
                        ? this.resources.QuotaDialog_LearnMore
                        : this.resources.QuotaDialog_NotNow,
                    signupUrl: "https://www.panopto.com/",
                    signupText: this.resources.QuotaDialog_SignUp
                }));
                // Dismissal is only an option when not over quota or not blocked
                if (!this.overQuota || !this.blocked) {
                    Panopto.Core.UI.Handlers.button(this.modalDialog.find(".quota-dialog-dismiss"), function () {
                        _this.hide();
                    });
                }
            };
            // Renders the "quota exceeded" dialog for a logged in user
            QuotaPlaybackTracker.prototype.renderViewerDialog = function () {
                var _this = this;
                this.modalDialog.html(QuotaPlaybackTracker.viewerDialogTemplate({
                    dialogTitle: this.resources.QuotaDialog_Title_Viewer,
                    dialogInstructions: this.resources.QuotaDialog_Instructions_Viewer,
                    backUrl: "/Panopto",
                    backText: this.resources.QuotaDialog_Back,
                    notifyText: this.resources.QuotaDialog_Notify,
                    notificationSentText: this.resources.QuotaDialog_NotificationSent
                }));
                Panopto.Core.UI.Handlers.button(this.modalDialog.find(".quota-dialog-notify"), function () {
                    // TODO: send email to owner (gyoung; 4/11/18)
                    _this.modalDialog.find(".quota-dialog-notify").hide();
                    _this.modalDialog.find(".quota-dialog-notification-sent").show();
                });
            };
            // Renders the "quota exceeded" dialog for the owner
            QuotaPlaybackTracker.prototype.renderOwnerDialog = function () {
                this.modalDialog.html(QuotaPlaybackTracker.ownerDialogTemplate({
                    dialogTitle: this.resources.QuotaDialog_Title_Owner,
                    dialogInstructions: this.resources.QuotaDialog_Instructions_Owner,
                    inviteUrl: "/Panopto/Pages/Invite.aspx",
                    inviteText: this.resources.QuotaDialog_InvitePeople,
                    upgradeUrl: "https://www.panopto.com/",
                    upgradeText: this.resources.QuotaDialog_Upgrade
                }));
            };
            // Updates the total seconds listened and determines if blocking is necessary
            QuotaPlaybackTracker.prototype.update = function (newSecondsListened) {
                this.secondsListened += newSecondsListened;
                this.blocked = this.availableSeconds !== undefined
                    && this.secondsListened >= this.availableSeconds;
                if (this.blocked) {
                    this.show();
                    this.setBlockedCookie(true);
                }
            };
            // Sets whether or not the current user should be blocked from seeing the teaser content
            QuotaPlaybackTracker.prototype.setBlockedCookie = function (blocked) {
                if (blocked) {
                    Panopto.Core.CookieHelpers.setCookie(this.quotaBlockedCookieName, blocked);
                }
                else {
                    Panopto.Core.CookieHelpers.deleteCookie(this.quotaBlockedCookieName);
                }
            };
            // Gets whether or not the current user should be blocked from seeing the teaser content
            QuotaPlaybackTracker.prototype.getBlockedCookie = function () {
                return Panopto.Core.CookieHelpers.getCookie(this.quotaBlockedCookieName) === "true";
            };
            QuotaPlaybackTracker.modalTemplate = _.template("\n            <div class='quota-playback-tracker'>\n                <div class='quota-playback-tracker-modal'>\n                </div>\n            </div>\n        ");
            QuotaPlaybackTracker.anonymousUserDialogTemplate = _.template("\n            <div class='quota-anonymous-dialog quota-dialog'>\n                <div class='quota-dialog-header'><@= dialogTitle @></div>\n                <div class='quota-dialog-instructions'><@= dialogInstructions @></div>\n                <div class='quota-dialog-buttons'>\n                    <a href='<@= dismissUrl @>' class='quota-dialog-button quota-dialog-dismiss'><@= dismissText @></a>\n                    <a href='<@= signupUrl @>' class='quota-dialog-button safety-background'><@= signupText @></a>\n                </div>\n            </div>\n        ");
            QuotaPlaybackTracker.viewerDialogTemplate = _.template("\n            <div class='quota-viewer-dialog quota-dialog'>\n                <div class='quota-dialog-header'><@= dialogTitle @></div>\n                <div class='quota-dialog-instructions'><@= dialogInstructions @></div>\n                <div class='quota-dialog-buttons'>\n                    <a href='<@= backUrl @>' class='quota-dialog-button'><@= backText @></a>\n                    <a href='#' class='quota-dialog-button quota-dialog-notify safety-background'><@= notifyText @></a>\n                    <span class='quota-dialog-notification-sent' style='display:none;'><@= notificationSentText @></span>\n                </div>\n            </div>\n        ");
            QuotaPlaybackTracker.ownerDialogTemplate = _.template("\n            <div class='quota-owner-dialog quota-dialog'>\n                <div class='quota-dialog-header'><@= dialogTitle @></div>\n                <div class='quota-dialog-instructions'><@= dialogInstructions @></div>\n                <div class='quota-dialog-buttons'>\n                    <a href='<@= inviteUrl @>' class='quota-dialog-button'><@= inviteText @></a>\n                    <a href='<@= upgradeUrl @>' class='quota-dialog-button safety-background'><@= upgradeText @></a>\n                </div>\n            </div>\n        ");
            QuotaPlaybackTracker.playbackTeaseDuration = 30;
            QuotaPlaybackTracker.quotaBlockedCookiePrefix = "quotaBlocked";
            QuotaPlaybackTracker.signupViewedCookieName = "signupViewed";
            // The number of times to allow an anonymous user to view videos before showing
            // the sign up modal again
            QuotaPlaybackTracker.signupShowInterval = 5;
            return QuotaPlaybackTracker;
        }());
        Controls.QuotaPlaybackTracker = QuotaPlaybackTracker;
    })(Controls = PanoptoTS.Controls || (PanoptoTS.Controls = {}));
})(PanoptoTS || (PanoptoTS = {}));

//# sourceMappingURL=QuotaPlaybackTracker.js.map
