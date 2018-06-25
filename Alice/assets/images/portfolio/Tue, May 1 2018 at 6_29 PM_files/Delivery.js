var Panopto = Panopto || {};
Panopto.API = Panopto.API || {};
// EventType enum
// Must match strings used in Note_Create.aspx.cs and Results.aspx.cs
Panopto.API.EventType = (function (EventType) {
    EventType.Slide = "ppt";
    EventType.Transcript = "transcript";
    EventType.Note = "notes";
    EventType.Bookmark = "bookmarks";
    EventType.Comment = "comments";
    return EventType;
})(Panopto.API.EventType || {});
// Exposes methods for making asynchronous calls related to a delivery for use in the Viewer
Panopto.API.Delivery = (function () {
    var ajaxCall = function (uri, params, onSuccess, onFailure) {
        // Tell our aspx.cs files to send json data
        params.responseType = "json";
        // Build the ajax request
        $.ajax({
            url: "{0}://{1}{2}/Pages/Viewer/{3}".format(Panopto.uriScheme, Panopto.webServerFQDN, Panopto.appRoot, uri),
            type: "POST",
            data: params,
            dataType: "json",
            success: onSuccess,
            error: onFailure,
            // Always send credentials for cross-domain requests (doesn't hurt on same-domain)
            xhrFields: { withCredentials: true },
            // Always append the csrf header if we have a csrf token
            beforeSend: addCsrfHeader
        });
    };
    var addCsrfHeader = function (request) {
        // Try to get the csrf cookie
        var token = Panopto.Core.CookieHelpers.getCookie(Panopto.Core.Constants.CsrfTokenCookieName);
        if (token) {
            // Found a csrf token, so include it in a header
            request.setRequestHeader(Panopto.Core.Constants.CsrfTokenHeaderName, token);
        }
    };
    // Module API
    // Params are coupled with query params interpreted by the corresponding aspx.cs files
    return {
        getDelivery: function (deliveryId, inviteTokenId, invocationId, options, onSuccess, onFailure) {
            ajaxCall("DeliveryInfo.aspx", {
                deliveryId: deliveryId,
                tid: inviteTokenId,
                invocationId: invocationId || "",
                isLiveNotes: !!options.isLiveNotes,
                refreshAuthCookie: !!options.refreshAuthCookie,
                isActiveBroadcast: !!options.isActiveBroadcast,
                isEditing: !!options.isEditing,
                isKollectiveAgentInstalled: !!options.isKollectiveAgentInstalled,
                isEmbed: !!options.isEmbed
            }, function (data) {
                // sometimes data has an ErrorCode, so check for that here
                if (!data.ErrorCode) {
                    onSuccess(data);
                }
                else {
                    onFailure(data);
                }
            }, onFailure);
        },
        getCaptions: function (deliveryId, inviteTokenId, onSuccess, onFailure) {
            ajaxCall("DeliveryInfo.aspx", { deliveryId: deliveryId, tid: inviteTokenId, getCaptions: true }, function (data) {
                // sometimes data has an ErrorCode, so check for that here
                if (!data.ErrorCode) {
                    onSuccess(data);
                }
                else {
                    onFailure(data);
                }
            }, onFailure);
        },
        rateDelivery: function (deliveryId, rating, onSuccess, onFailure) {
            ajaxCall("RateDelivery.aspx", { deliveryID: deliveryId, rating: rating }, function (data) {
                // Check for ErrorCode on response object
                if (!data.ErrorCode) {
                    onSuccess(data);
                }
                else {
                    onFailure(data);
                }
            }, onFailure);
        },
        refreshAuthCookie: function () {
            // We don't care about the response to refreshing the auth cookie
            ajaxCall("RefreshAuthCookie.aspx", {}, function () { }, function () { });
        },
        createEvent: function (deliveryId, eventType, text, time, isRelative, channel, onSuccess, onFailure) {
            var params = {
                deliveryId: deliveryId,
                type: eventType,
                data: text,
                time: time
            };
            // Only add the channel if it's not blank
            if (channel) {
                params.channelName = channel;
            }
            // Server interprets presence of this param as true/false
            if (isRelative) {
                params.deliveryRelative = true;
            }
            ajaxCall("Notes/Note_Create.aspx", params, 
            // Success - sometimes error data is returned as a success object, check for that here
            function (data) {
                if (data.ReturnCode) {
                    onSuccess(data);
                }
                else {
                    onFailure(data);
                }
            }, onFailure);
        },
        editEvent: function (sessionId, eventType, eventId, text, onSuccess, onFailure) {
            ajaxCall("Notes/Note_Update.aspx", { sessionid: sessionId, type: eventType, eventid: eventId, data: text }, 
            // Success - no data, error message is null for successful updates
            function (data) {
                if (!data.ErrorMessage) {
                    onSuccess();
                }
                else {
                    onFailure(data);
                }
            }, onFailure);
        },
        deleteEvent: function (sessionId, eventType, eventId, onSuccess, onFailure) {
            ajaxCall("Notes/Note_Delete.aspx", { sessionid: sessionId, type: eventType, eventid: eventId }, function (data) {
                // ErrorCode will be 0 for success
                if (!data.ErrorCode) {
                    onSuccess();
                }
                else {
                    onFailure(data);
                }
            }, onFailure);
        },
        toggleEventPrivacy: function (deliveryId, isPublic, onSuccess, onFailure) {
            var params = { id: deliveryId };
            // Server interprets presence of this param as true/false
            if (isPublic) {
                params.public = true;
            }
            ajaxCall("Notes/TogglePublic.aspx", params, 
            // Success sometimes returns Public=false if there's an error, so we need to compare with the value we tried to set
            function (data) {
                if (data.Public === isPublic) {
                    onSuccess(data);
                }
                else {
                    onFailure(data);
                }
            }, onFailure);
        },
        search: function (deliveryId, eventType, query, user, channel, inviteToken, refreshAuthCookie, onSuccess, onFailure) {
            var params = {
                id: deliveryId,
                type: eventType,
                query: query,
                notesUser: user,
                channelName: channel,
                tid: inviteToken,
                refreshAuthCookie: refreshAuthCookie,
                deliveryRelative: true
            };
            ajaxCall("Search/Results.aspx", params, 
            // Success - sometimes error data is returned, so check for that case
            function (data) {
                if (!data.Error) {
                    onSuccess(data.Events);
                }
                else {
                    onFailure(data);
                }
            }, onFailure);
        }
    };
})();

//# sourceMappingURL=Delivery.js.map
