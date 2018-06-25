// Copyright 2007-2010 Panopto, Inc.
// All rights reserved.  Reuse and redistribution strictly prohibited.
Type.registerNamespace("Panopto.Data");
// Helper to set up our getName and getDisplayName "extension methods" on an enum and register it.
Panopto.Data.registerPanoptoEnum = function (name) {
    // Add "getName" method: get the enum name for the specified value.
    Panopto.Data[name].getName = function (value) {
        return Panopto.Data[name]._enumNames[value];
    };
    // Lookup table from enum value => name.
    // Index in array corresponds to enum value.
    Panopto.Data[name]._enumNames = [];
    for (var enumName in Panopto.Data[name].prototype) {
        if (Panopto.Data[name].prototype.hasOwnProperty(enumName)) {
            // Array index of enumName corresponds to its numerical value.
            Panopto.Data[name]._enumNames[Panopto.Data[name].prototype[enumName]] = enumName;
        }
    }
    // Add "getDisplayName" method: display a localized name for the specified value.
    Panopto.Data[name].getDisplayName = function (value) {
        var enumName = Panopto.Data[name].getName(value);
        // Return localized string, defaulting to non-localized version if not found.
        var displayName = Panopto.GlobalResources[name + "_" + enumName] || enumName;
        //TODO: Pull this special case out into a wrapper around AclRoleType.getDisplayName.
        if (!displayName && (name == "AclRoleType")) {
            displayName = Panopto.GlobalResources.AclRoleType_Viewer;
        }
        return displayName;
    };
    // Register with MicrosoftAjax Type model after enum is defined.
    Panopto.Data[name].registerEnum("Panopto.Data." + name);
};
Panopto.Data.AclRoleType = function () {
    /// <summary>
    ///     enum Panopto.Data.AclRoleType
    ///
    ///     NOTE: This must be kept in sync with Panopto.Data.AclRoleType,
    ///     defined in SharedLib/Constants.cs.
    ///     NOTE: AclRoleType.Service is omitted so it does not appear in the UI.
    /// </summary>
    ///
    /// <field name="Viewer" type="Number" />
    /// <field name="Creator" type="Number" />
    /// <field name="Admin" type="Number" />
    /// <field name="Videographer" type="Number" />
    /// <field name="Publisher" type="Number" />
    /// <field name="DirectViewerOnly" type="Number" />
};
Panopto.Data.AclRoleType.prototype =
    {
        Viewer: 1,
        Creator: 2,
        Admin: 3,
        Videographer: 4,
        // Don't include Service since it should not appear in the web ui
        // Service:     5,
        Publisher: 6,
        DirectViewerOnly: 7
    };
Panopto.Data.registerPanoptoEnum("AclRoleType");
/// Roles as applied to access lists
// Roles a user/group can have on a folder
Panopto.Data.folderAccessRoles = [
    Panopto.Data.AclRoleType.Viewer,
    Panopto.Data.AclRoleType.Creator,
    Panopto.Data.AclRoleType.Publisher
];
// Roles a user/group can have on a session
Panopto.Data.sessionAccessRoles = [
    Panopto.Data.AclRoleType.Viewer
];
// Roles a user/group can have on a rr
Panopto.Data.remoteRecorderAccessRoles = [
    Panopto.Data.AclRoleType.Creator,
    Panopto.Data.AclRoleType.Admin
];
Panopto.Data.FolderColumns = function () {
    /// <summary>
    ///     enum Panopto.Data.FolderColumns
    ///
    ///     NOTE: This must be kept in sync with Panopto.Data.DB.WebUI.FolderColumns, defined in
    ///     DataLib/LinqWrappers/WebUI/FolderRow.cs
    /// </summary>
    ///
    /// <field name="Name" />
    /// <field name="Presenters" />
    /// <field name="Sessions" />
    /// <field name="Relevance" />
    /// <field name="Site" />
};
Panopto.Data.FolderColumns.prototype =
    {
        Name: 0,
        Presenters: 1,
        Sessions: 2,
        Relevance: 3,
        Site: 4
    };
