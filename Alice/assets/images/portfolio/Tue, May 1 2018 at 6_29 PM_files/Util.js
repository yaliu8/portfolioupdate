// DO NOT ADD NEW FUNCTIONALITY TO THIS FILE
// All "utility" functions should go in WebCore project
// This file is only kept around for legacy code, mostly in the list pages
// Copyright 2007-2010 Panopto, Inc.
// All rights reserved.  Reuse and redistribution strictly prohibited.
/// <reference path="./Data.js"/>
/// <reference path="./Application.js"/>
Type.registerNamespace("Panopto");
// Default delivery name, hidden in display.
var c_defaultDeliveryName = "default";
Panopto.Util = function () {
    /// <summary>
    ///     Static methods to provide utility functions across pages.
    /// </summary>
};
// URL for JSON data service.
Panopto.Util.c_dataServiceUrl =
    Panopto.appRoot + "/Services/Data.svc";
// Specific to IE8
Panopto.Util.addChangeHandler = function (selector, instance, handler, options) {
    // IE8 doesn't support change and propertychange has issues so using focusout as an approximation
    var changeString = $.browser.msie ? 'focusout' : 'change';
    $addHandler(selector, changeString, function (event) {
        var element = this;
        Panopto.Util._handleEvent(instance, handler, event, element, options);
    });
    // As an added shim for IE adding enter key handler
    if ($.browser.msie) {
        Panopto.Core.UI.Handlers.key($(selector), handler, [Panopto.Core.Key.Enter], { context: instance });
    }
};
// Internal function to call handlers from wrappers above.
Panopto.Util._handleEvent = function (instance, handler, event, element, options) {
    handler.call(instance, event, element);
    // Prevent default action (e.g. follow link, submit form on [Enter], etc.) unless specifically allowed.
    // Compare to false to allow default to be true (undefined != false).
    if (!options || (options.preventDefault != false)) {
        event.preventDefault();
    }
    // Stop event from propagating up to DOM parents if requested.
    if (options && options.stopPropagation) {
        event.stopPropagation();
    }
};
// Specific to Site.Master
// Loading indicator is in the ModalPopup.  Sometimes we are called from an iFrame inside
// that ModalPopup and sometimes from content directly in the ModalPopup.  This handles both
// those cases being careful not to look at a page that's on a different host.
Panopto.Util.$getLoadingIndicator = function () {
    var $loadingIndicator = $("#modalSpinner");
    // If we didn't find it and we're in an iFrame, it might be
    // in our parent.  But only check that if we're from the same host.
    if (!$loadingIndicator.length && window != parent) {
        var fakeParent = document.createElement('a');
        fakeParent.href = document.referrer;
        // If the parent is from the same host, look for the indicator there
        if (fakeParent.hostname === window.location.hostname) {
            try {
                $loadingIndicator = $("#modalSpinner", parent.document);
            }
            catch (e) {
                // If we aren't allowed to find this indicator, this will
                // throw and $loadingIndicator will continue to be an empty list.
                // Safe to ignore this SecurityError
            }
        }
    }
    // This indicator toggles by using a class instead of show hide and we want to remember that
    $loadingIndicator.usesSpinningClass = true;
    return $loadingIndicator;
};
// Specific to Site.Master
Panopto.Util.showLoadingIndicator = function ($indicator, show) {
    // We use a class instead of show/hide because we want the indicator
    // to have a space so that it doesn't cause the title to reflow when
    // it appears.
    if ($indicator.usesSpinningClass) {
        $indicator.toggleClass("spinning", show || (show == null));
        // If we didn't get the indicator with Panopto.Util.$getLoadingIndicator
        // Use standard show/hide
    }
    else {
        $indicator.toggle(show);
    }
};
// Timepicker takes this localization object
Panopto.Util.timepickerLocalSettings = {
    am: Panopto.GlobalResources.Timepicker_am,
    pm: Panopto.GlobalResources.Timepicker_pm,
    AM: Panopto.GlobalResources.Timepicker_am.toUpperCase(),
    PM: Panopto.GlobalResources.Timepicker_pm.toUpperCase(),
    decimal: '.',
    mins: Panopto.GlobalResources.Timepicker_min,
    hr: Panopto.GlobalResources.Timepicker_hr,
    hrs: Panopto.GlobalResources.Timepicker_hrs
};
// Ugly ms ajax way - this should eventually be replaced with jquery.ajax once we have a better API
// Wrap Sys.Net.WebServiceProxy to allow named parameters, use common defaults, and show loading indicators
//BUGBUG: JS Intellisense summary would be nice for required / optional params.
Panopto.Util.callWebMethod = function (params) {
    // Empty set will not show indicator if client passes null
    var $loadingIndicator = $();
    // Use passed in selector / element / etc. for loading indicator
    if (params.loadingIndicator) {
        $loadingIndicator = $(params.loadingIndicator);
    }
    else if ((params.loadingIndicator === undefined)) {
        $loadingIndicator = Panopto.Util.$getLoadingIndicator();
    }
    // These calls will be no-ops if the jquery call is empty
    Panopto.Util.showLoadingIndicator($loadingIndicator, true);
    var request = Sys.Net.WebServiceProxy.invoke(
    // Default to data service unless serviceURL is specified
    params.serviceURL || Panopto.Util.c_dataServiceUrl, params.methodName, 
    // useGet=false => POST
    false, params.params, 
    // onSuccess
    function (data) {
        if (params.onSuccess) {
            params.onSuccess(data);
        }
        Panopto.Util.showLoadingIndicator($loadingIndicator, false);
    }, 
    // onFailure
    function (e) {
        if (params.onFailure) {
            params.onFailure(e);
        }
        Panopto.Util.showLoadingIndicator($loadingIndicator, false);
    });
    return request;
};
// Specific to elements on Site.Master
Panopto.Util.showIndicatorForDataContextSave = function (dataContext) {
    var $loadingIndicator = Panopto.Util.$getLoadingIndicator();
    // These calls will be no-ops if the jquery call is empty
    Panopto.Util.showLoadingIndicator($loadingIndicator, true);
    dataContext.set_handleSaveChangesResultsMethod(function () {
        Panopto.Util.showLoadingIndicator($loadingIndicator, false);
    });
};
// Specific to list pages and modals
Panopto.Util.displayDeliveryName = function (deliveryItem) {
    /// <summary>
    ///     Format delivery name for display.
    ///     Hide "default", otherwise wrap in "()" and display.</summary>
    /// <param name="deliveryItem" type="Object">
    ///     The item containing delivery information.</param>
    /// <returns type="String" />
    return Panopto.Core.TextHelpers.cleanTextWithHighlighting(Panopto.Util.getDeliveryName(deliveryItem));
};
// Checks if the delivery item is a playlist
Panopto.Util.isDeliveryPlaylist = function (deliveryItem) {
    return deliveryItem.PlayableObjectType === Panopto.Core.PlayableObjectType.Playlist;
};
/**
 * Gets the tooltip text for the delivery
 *
 * @params {object} deliveryItem the delivery to fetch the tooltip for
 */
