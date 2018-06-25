// Namespace dependencies
var Panopto = Panopto || {};
Panopto.Branding = Panopto.Branding || {};
// Turns a container into a Panopto or custom logo
Panopto.Branding.createLogo = function ($container, logoParams, linksEnabled) {
    var params = {
        // SVG is the same asset for any size so it isn't a param
        svgUrl: Panopto.branding.svgLogo,
        pngUrl: logoParams.png,
        width: logoParams.svgWidth,
        height: logoParams.svgHeight,
        mainLogoToolTip: Panopto.GlobalResources.Everything,
        customerLogoLink: Panopto.branding.siteLogoLink,
        cobrandString: Panopto.GlobalResources.PanoptoLogo_PoweredBy,
        listPageLink: "{0}/Pages/Sessions/List.aspx".format(Panopto.appRoot),
        linksEnabled: linksEnabled
    };
    var customerTemplate = _.template($("#customerLogoTemplate").html(), params);
    var panoptoTemplate = _.template($("#panoptoLogoTemplate").html(), params);
    // html() is safe cause we are either reading in a template or setting content
    // from a template where the values being used in the template are resource
    // string or urls that are set internally (no UI for setting them directly).
    $container.html(
    // Customer logos will have "_branding" in the URL.
    // No URL means we are displaying the embed logo region without any logo, which should still include the cobrand.
    (!params.pngUrl || params.pngUrl.indexOf("_branding") !== -1)
        ? customerTemplate
        : panoptoTemplate);
};
Panopto.Branding.renderBrandingColors = function (color, isDefault) {
    var colorObject = Panopto.Core.UI.Color.parse(color);
    var accentColor = colorObject.toHex();
    var safetyAccentColor = colorObject.getSafety().toHex();
    var accentHoverColor = colorObject.multiply(0.9).toHex();
    // Colors for Gradient Button
    var topGradient = calculateTopGradient(colorObject).toHex();
    var bottomGradient = colorObject.multiply(0.8).toHex();
    var topBorder = colorObject.multiply(0.9).toHex();
    var sideBorder = colorObject.multiply(0.75).toHex();
    var bottomBorder = colorObject.multiply(0.6).toHex();
    // Colors for Gradient Button Hover
    var topGradientHover = colorObject.multiply(0.85).toHex();
    var bottomGradientHover = colorObject.multiply(0.7).toHex();
    var topBorderHover = colorObject.multiply(0.7).toHex();
    var sideBorderHover = colorObject.multiply(0.75).toHex();
    var bottomBorderHover = colorObject.multiply(0.4).toHex();
    // Colors for Gradient Button Press
    var topGradientPress = colorObject.multiply(0.6).toHex();
    var bottomGradientPress = colorObject.multiply(0.6).toHex();
    // The borders for Press state are the same as hover
    var gradientButton;
    var gradientButtonHover;
    var gradientButtonPress;
    // List of class selectors needing a single color
    // Special Note: commas between selectors are not supported in IE and this version of jQuery.rule
    // https://github.com/flesler/jquery.rule/blob/master/changes.txt
    var accentPlaces = [
        { selector: '.accent-color', styleChanges: ['color: {0}', 'border-color: {0}'] },
        { selector: '.selected.accent-left-border', styleChanges: ['border-left-color: {0}'] },
        // IE8 handles !important unreliably here
        { selector: '.content-table table .selected .chkbox.accent-button', styleChanges: ['background-color: {0}'] },
        { selector: '.embedded-plugin#batchUpload #sessionList .session.selected .session-check.accent-button', styleChanges: ['background-color: {0}'] },
        { selector: '.accent-background', styleChanges: ['background-color: {0}'] },
        { selector: '.selected.accented-tab', styleChanges: ['border-left-color: {0}'] }
    ];
    var safetyAccentPlaces = [
        // the 'a' here is to set the 1 px line of safety accent on the selected tab in the Web UI
        { selector: '.selected.accent-left-border a', styleChanges: ['border-left-color: {0}'] },
        { selector: '.selected .accent-button', styleChanges: ['border-color: {0}'] },
        { selector: '.selected.accented-tab', styleChanges: ['background-color: {0}'] },
        { selector: '.safety-accent-border', styleChanges: ['border-color: {0}'] },
        { selector: '.safety-background', styleChanges: ['background-color: {0}'] },
        { selector: '.safety-text', styleChanges: ['color: {0}'] },
        { selector: '.safety-accent-highlighted.highlighted .event-text', styleChanges: ['color: {0}'] },
        { selector: '.safety-accent-highlighted.editing .event-text', styleChanges: ['color: {0}'] },
        { selector: '.safety-accent-highlighted.highlighted .event-time', styleChanges: ['color: {0}'] },
        { selector: '.safety-accent-highlighted.editing .event-time', styleChanges: ['color: {0}'] },
        { selector: '.event-tab-pane .match', styleChanges: ['color: {0}'] },
        { selector: '.safety-border', styleChanges: ['border-color: {0}'] },
        { selector: '.colored-scroll-button', styleChanges: ['color: {0}'] },
        { selector: '.selected.branded-border', styleChanges: ['border-color: {0}'] }
    ];
    // For certain controls if we have the default Panopto green, we don't want to use the safety accent outline
    if (isDefault) {
        accentPlaces.push({ selector: '.safety-accent-border-ifcustom', styleChanges: ['border-color: {0}'] });
    }
    else {
        safetyAccentPlaces.push({ selector: '.safety-accent-border-ifcustom', styleChanges: ['border-color: {0}'] });
    }
    var accentHoverPlaces = [
        // IE8 handles !important unreliably here
        { selector: '.content-table table .selected .chkbox.accent-button:hover', styleChanges: ['background-color: {0}'] },
        { selector: '.embedded-plugin#batchUpload #sessionList .session.selected .session-check.accent-button:hover', styleChanges: ['background-color: {0}'] },
        { selector: '.embedded-plugin#batchUpload .create-upload:hover .create-upload-icon.image-accent-background', styleChanges: ['background-color: {0}'] }
    ];
    var createGradientButton = function (selector, top, bottom, upperBorder, borderSides, lowerBorder) {
        return {
            selector: selector,
            styleChanges: [
                "background-image: -webkit-linear-gradient(90deg, {0} 0%, {1} 100%)".format(bottom, top),
                "background-image: -moz-linear-gradient(90deg, {0} 0%, {1} 100%)".format(bottom, top),
                "background-image: -ms-linear-gradient(90deg, {0} 0%, {1} 100%)".format(bottom, top),
                "-ms-filter: \"progid:DXImageTransform.Microsoft.gradient(startColorStr='{0}',EndColorStr='{1}')\"".format(top, bottom),
                "border-top-color: {0}".format(upperBorder),
                "border-right-color: {0}".format(borderSides),
                "border-bottom-color: {0}".format(lowerBorder),
                "border-left-color: {0}".format(borderSides)
            ]
        };
    };
    var hoverSelector = '.branded-gradient-button:hover';
    var pressSelector = '.branded-gradient-button:active';
    // Predictably IE8 throws an error if :not is applied
    if (!Panopto.Core.Browser.isIE8) {
        hoverSelector += ':not(.disabled)';
        pressSelector += ':not(.disabled)';
    }
    gradientButton = createGradientButton('.branded-gradient-button', topGradient, bottomGradient, topBorder, sideBorder, bottomBorder);
    gradientButtonHover = createGradientButton(hoverSelector, topGradientHover, bottomGradientHover, topBorderHover, sideBorderHover, bottomBorderHover);
    gradientButtonPress = createGradientButton(pressSelector, topGradientPress, bottomGradientPress, topBorderHover, sideBorderHover, bottomBorderHover);
    function calculateTopGradient(colorObject) {
        colorObject.r = colorObject.r + (255 - colorObject.r) * 0.2;
        colorObject.g = colorObject.g + (255 - colorObject.g) * 0.2;
        colorObject.b = colorObject.b + (255 - colorObject.b) * 0.2;
        colorObject.sanitize();
        return colorObject;
    }
    function changeColorsObject(changeObj) {
        _.each(changeObj.styleChanges, function (styleChange) {
            $.rule(changeObj.selector + '{' + styleChange + ' !important}').appendTo('link');
        });
    }
    // This is for a list of selectors that will all use the same color
    function changeColorsList(list, newColor) {
        // Iterates through the styleChanges and fills in colors
        function fillStyleStrings(tag, newColor) {
            tag.styleChanges = _.map(tag.styleChanges, function (styleChange) {
                return styleChange.format(newColor);
            });
            return tag;
        }
        _.each(list, function (tag) {
            tag = fillStyleStrings(tag, newColor);
            changeColorsObject(tag);
        });
    }
    changeColorsList(accentPlaces, accentColor);
    changeColorsList(safetyAccentPlaces, safetyAccentColor);
    changeColorsList(accentHoverPlaces, accentHoverColor);
    changeColorsObject(gradientButton);
    changeColorsObject(gradientButtonHover);
    changeColorsObject(gradientButtonPress);
};
Panopto.Branding.brandElements = function (color) {
    var colorObject = Panopto.Core.UI.Color.parse(color);
    var accentColor = colorObject.toHex();
    var safetyAccentColor = colorObject.getSafety().toHex();
    Panopto.Branding.brandImageBackgrounds('.image-accent-background', '.image-accent-background', accentColor);
    Panopto.Branding.animateLoadingIndicator(safetyAccentColor);
};
Panopto.Branding.animateLoadingIndicator = function (safetyAccentColor) {
    var brandingSupported = Panopto.Core.Browser.isCssSupported('animation');
    Panopto.Core.UI.Components.spinner($("#loadingMessage"), brandingSupported);
    Panopto.Core.UI.Components.spinner($("#primaryBuffering"), brandingSupported);
    Panopto.Core.UI.Components.spinner($("#secondaryBuffering"), brandingSupported);
    Panopto.Core.UI.Components.spinner($(".loadingfolders"), brandingSupported);
    Panopto.Core.UI.Components.spinner($(".logging-out-spinner"), brandingSupported);
    Panopto.Core.UI.Components.spinner($("#modalSpinner"), brandingSupported);
    Panopto.Core.UI.Components.spinner($(".event-tab-spinner"), brandingSupported);
    // Since this could be loaded after renderbranding is called we need to get the
    // background after we load it. It also follows a different format
    // since the background color and image are on different divs
    Panopto.Branding.brandImageBackgrounds('.branded-animation', '.spinner-background', safetyAccentColor);
};
Panopto.Branding.brandImageBackground = function ($selector, logoUrl) {
    if (logoUrl.indexOf("_branding") !== -1) {
        $selector.css("background-image", "url(" + logoUrl + ")");
    }
};
// Add the branding image as the background.  Returns whether there's a custom branding image.
Panopto.Branding.brandImageBackgroundRule = function (selectorString, logoUrl) {
    var result = (logoUrl.indexOf("_branding") !== -1);
    if (result) {
        $.rule(selectorString + "{background-image: url(" + logoUrl + ") !important}").appendTo('link');
    }
    return result;
};
// Without this function the image backgrounds show up before the image is loaded
// This adds the images to the cache as well and also waits until they are loaded
// to apply the background
Panopto.Branding.brandImageBackgrounds = function (selectorSrcs, selectorBackgrounds, color) {
    var imageList = _.filter(_.map($(selectorSrcs), function (image) {
        // http://stackoverflow.com/questions/837694/getting-a-divs-background-image-with-jquery-is-there-an-inbuilt-method-to-stri
        var backgroundImage = $(image).css('background-image');
        if (!!backgroundImage) {
            backgroundImage = backgroundImage.replace(/^url|[\(\")]/g, '');
        }
        return backgroundImage;
    }), function filterPredicate(src) { return src !== 'none'; });
    var stillLoadingCount = imageList.length;
    var finishedLoading = function (stillLoadingCount) {
        if (!stillLoadingCount) {
            $.rule(selectorBackgrounds + '{background-color:' + color + ' !important}').appendTo('link');
        }
    };
    // If no srcs for images exist when the page loads set the rule anyway
    finishedLoading(stillLoadingCount);
    // If we have srcs preload each image in imageList and don't show the background until the image is loaded
    _.each(imageList, function (imageSrc) {
        var img = new Image();
        var finishedSrc = function () {
            stillLoadingCount--;
            // If every image is loaded add the background color
            finishedLoading(stillLoadingCount);
        };
        img.onload = finishedSrc;
        img.onerror = finishedSrc; // If an image fails to load we still want to brand the rest
        img.src = imageSrc; // Src has to come after onload in case the image is already in cache and loads before the onload is set
    });
};

//# sourceMappingURL=RenderBranding.js.map