Panopto.Data.registerPanoptoEnum("FolderColumns");
Panopto.Data.UsageColumns = function () {
    /// <summary>
    ///     enum Panopto.Data.UsageColumns
    ///
    ///     NOTE: This must be kept in sync with Panopto.Data.DB.WebUI.UsageColumns, defined in
    ///     DataLib/LinqWrappers/WebUI/UsageRow.cs
    /// </summary>
    ///
    /// <field name="Name" />
    /// <field name="Sessions" />
    /// <field name="HoursRecorded" />
    /// <field name="Views" />
    /// <field name="HoursViewed" />
    /// <field name="Storage" />
    /// <field name="Site" />
};
Panopto.Data.UsageColumns.prototype =
    {
        Name: 0,
        Sessions: 1,
        HoursRecorded: 2,
        Views: 3,
        HoursViewed: 4,
        Storage: 5,
        Site: 6
    };
Panopto.Data.registerPanoptoEnum("UsageColumns");
Panopto.Data.RemoteRecorderColumns = function () {
    /// <summary>
    ///     enum Panopto.Data.RemoteRecorderColumns
    ///
    ///     NOTE: This must be kept in sync with Panopto.Data.DB.WebUI.RemoteRecorderColumns, defined in
    ///     DataLib/LinqWrappers/WebUI/RemoteRecorderRow.cs
    /// </summary>
    ///
    /// <field name="Name" />
    /// <field name="Status" />
    /// <field name="Session" />
    /// <field name="Date" />
    /// <field name="Site" />
};
Panopto.Data.RemoteRecorderColumns.prototype =
    {
        Name: 0,
        Status: 1,
        Session: 2,
        Date: 3,
        Version: 4,
        Site: 5
    };
Panopto.Data.registerPanoptoEnum("RemoteRecorderColumns");
Panopto.Data.SessionColumns = function () {
    /// <summary>
    ///     enum Panopto.Data.SessionColumns
    ///
    ///     NOTE: This must be kept in sync with Panopto.Data.DB.WebUI.SessionColumns, defined in
    ///     DataLib/LinqWrappers/WebUI/SessionsRow.cs and SessionColumns_* resources.
    /// </summary>
    ///
    /// <field name="SessionName" />
    /// <field name="Date" />
    /// <field name="Duration" />
    /// <field name="Relevance" />
    /// <field name="Site" />
    /// <field name="Status" />
    /// <field name="RemoteRecorder" />
    /// <field name="Rating" />
    /// <field name="FolderName" />
    /// <field name="Ordered" />
};
Panopto.Data.SessionColumns.prototype =
    {
        SessionName: 0,
        Date: 1,
        Duration: 2,
        Relevance: 3,
        Site: 4,
        Status: 5,
        RemoteRecorder: 6,
        Rating: 7,
        FolderName: 8,
        MostRecentViewing: 9,
        Order: 10,
        DeletedDate: 11
    };
Panopto.Data.registerPanoptoEnum("SessionColumns");
Panopto.Data.RemoteRecorderState = function () {
    /// <summary>
    ///     enum Panopto.Data.RemoteRecorderState
    ///
    ///     NOTE: This must be kept in sync with Panopto.Data.DB.RemoteRecorderState,
    ///     and RemoteRecorderState_* resources.
    /// </summary>
    ///
    /// <field name="Error" />
    /// <field name="Disconnected" />
    /// <field name="Previewing" />
    /// <field name="RecorderRunning" />
    /// <field name="Recording" />
    /// <field name="Paused" />
    /// <field name="Stopped" />
};
Panopto.Data.RemoteRecorderState.prototype =
    {
        Stopped: 0,
        Previewing: 1,
        Recording: 2,
        Paused: 3,
        Faulted: 4,
        Disconnected: 5,
        RecorderRunning: 6
    };
Panopto.Data.registerPanoptoEnum("RemoteRecorderState");
Panopto.Data.DeviceThumbnailStatus = function () {
    /// <summary>
    ///     enum Panopto.Data.DeviceThumbnailStatus
    ///
    ///     NOTE: This must be kept in sync with Panopto.Data.DB.WebUI.DeviceThumbnailStatus
    /// </summary>
    ///
    /// <field name="Blank" />
    /// <field name="NoPrimary" />
    /// <field name="Current" />
    /// <field name="Missing" />
    /// <field name="Disconnected" />
    /// <field name="PermissionDenied" />
};
Panopto.Data.DeviceThumbnailStatus.prototype =
    {
        Blank: 0,
        NoPrimary: 1,
        Current: 2,
        Missing: 3,
        Disconnected: 4,
        PermissionDenied: 5
    };