Panopto.Util.getThumbnailTooltip = function (deliveryItem) {
    return Panopto.Util.isDeliveryPlaylist(deliveryItem)
        ? Panopto.GlobalResources.Sessions_List_PlayThisPlaylist
        : Panopto.GlobalResources.Sessions_List_PlayThisSession;
};
Panopto.Util.displayDeliveryNameWithoutHighlighting = function (deliveryItem) {
    /// <summary>
    ///     Format delivery name for display.
    ///     Hide "default", otherwise wrap in "()" and display.</summary>
    /// <param name="deliveryItem" type="Object">
    ///     The item containing delivery information.</param>
    /// <returns type="String" />
    return Panopto.Core.TextHelpers.cleanTextWithoutHighlighting(Panopto.Util.getDeliveryName(deliveryItem));
};
// Helper function for Panopto.Util.displayDeliveryName
// and Panopto.Util.displayDeliveryNameWithoutHighlighting
Panopto.Util.getDeliveryName = function (deliveryItem) {
    var sessionName = deliveryItem.SessionName;
    var deliveryName = deliveryItem.DeliveryName;
    return (deliveryName && (deliveryName != c_defaultDeliveryName))
        ? String.format("{0} ({1})", sessionName, deliveryName)
        : sessionName;
};
// Specific to Modals
Panopto.Util.askBeforeClosing = function (closingSelectors, closingMessage) {
    var $askBeforeClosingInputs = $(closingSelectors);
    var warnAboutChanges = function () {
        var inputsChanged = _.some($askBeforeClosingInputs, function (input) {
            // Since this currently only applies to a create modal we can
            // assume that any length means that the user has changed something
            return $(input).val().trim().length;
        });
        Panopto.leavePageConfirmationMessage = inputsChanged ? closingMessage : null;
    };
    Panopto.Util.addChangeHandler(closingSelectors, this, warnAboutChanges);
};
// Specific to our weird way of formatting user names
Panopto.Util.displayUserName = function (userItem) {
    var displayName = userItem.UserKey;
    if (userItem.FullName) {
        displayName = String.format("{0} ({1})", userItem.FullName, userItem.UserKey);
    }
    return Panopto.Core.TextHelpers.cleanTextWithHighlighting(displayName);
};
// Used only in User list which will be refactored eventually
Panopto.Util.displayFullNameAndEmail = function (fullName, email) {
    var output = "";
    // Encode any html except for search highlighting tags
    fullName = Panopto.Core.TextHelpers.cleanTextWithHighlighting(fullName);
    email = Panopto.Core.TextHelpers.cleanTextWithHighlighting(email);
    if (fullName) {
        output = fullName;
        if (email) {
            output += String.format(" &lt;{0}&gt;", email);
        }
    }
    else {
        // Convert null to "" for IE
        output = email || "";
    }
    return output;
};
// Used only by ContractUsage because that page gets dates as json data
// Using eval is bad so this is staying here
Panopto.Util.dateFromJSON = function (jsonDate) {
    /// <summary>
    ///     Converts a JSON date string like "\/Date(19052342384-170297)\/" to a date.
    /// </summary>
    if (!jsonDate) {
        return null;
    }
    var dateString = jsonDate.toString(); // sometimes the JSON string is an object
    // create a string that is "new Date()" by removing the beginning and trailing "/" and adding new
    // then we can just evaluate the string as javascript
    var dateConstructorScript = "new " + dateString.substring(1, dateString.length - 1);
    // tslint:disable-next-line:no-eval
    return eval(dateConstructorScript);
};
// Used only by List pages, which should be refactored to use moment.js eventually
Panopto.Util.dateToUtc = function (date) {
    /// <summary>
    ///     Converts a date to a UTC date object.
    /// </summary>
    // getTime() returns milliseconds since 1970 UTC + local offset
    var localTime = date.getTime();
    // getTimeZoneOffset() returns offset in seconds, convert to milliseconds
    var localOffset = date.getTimezoneOffset() * 60 * 1000;
    return new Date(localTime + localOffset);
};
// Used only by List pages, which should be refactored to use moment.js eventually
Panopto.Util.displayDate = function (date, binding) {
    /// <summary>
    ///     Display a localized date given the following data binding parameters:
    ///
    ///     binding.format:
    ///         "time"     => "1:53 PM"
    ///         "short"    => "2/26/2016 1:53 PM"
    ///         "long"     => "Fri, 2/26/2016 1:53 PM"
    ///         "friendly" => "February 26, 2016"
    ///         "timeAgoFromPanoptoLocal"  => "8 days ago"
    ///         default    => "2/26/2016"
    ///
    ///     binding.local: (bool) Treat date as local rather than default of UTC
    ///
    ///     binding.toPanoptoTime: (bool) convert to Panopto local time (server setting)
    ///
    ///     Note that timeAgoFromPanoptoLocal assumes the time is adjusted to display the panopto local (server) time.
    /// </summary>
    var displayDate = Panopto.GlobalResources.None, momentDate;
    if (date) {
        // Treat date as UTC unless specified as local, or "toPanoptoTime" is specified
        if (!binding || (!binding.local && !binding.toPanoptoTime)) {
            date = Panopto.Util.dateToUtc(date);
        }
        // Convert our time to local time if we pass the toLocalTime flag
        if (binding && binding.toPanoptoTime) {
            date = Panopto.Core.TimeHelpers.toLocalPanoptoTime(date, Panopto.timeZone);
        }
        momentDate = moment(date).locale(Panopto.lang);
        /// e.g. "1:53 PM"
        if (binding && binding.format === "time") {
            displayDate = date.localeFormat("t");
        }
        else if (binding && binding.format === "short") {
            displayDate = date.localeFormat("d") + " " + date.localeFormat("t");
        }
        else if (binding && binding.format === "long") {
            displayDate = date.localeFormat("ddd") + ", " + date.localeFormat("d") + " " + date.localeFormat("t");
        }
        else if (binding && binding.format === "friendly") {
            displayDate = momentDate.format("LL");
        }
        else if (binding && binding.format === "timeAgoFromPanoptoLocal") {
            displayDate = momentDate.from(
            // Convert now to panopto server time so it compares correctly to the given panopto server time
            Panopto.Core.TimeHelpers.toLocalPanoptoTime(new Date(), Panopto.timeZone));
        }
        else {
            displayDate = date.localeFormat("d");
        }
    }
    return displayDate;
};
// Get a message relevant to the last state change of a session, e.g. "Scheduled for [date]"
Panopto.Util.getDateMessage = function (sessionRow) {
    switch (sessionRow.Status) {
        case Panopto.Data.SessionStatus.Created:
        case Panopto.Data.SessionStatus.Scheduled:
            return Panopto.GlobalResources.Sessions_List_ScheduledFor.format(Panopto.Util.displayDate(sessionRow.StartTime, { format: "friendly" }));
        case Panopto.Data.SessionStatus.Recording:
        case Panopto.Data.SessionStatus.Live:
            return Panopto.GlobalResources.Sessions_List_RecordingRightNow;
        default:
            // Display date in "time ago" format, e.g. "8 days ago"
            return Panopto.Util.displayDate(sessionRow.StartTime, { format: "timeAgoFromPanoptoLocal" });
    }
};
// Used only by List pages, which should be refactored to use moment.js eventually
Panopto.Util.displayTime = function (date, binding) {
    /// <summary>
    ///     Display the time portion of a date in a locale-specific way.
    /// </summary>
    var displayTime = Panopto.GlobalResources.N_a;
    if (date) {
        if (binding && binding.utc) {
            date = Panopto.Util.dateToUtc(date);
        }
        displayTime = date.localeFormat("t");
    }
    return displayTime;
};
// Formats a duration with binding options
// Used only by List pages
Panopto.Util.displayDuration = function (duration, binding) {
    /// <summary>
    ///     Format seconds into "1h 01m 00s" format.</summary>
    /// <param name="duration" type="Number">
    ///     The duration in seconds.</param>
    /// <returns type="String" />
    // Display duration of null or 0 as "0s" if specified by binding.
    if (binding && binding.showZero) {
        duration = duration || 0;
        return Panopto.Core.TimeHelpers.formatDuration(duration, Panopto.GlobalResources.TimeSeparator);
    }
    else if (typeof (duration) !== "number") {
        return "";
    }
    return Panopto.Core.TimeHelpers.formatDuration(duration, Panopto.GlobalResources.TimeSeparator);
};
// Display a message like "by Joe Shmoe" based on the first listed presenter, or empty string if none
Panopto.Util.displayPresenterMessage = function (session) {
    var message = "", presenterName = "";
    if (session.PresenterFirstNames
        && session.PresenterFirstNames.length
        && session.PresenterLastNames
        && session.PresenterLastNames.length) {
        presenterName = "{0} {1}".format(session.PresenterFirstNames[0], session.PresenterLastNames[0]);
        // HTML-escape user-entered string
        presenterName = _.escape(presenterName);
        message = Panopto.GlobalResources.ThumbnailItemTemplate_ByPresenter.format(presenterName);
    }
    return message;
};
// Used only in TranscriptionRequestList
// Takes a number and returns a string with the number truncated to two decimal
// places and a '$'.
Panopto.Util.displayDollars = function (dollars) {
    var str = null;
    if (dollars || (dollars == 0)) {
        str = String.format("${0}", dollars.toFixed(2));
    }
    return str;
};
// Used on Admin pages
Panopto.Util.displayGB = function (gigabytes) {
    return (gigabytes).localeFormat("N02") + " GB";
};
// Used only in Admin/Default
// Affiliation name is optional, for producing site-relative links from hosted master site.
// Relative URL should be - app-relative, not site relative (don't include application path)
Panopto.Util.getAbsoluteUrl = function (relativeUrl, affiliationName) {
    var webServerFQDN = affiliationName
        ? affiliationName + "." + Panopto.hostedSuffix
        : Panopto.webServerFQDN;
    return Panopto.uriScheme + '://' + webServerFQDN + Panopto.appRoot + relativeUrl;
};
// Specific to thumbnail data model for list pages...
Panopto.Util.getThumbnailUrl = function (item) {
    return (item.Context && (item.Context.length > 0) && item.Context[0].ThumbUrl)
        ? item.Context[0].ThumbUrl
        : item.ThumbUrl;
};
// Helper function for toggling inheritance warning in the SessionGroupChooser control
Panopto.Util.inheritingDropdownChange = function () {
    var $courseDropDown = $('.courseDropDown');
    var inheriting = $courseDropDown.attr('data-isinheriting') === "true";
    if (inheriting) {
        var isTopLevel = $courseDropDown.find(':selected').val() === '0';
        var warningText = isTopLevel
            ? Panopto.GlobalResources.Controls_SessionGroupChooser_TopLevelWarning
            : Panopto.GlobalResources.Controls_SessionGroupChooser_NewFolderWarning;
        $('.inheritance-warning').text(warningText);
        $('.inheritance-warning').show();
    }
};
// Specific to delivery data modal for list pages...
Panopto.Util.getViewerLink = function (item, time) {
    return item.ViewerUrl + (time ? "&start=" + time : "");
};
// Specific to modals
// Mark the modal for host UI update on close
// Takes an optional object as an argument that can be passed to updateData
Panopto.Util.flagModal = function (updateArgs) {
    var modalInstance = parent.Panopto.ModalPopup.defaultInstance;
    modalInstance.flagChanges(true);
    modalInstance.updateArgs(updateArgs);
};
// Specific to modals
// Close modal
Panopto.Util.closeModal = function (hasChanges) {
    // Get modal instance from page hosting modal iframe.
    var modalInstance = parent.Panopto.ModalPopup.defaultInstance;
    // Flag new changed state without overwriting existing one.
    modalInstance.flagChanges(modalInstance.flagChanges() || hasChanges);
    // Close modal, updating host UI as necessary.
    modalInstance.close();
};
// Specific to modals
Panopto.Util.updateModalHeader = function (modalTitle, isFolderName) {
    if (parent) {
        // Needs special handling in the case of the folder name
        parent.Panopto.ModalPopup.defaultInstance.updateArgs({ updateFolderInfo: isFolderName });
        parent.Panopto.Application.defaultInstance.updateState({
            modalHeader: modalTitle.replaceAll("&#39;", "'")
        });
    }
};
// Custom handling for failed image load and aspect ratios wider than 16:9.
// Shared between Sessions page and Home page.
Panopto.Util.handleThumbnailLoad = function ($container) {
    // Handle thumbnail load / failure for an individual thumbnail
    function loadThumbnail($thumbnail, success) {
        var $thumbnailContainer = $thumbnail.closest(".thumbnail-container");
        var $thumbnails = $thumbnailContainer.find(".thumbnail-img");
        $thumbnails.toggle(success);
        // Render a custom "no thumbnail" image when image load fails
        $thumbnails.next(".thumbnail-failed-load").toggle(!success);
        $thumbnails.toggleClass("failed-load", !success);
        // We fit height and scale width in CSS.
        // This helper detects thumbnails wider than their 16:9 container and fits width instead.
        if (success) {
            _.defer(function () {
                Panopto.Util.fitThumbnailWidth($thumbnail, $thumbnailContainer);
            });
        }
    }
    // Listen for load events on all currently-displayed thumbnails within the specified container.
    // Which thumbnail is displayed (child of <a> or <span>) depends on whether the session is viewable.
    $container.find("a:visible .thumbnail-img, span:visible .thumbnail-img")
        .on("load", function () {
        loadThumbnail($(this), true);
    })
        .each(function () {
        this.complete && loadThumbnail($(this), true);
    })
        .on("error", function () {
        loadThumbnail($(this), false);
    });
};
// Scale thumbnail width if necessary to fit container and add letterboxing to fill vertical space.
// Thumbnail styles on the Sessions and Home pages fit height and allow width to scale with thumbnail aspect ratio.
// Aspect ratios wider than our 16:9 container will overflow, so this helper function exists to detect that case and
// fit width and scale height instead. Once we drop IE8 we can use background-size: contain for a pure CSS solution.
Panopto.Util.fitThumbnailWidth = function ($thumbnail, $thumbnailContainer) {
    if ($thumbnail.width() > $thumbnailContainer.width()) {
        // Fit width and scale height
        $thumbnail.width("100%");
        $thumbnail.height("auto");
        // Center the thumbnail vertically
        Panopto.Util.verticallyCenterThumbnail($thumbnail, $thumbnailContainer);
    }
};
// Use padding to vertically center a thumbnail in its container (this includes the letterboxing in focus outlines)
Panopto.Util.verticallyCenterThumbnail = function ($thumbnail, $thumbnailContainer) {
    if ($thumbnail.height() < $thumbnailContainer.height()) {
        verticalPadding = ($thumbnailContainer.height() - $thumbnail.height()) / 2;
        $thumbnail.css("padding", "{0}px 0".format(verticalPadding));
    }
};
// Fit height of scrolling DIVs within the page on browser resize
Panopto.Util.handleResize = function (isList, hidePagination) {
    // calculate the browser's window height and set column div height accordingly
    var windowWidth = $(window).width();
    var windowHeight = $(window).height();
    var padding;
    var paginationHeight;
    // Left column (navbar) is window height minus site header.
    var leftcolheight = windowHeight - $("#header").outerHeight();
    // Set height of left column.
    $(".leftcolumn").css("height", leftcolheight);
    // Resize accordion sections in nav bar
    Panopto.NavBar.defaultInstance.reflow();
    // Height of content region below right-hand side header.
    var contentHeight = leftcolheight - $(".content-header").outerHeight();
    if (isList) {
        paginationHeight = hidePagination ? 0 : $(".pagination").outerHeight();
        // For list pages, reserve space for the sort header and paging controls.
        contentHeight -= $("#sortHeaderDataView").outerHeight() + paginationHeight;
        // Set height of list content region.
        $(".content-table").css("height", contentHeight);
    }
    else {
        // Set height of page content region.
        padding = parseInt($(".content-page").css('padding-top'), 10) + parseInt($(".content-page").css('padding-bottom'), 10);
        $(".content-page").css("height", contentHeight - padding);
    }
};
// Specific to list page data model
Panopto.Util.isViewable = function (status) {
    return ((status == Panopto.Data.SessionStatus.Complete)
        || (status == Panopto.Data.SessionStatus.Live));
};
// Only used in list pages
// Compare two arrays, order matters.  Doesn't deep compare non-scalar items.
Array.equals = function (array1, array2) {
    // Refs are equal
    if (array1 === array2) {
        return true;
    }
    // If either is null, and ref compare doesn't match, then they aren't both null.
    if ((array1 == null) || (array2 == null)) {
        return false;
    }
    else if (array1.length != array2.length) {
        return false;
    }
    // Compare arrays item-by-item.
    var match = true;
    $.each(array1, function (index, value) {
        if (array1[index] != array2[index]) {
            match = false;
            return false;
        }
    });
    return match;
};
// IE <= 8 doesn't support indexOf so this implements it
// http://stackoverflow.com/questions/2790001/fixing-javascript-array-functions-in-internet-explorer-indexof-foreach-etc
// This means no more for.. in loops on arrays:
// http://stackoverflow.com/questions/2265167/why-is-forvar-item-in-list-with-arrays-considered-bad-practice-in-javascript/2265195#2265195
if (!(Array.prototype.indexOf)) {
    Array.prototype.indexOf = function (find, i /*opt*/) {
        if (i === undefined) {
            i = 0;
        }
        if (i < 0) {
            i += this.length;
        }
        if (i < 0) {
            i = 0;
        }
        for (var length = this.length; i < length; i++) {
            if (i in this && this[i] === find) {
                return i;
            }
        }
        return -1;
    };
}
//Register with MicrosoftAjax Type model after class is defined.
Panopto.Util.registerClass('Panopto.Util');

//# sourceMappingURL=Util.js.map