Panopto.Data.registerPanoptoEnum("DeviceThumbnailStatus");
Panopto.Data.SessionStatus = function () {
    /// <summary>
    ///     enum Panopto.Data.SessionStatus
    ///
    ///     NOTE: This must be kept in sync with Panopto.Data.Public.Models.SessionStatus, defined in
    ///     /Panopto/Data/Panopto.Data.Core/Models/SessionStatus.cs.
    /// </summary>
    ///
    /// <field name="Created" type="Number" />
    /// <field name="Scheduled" type="Number" />
    /// <field name="Recording" type="Number" />
    /// <field name="Processing" type="Number" />
    /// <field name="Complete" type="Number" />
    /// <field name="Live" type="Number" />
};
Panopto.Data.SessionStatus.prototype =
    {
        Created: 0,
        Scheduled: 1,
        Recording: 2,
        Processing: 3,
        Complete: 4,
        Live: 5
    };
Panopto.Data.SessionStatus.fromSessionState = function (sessionState) {
    /// <summary>
    ///     Convert a PublicAPI SessionState enum value (Panopto.Core.ServiceInterface.Objects.SessionState) to a
    ///     SessionStatus.
    ///     The PublicAPI enum uses "Broadcasting" vs. "Live", and places it before "Processing" in the order.
    /// </summary>
    /// <param name="sessionState" type="Panopto.Core.ServiceInterface.Objects.SessionState">
    ///     A SessionState enum value from the Public API.
    /// </param>
    /// <returns type="Panopto.Data.SessionStatus" />
    // Map SessionState enum names to their SessionStatus counterparts
    var sessionStatusByStateName = {
        Created: Panopto.Data.SessionStatus.Created,
        Scheduled: Panopto.Data.SessionStatus.Scheduled,
        Recording: Panopto.Data.SessionStatus.Recording,
        Broadcasting: Panopto.Data.SessionStatus.Live,
        Processing: Panopto.Data.SessionStatus.Processing,
        Complete: Panopto.Data.SessionStatus.Complete
    };
    // Get the SessionState enum name for the input value
    var sessionStateName = _.invert(Panopto.Core.ServiceInterface.Objects.SessionState)[sessionState];
    // Return the corresponding SessionStatus enum value
    return sessionStatusByStateName[sessionStateName];
};
Panopto.Data.SessionStatus.getIcon = function (status) {
    /// <summary>
    ///     Returns an object with src, cssClass and title for the given status.
    /// <param name="status" type="Panopto.Data.SessionStatus">
    ///     The status enum value to return an icon for.</param>
    /// <returns type="object" />
    if (!Panopto.Data.SessionStatus._statusIcons) {
        var iconRoot = Panopto.cacheRoot + "/Styles/Less/Application/Images/ClientList/";
        Panopto.Data.SessionStatus._statusIcons = new Array();
        Panopto.Data.SessionStatus._statusIcons[Panopto.Data.SessionStatus.Complete] =
            { src: iconRoot + "icon_play_session.png", title: Panopto.GlobalResources.SessionStatus_Complete, cssClass: "complete", name: "complete" };
        Panopto.Data.SessionStatus._statusIcons[Panopto.Data.SessionStatus.Created] =
            { src: iconRoot + "icon_created.png", title: Panopto.GlobalResources.SessionStatus_Created, cssClass: "created", name: "created" };
        Panopto.Data.SessionStatus._statusIcons[Panopto.Data.SessionStatus.Processing] =
            { src: iconRoot + "icon_processing.png", title: Panopto.GlobalResources.SessionStatus_Processing, cssClass: "processing", name: "processing" };
        Panopto.Data.SessionStatus._statusIcons[Panopto.Data.SessionStatus.Recording] =
            { src: iconRoot + "icon_recording.png", title: Panopto.GlobalResources.SessionStatus_Recording, cssClass: "recording", name: "recording" };
        Panopto.Data.SessionStatus._statusIcons[Panopto.Data.SessionStatus.Scheduled] =
            { src: iconRoot + "icon_scheduled.png", title: Panopto.GlobalResources.SessionStatus_Scheduled, cssClass: "scheduled", name: "scheduled" };
        Panopto.Data.SessionStatus._statusIcons[Panopto.Data.SessionStatus.Live] =
            { src: iconRoot + "icon_live.png", title: Panopto.GlobalResources.SessionStatus_Live, cssClass: "live", name: "live" };
    }
    return Panopto.Data.SessionStatus._statusIcons[status];
};
Panopto.Data.registerPanoptoEnum("SessionStatus");
// UI-level status sets for navbar, etc.
Panopto.Data.StatusSets =
    {
        All: [Panopto.Data.SessionStatus.Complete, Panopto.Data.SessionStatus.Created, Panopto.Data.SessionStatus.Live, Panopto.Data.SessionStatus.Processing, Panopto.Data.SessionStatus.Recording, Panopto.Data.SessionStatus.Scheduled],
        InProgress: [Panopto.Data.SessionStatus.Recording, Panopto.Data.SessionStatus.Live],
        Processing: [Panopto.Data.SessionStatus.Processing],
        Scheduled: [Panopto.Data.SessionStatus.Scheduled]
    };
Panopto.Data.ServiceTaskColumns = function () {
    /// <summary>
    ///     enum Panopto.Data.ServiceTaskSort
    ///
    ///     NOTE: This must be kept in sync with Panopto.Data.ServiceTaskSort,
    ///     and ServiceTaskColumns_* resources.
    /// </summary>
    ///
    /// <field name="Default" type="Number" />
    /// <field name="State" type="Number" />
    /// <field name="SubState" type="Number" />
    /// <field name="Progress" type="Number" />
    /// <field name="UpdatedDate" type="Number" />
    /// <field name="SessionName" type="Number" />
    /// <field name="SessionDate" type="Number" />
    /// <field name="Site" type="Number" />
};
Panopto.Data.ServiceTaskColumns.prototype =
    {
        Default: 0,
        State: 1,
        SubState: 2,
        Progress: 3,
        UpdatedDate: 4,
        ServiceTaskType: 5,
        SessionName: 64,
        SessionDate: 65,
        Site: 66
    };
Panopto.Data.registerPanoptoEnum("ServiceTaskColumns");
Panopto.Data.UserColumns = function () {
    /// <summary>
    ///     enum Panopto.Data.UserColumns
    ///
    ///     NOTE: This must be kept in sync with Panopto.Data.DB.WebUI.UserColumns,
    ///     defined in DataLib/LinqWrappers/WebUI/UserRow.cs, and UserColumns_*
    ///     resources.
    /// </summary>
    ///
    /// <field name="Username" type="Number" />
    /// <field name="Fullname" type="Number" />
    /// <field name="Email" type="Number" />
    /// <field name="Roles" type="Number" />
    /// <field name="LastLogin" type="Number" />
    /// <field name="DateAdded" type="Number" />
    /// <field name="Site" type="Number" />
};
Panopto.Data.UserColumns.prototype =
    {
        Username: 0,
        Fullname: 1,
        Email: 2,
        Roles: 3,
        LastLogin: 4,
        DateAdded: 5,
        Site: 6
    };
Panopto.Data.registerPanoptoEnum("UserColumns");
Panopto.Data.GroupColumns = function () {
};
// Keep in sync with Panopto.Core.ServiceInterface.Rest.Objects.groupColumns
Panopto.Data.GroupColumns.prototype =
    {
        Name: 0,
        Owner: 1,
        TotalMembers: 2,
        Provider: 3,
        ExternalID: 4
    };
Panopto.Data.registerPanoptoEnum("GroupColumns");
Panopto.Data.ViewMode = function () {
    /// <summary>
    ///     enum Panopto.Data.ViewMode;
    /// </summary>
    /// <field name="List" />
    /// <field name="Details" />
    /// <field name="Grid" />
};
Panopto.Data.ViewMode.prototype =
    {
        List: 0,
        Details: 1,
        Grid: 2
    };
// Don't register extension methods, since we don't have / use resources yet.
Panopto.Data.ViewMode.registerEnum("Panopto.Data.ViewMode");
Panopto.Data.LicenseColumns = function () {
    /// <summary>
    ///     enum Panopto.Data.LicenseColumns
    ///
    ///     NOTE: This must be kept in sync with Panopto.Data.DB.WebUI.LicenseColumns,
    ///     defined in DataLib/LinqWrappers/WebUI/LicenseRow.cs, and LicenseColumns_*
    ///     resources.
    /// </summary>
    ///
    /// <field name="MachineName" type="Number" />
    /// <field name="MachineIp" type="Number" />
    /// <field name="LicenseStatus" type="Number" />
    /// <field name="LicenseType" type="Number" />
    /// <field name="LastLoginUser" type="Number" />
    /// <field name="LastLoginDate" type="Number" />
    /// <field name="LastMachineCheckin" type="Number" />
    /// <field name="Site" type="Number" />
};
Panopto.Data.LicenseColumns.prototype =
    {
        MachineName: 0,
        MachineIp: 1,
        LicenseStatus: 2,
        LicenseType: 3,
        LastLoginUser: 4,
        LastLoginDate: 5,
        LastMachineCheckin: 6,
        Site: 7
    };
Panopto.Data.registerPanoptoEnum("LicenseColumns");
Panopto.Data.MachineLicenseType = function () {
    /// <summary>
    ///     enum Panopto.Data.MachineLicenseType
    ///
    ///     NOTE: This must be kept in sync with Panopto.Data.DB.WebUI.MachineLicenseType,
    ///     defined in DataLib/Server/Services/LicenseKey.cs, and MachineLicenseType_*
    ///     resources.
    /// </summary>
    ///
    /// <field name="Client" type="Number" />
    /// <field name="Server" type="Number" />
};
Panopto.Data.MachineLicenseType.prototype =
    {
        Client: 0,
        Server: 1,
        Unison: 2,
        ActiveUser: 3
    };
Panopto.Data.registerPanoptoEnum("MachineLicenseType");
Panopto.Data.LicenseStatus = function () {
    /// <summary>
    ///     enum Panopto.Data.LicenseStatus
    ///
    ///     NOTE: This must be kept in sync with Panopto.Data.DB.WebUI.LicenseStatus,
    ///     defined in DataLib/Server/Services/LicenseKey.cs, and LicenseStatus_*
    ///     resources.
    /// </summary>
    ///
    /// <field name="Unlicensed" type="Number" />
    /// <field name="Licensed" type="Number" />
    /// <field name="Deactivated" type="Number" />
};
Panopto.Data.LicenseStatus.prototype =
    {
        Unlicensed: 0,
        Licensed: 1,
        Deactivated: 2,
        Reaped: 3
    };
Panopto.Data.registerPanoptoEnum("LicenseStatus");
Panopto.Data.FolderSet = function () {
    /// <summary>
    ///     enum Panopto.Data.FolderSet
    ///
    ///     NOTE: This must be kept in sync with Panopto.Data.DB.WebUI.FolderSet, defined in
    ///     DataLib/LinqWrappers/WebUI/NavBarData.cs.
    ///
    ///     NOTE: This differs from Panopto.Core.FolderSet, defined in WebCore/js/Enums.js.
    /// </summary>
    ///
    /// <field name="ExplicitCreatorFolders" type="Number" />
    /// <field name="AllSessionCreationFolders" type="Number" />
    /// <field name="AllFolders" type="Number" />
    /// <field name="AllFolderCreationFolders" type="Number" />
};
Panopto.Data.FolderSet.prototype =
    {
        ExplicitCreatorFolders: 1,
        AllSessionCreationFolders: 2,
        AllFolders: 3,
        AllFolderCreationFolders: 4
    };
// Don't register extension methods, since we don't have / use resources yet.
// "true" => register as "Flags" enum.
Panopto.Data.FolderSet.registerEnum("Panopto.Data.FolderSet", true);
Panopto.Data.GroupType = function () {
    /// <summary>
    ///     enum Panopto.Data.GroupType
    ///
    ///     NOTE: This must be kept in sync with Panopto.Data.GroupType,
    ///     defined in SharedLib/Constants.cs, and GroupType_* resources.
    /// </summary>
    ///
    /// <field name="ActiveDirectory" type="Number" />
    /// <field name="SsoGroup" type="Number" />
    /// <field name="Internal" type="Number" />
    /// <field name="FederatedGroup" type="Number" />
    /// <field name="AllUsersGroup" type="Number" />
};
Panopto.Data.GroupType.prototype =
    {
        ActiveDirectory: 1,
        SsoGroup: 2,
        Internal: 3,
        FederatedGroup: 4,
        AllUsersGroup: 5
    };
Panopto.Data.registerPanoptoEnum("GroupType");
Panopto.Data.TranscriptionRequestColumns = function () {
    /// <summary>
    ///     enum Panopto.Data.TranscriptionRequestColumns
    ///
    ///     NOTE: This must be kept in sync with Panopto.Data.DB.WebUI.TranscriptionRequestColumns, defined in
    ///     DataLib/LinqWrappers/WebUI/TranscriptionRequestRow.cs
    /// </summary>
    ///
    /// <field name="Session" type="Number" />
    /// <field name="Duration" type="Number" />
    /// <field name="Price" type="Number" />
    /// <field name="TotalCost" type="Number" />
    /// <field name="Provider" type="Number" />
    /// <field name="Status" type="Number" />
    /// <field name="Date" type="Number" />
    /// <field name="Site" type="Number" />
    /// <field name="InstanceName" type="String" />
};
Panopto.Data.TranscriptionRequestColumns.prototype =
    {
        Session: 0,
        Duration: 1,
        Price: 2,
        TotalCost: 3,
        Provider: 4,
        Status: 5,
        Date: 6,
        Site: 7,
        InstanceName: 8
    };
Panopto.Data.registerPanoptoEnum("TranscriptionRequestColumns");
Panopto.Data.TranscriptionStatus = function () {
    /// <summary>
    ///     enum Panopto.Data.TranscriptionStatus
    ///
    ///     NOTE: This must be kept in sync with Panopto.Data.TranscriptionStatus,
    ///     defined in SharedLib/Constants.cs.
    /// </summary>
    ///
    /// <field name="Unprocessed" type="Number" />
    /// <field name="TranscriptRequested" type="Number" />
    /// <field name="TranscriptReady" type="Number" />
    /// <field name="TranscriptReceived" type="Number" />
    /// <field name="TranscriptImported" type="Number" />
    /// <field name="Error" type="Number" />
};
Panopto.Data.TranscriptionStatus.prototype =
    {
        Unprocessed: 0,
        TranscriptRequested: 1,
        TranscriptReady: 2,
        TranscriptReceived: 3,
        TranscriptImported: 4,
        Error: 5
    };
Panopto.Data.registerPanoptoEnum("TranscriptionStatus");
Panopto.Data.EmbeddedView = function () {
    /// <summary>
    ///     enum Panopto.Data.EmbeddedView
    ///
    ///     NOTE: This must be kept in sync with Panopto.Data.EmbeddedView, defined in Constants.cs in SharedLib.
    /// </summary>
    ///
    /// <field name="None" type="Number">
    ///     Regular non-embedded mode (all page chrome shown)</field>
    ///
    /// <field name="Full" type="Number">
    ///     Hide the nav bar and header logo. Replace the right side header controls with "Powered by Panopto"</field>
    ///
    /// <field name="Mini" type="Number">
    ///     Same as Full, except the Create drop-down, content header, and various folder icons are also hidden</field>
    ///
    /// <field name="Nav" type="Number">
    ///     Same as Full, except Home / Everything navigation buttons are shown and the header is made transparent</field>
};
Panopto.Data.EmbeddedView.prototype =
    {
        None: 0,
        Full: 1,
        Mini: 2,
        Nav: 3
    };
Panopto.Data.registerPanoptoEnum("EmbeddedView");
Panopto.Data.OauthClientColumns = function () {
    /// <summary>
    ///     enum Panopto.Data.OauthClientColumns
    /// </summary>
    ///
    /// <field name="Name" type="string" />
    /// <field name="ApiKey" type="String" />
    /// <field name="Enabled" type="String" />
    /// <field name="User" type="String" />
};
Panopto.Data.OauthClientColumns.prototype =
    {
        Name: 0,
        ApiKey: 1,
        Enabled: 2,
        User: 3
    };
Panopto.Data.registerPanoptoEnum("OauthClientColumns");

//# sourceMappingURL=Data.js.map
