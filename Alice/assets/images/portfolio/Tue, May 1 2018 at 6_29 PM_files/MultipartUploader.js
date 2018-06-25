// This module is a wrapper for the MultipartUploader component. setComponent() must be called
// to initialize the context for all MultipartUploader methods.
// Namespace dependencies
var Panopto = Panopto || {};
Panopto.BatchUpload = Panopto.BatchUpload || {};
// BUGBUG: 20639 this probably should be exposed as a service to keep it in one place
Panopto.BatchUpload.fileExtensions = [
    //
    // AUDIO/VIDEO
    //
    // valid avi audio/video container file extensions:
    ".avi",
    // valid asf audio/video container file extensions:
    ".asf",
    ".wmv",
    // valid MPEG 1/2 PS audio/video container file extensions:
    ".mpg",
    ".mpeg",
    ".ps",
    ".mps",
    ".m2ps",
    ".mp1",
    ".mp2",
    ".m2v",
    // valid MPEG 2 TS audio/video container file extensions:
    ".ts",
    ".tsv",
    ".mts",
    ".m2ts",
    ".mod",
    ".tod",
    // valid MP4 audio/video container file extensions:
    // Note the only (other than mp4 and qt) iso base format we support currently is .3gp
    // we can add .3G2, .mj2, .dvb, .dcf, .m21 in the future if we have the need.
    ".mp4",
    ".m4v",
    ".3gp",
    // valid quicktime file format extensions:
    ".mov",
    ".qt",
    // valid flash audio/video container file extensions:
    ".flv",
    ".f4v",
    // valid ogg vorbis audio/video container file extensions:
    ".ogg",
    ".ogv",
    ".oga",
    ".ogx",
    ".ogm",
    ".opus",
    //
    // AUDIO-ONLY
    //
    // valid MP3 audio container file extensions:
    ".mp3",
    // valid asf audio container file extensions:
    ".wma",
    // valid MPEG-2 PS audio container file extensions:
    ".m2a",
    // valid MPEG-2 TS audio container file extensions:
    ".tsa",
    // valid MP4 audio container file extensions:
    ".m4a",
    // valid flash audio container file extensions:
    ".f4a",
    // valid WAV audio file container extensions:
    ".wav"
];
// the main controller for using html5 and js to upload files by interfacing with existing implemetation agnostic UI
Panopto.BatchUpload.MultipartUploader = (function (MultipartUploader) {
    // enum-like object to represent upload status of a file
    var UploadStatus = {
        NotStarted: 0,
        Uploading: 1,
        Complete: 2,
        Failed: 3,
        Invalid: 4
    };
    var component;
    var receivedFiles = {};
    var fileIds = 0;
    // to be able to set the drop target text later, hold onto it when it gets set
    var $dropTarget;
    // Construct an object that mirrors the wire type of the SL uploader's FileModel for use by FileList.js
    function FileModel(fileId) {
        var multiFile = receivedFiles[fileId];
        var file = multiFile.file;
        var remainingSeconds = Panopto.Core.ServiceInterface.MultipartUploadManager.predictRemainingSeconds(fileId);
        return {
            BytesUploaded: multiFile.bytesUploaded,
            Extension: multiFile.ext,
            Id: fileId,
            IsInvalid: multiFile.status === UploadStatus.Invalid,
            Name: multiFile.name,
            PercentUploaded: multiFile.bytesUploaded / file.size * 100,
            RemainingTime: remainingSeconds >= 0
                ? moment().startOf('day').seconds(remainingSeconds).format('HH:mm:ss')
                : '',
            SessionCreated: !!multiFile.sessionId,
            SessionId: multiFile.sessionId || Panopto.Core.Constants.EmptyGuid,
            Size: file.size,
            UploadInProgress: multiFile.status === UploadStatus.Uploading,
            UploadNearCompletion: multiFile.status === UploadStatus.Uploading
                && multiFile.bytesUploaded === file.size,
            UploadCompleted: multiFile.status === UploadStatus.Complete
        };
    }
    // parse an HTML5 file list into the uploader's model and return a list of objects in the FileList's model as well
    var parseFileList = function (fileList) {
        var fileArray = [];
        _.each(fileList, function (file, index) {
            var multiFile, fileObj;
            multiFile = {
                file: file,
                id: fileIds++,
                name: Panopto.Core.StringHelpers.parseFilename(file.name),
                ext: Panopto.Core.StringHelpers.parseExtension(file.name),
                bytesUploaded: 0,
                status: UploadStatus.NotStarted
            };
            // Set status to Invalid for files with unsupported extensions
            if (!_.contains(Panopto.BatchUpload.fileExtensions, '.' + multiFile.ext)) {
                multiFile.status = UploadStatus.Invalid;
            }
            // register the file (makes it available by id to FileModel below)
            MultipartUploader.registerFile(multiFile.id, multiFile);
            // pass in the initial state for any file upload
            fileObj = new FileModel(multiFile.id);
            fileObj.Index = index + 1;
            fileArray[index] = fileObj;
        });
        // Update file counts, navigation message, etc.
        updateFileListProgress();
        return fileArray;
    };
    // Update file list buttons, messages, etc. based on the status of the files in the uploader
    var updateFileListProgress = function () {
        // Get a hash of file status -> # of files with that status
        var statusCounts = _.countBy(receivedFiles, function (file) {
            return file.status;
        });
        // Update the file list UI
        Panopto.BatchUpload.FileList.updateProgress({
            Total: _.keys(receivedFiles).length,
            Invalid: statusCounts[UploadStatus.Invalid] || 0,
            NotStarted: statusCounts[UploadStatus.NotStarted] || 0,
            Uploading: statusCounts[UploadStatus.Uploading] || 0,
            Complete: statusCounts[UploadStatus.Complete] || 0,
            Failed: statusCounts[UploadStatus.Failed] || 0
        });
    };
    MultipartUploader.setupDragDrop = function (jqDropTarget) {
        // save reference to dropTarget for updating text
        $dropTarget = jqDropTarget;
        Panopto.Core.ServiceInterface.SessionUploadManagement.setHost(window.location.origin);
        // stop default events for all behaviour we want to control
        // this will stop event propogation (good in drag/drop case to stop browser from handling event)
        var own = function (jqEvent) {
            jqEvent.stopPropagation();
            jqEvent.preventDefault();
        };
        // need also to apply drag class for drag events since hover style is not applied on drag events
        var ownAndToggleDrag = function (jqEvent) {
            own(jqEvent);
            $dropTarget.toggleClass("drop-target-drag");
        };
        // also need to own dragover event (in addition to dragenter) in order to control drop event
        // don't toggle drag class on dragover though since it fires repeatedly while in an active dragging state
        _.each(['mouseover', 'mouseleave', 'dragover'], function (eventName) {
            $dropTarget.on(eventName, own);
        });
        _.each(['dragenter', 'dragleave'], function (eventName) {
            $dropTarget.on(eventName, ownAndToggleDrag);
        });
        // somewhat resilient to browser differences on fileSelection events
        var handleFileSelection = function (jqEvent) {
            var domEvent = jqEvent.originalEvent, domFiles = domEvent.target.files || domEvent.dataTransfer.files, fileModels;
            if (domFiles.length > 0) {
                if (!Panopto.features.enableMultipleUploads && domFiles.length > 1) {
                    Panopto.BatchUpload.FileList.reportUploadError("MultiUploadDisabled", 2);
                }
                else {
                    fileModels = parseFileList(domFiles);
                    Panopto.BatchUpload.FileList.addFiles(fileModels);
                }
            }
            // Clear out file picker so subsequent selection will fire 'change' event even if same file is selected
            $filepicker.val(null);
        };
        // handle drop event
        $dropTarget.on('drop', function (jqEvent) {
            // need to toggle drag class here too (since drop is the alternative to dragleave after dragenter)
            ownAndToggleDrag(jqEvent);
            handleFileSelection(jqEvent);
        });
        // Enable multi-select in the file picker unless we're embedded in a view that can only single-select sessions.
        // canPassMultiple is unset in non-embedded view, default to true in that case.
        // Also force single-select for Mobile Safari 7 and lower, to work around a bug in the browser (see TFS 27162).
        var multiSelectEnabled = Panopto.BatchUpload.Data.currentFolder.canPassMultiple !== false
            && !($.browser.safari
                && $.browser.mobile
                && $.browser.versionNumber < 8)
            && Panopto.features.enableMultipleUploads;
        // create filepicker -- add to DOM for IE compatibility, but hide since we have our own click target
        var $filepicker = $("<input />", {
            type: 'file',
            multiple: multiSelectEnabled,
            accept: Panopto.BatchUpload.fileExtensions.join(',')
        })
            .on('change', handleFileSelection)
            .hide()
            .insertAfter($dropTarget);
        // Make file picker keyboard-accessible
        Panopto.Core.UI.Handlers.button($dropTarget, function () {
            $filepicker.click();
        }, 
        // Firefox won't programmatically open the file picker from a "keydown" event, only "keypress"
        { keyEvent: 'keypress' });
    };
    MultipartUploader.registerFile = function (id, multiFile) {
        receivedFiles[id] = multiFile;
        // Update file counts, navigation message, etc.
        updateFileListProgress();
    };
    MultipartUploader.removeFile = function (fileId) {
        delete receivedFiles[fileId];
        // Update file count, navigation message, etc.
        updateFileListProgress();
    };
    // major work to process files is kicked off here
    // uses local functions to open/close SessionUploadManagement uploads, yields to UploadManager to handle file tranfers
    // fileUploadAttempted is the job completion callback when called within a job
    // returns a Panopto.Core.CancellableRequest to enable async requests to be cancelled
    MultipartUploader.startUpload = function (fileId, sessionId, fileUploadAttempted) {
        var multiFile = receivedFiles[fileId];
        var openRequest = new Panopto.Core.CancellableRequest();
        var closeRequest = new Panopto.Core.CancellableRequest();
        multiFile.sessionId = sessionId;
        // Use NOOP params in case we're being called outside the file queue.
        fileUploadAttempted = fileUploadAttempted || function () { };
        // Helper to update file and job status and relevant UIs
        var reportUploadStatus = function (status, message) {
            multiFile.status = status;
            // Update file progress
            Panopto.BatchUpload.FileList.updateFile(new FileModel(fileId));
            // Update file counts, messages, stop button on complete, etc.
            updateFileListProgress();
            if (status === UploadStatus.Complete) {
                // Report job success
                fileUploadAttempted(true);
            }
            if (status === UploadStatus.Failed) {
                // Display an error with retry link
                Panopto.BatchUpload.FileList.handleImportError(fileId, sessionId, message);
                // Report job failure
                fileUploadAttempted(false);
            }
        };
        // Only attempt to upload valid files
        if (multiFile.status !== UploadStatus.Invalid) {
            // Indicate newly-uploading file
            reportUploadStatus(UploadStatus.Uploading);
            // Open stream upload
            openRequest = Panopto.Core.ServiceInterface.SessionUploadManagement.openUpload({
                sessionId: sessionId,
                filename: multiFile.file.name,
                startTime: new Date()
            }, function onSuccess(upload) {
                multiFile.uploadId = upload.ID;
                // Queue multipart upload
                Panopto.Core.ServiceInterface.MultipartUploadManager.queueUpload({
                    file: multiFile.file,
                    fileId: fileId,
                    uploadUri: upload.UploadTarget
                }, function onProgress(bytesUploaded) {
                    multiFile.bytesUploaded = bytesUploaded;
                    Panopto.BatchUpload.FileList.updateFile(new FileModel(fileId));
                }, function onUploaded() {
                    // Close stream upload
                    closeRequest = Panopto.Core.ServiceInterface.SessionUploadManagement.closeUpload(upload, function onSuccess() {
                        reportUploadStatus(UploadStatus.Complete);
                    }, function onError() {
                        reportUploadStatus(UploadStatus.Failed, "Failed to close upload.");
                    });
                }, function onFailure() {
                    reportUploadStatus(UploadStatus.Failed, "Failed to upload file.");
                });
                // Kick off chunk uploader jobs
                Panopto.Core.ServiceInterface.MultipartUploadManager.upload();
            }, function onError() {
                reportUploadStatus(UploadStatus.Failed, "Failed to open upload.");
            });
        }
        return new Panopto.Core.CancellableRequest(function cancel() {
            openRequest.cancel();
            closeRequest.cancel();
        });
    };
    MultipartUploader.stopUpload = function (fileId) {
        var multiFile = receivedFiles[fileId];
        multiFile.status = UploadStatus.NotStarted;
        multiFile.bytesUploaded = 0;
        // Update header message
        updateFileListProgress();
        Panopto.Core.ServiceInterface.MultipartUploadManager.cancelUpload(fileId);
    };
    MultipartUploader.pauseUpload = function (fileId) {
        // unsupported
    };
    MultipartUploader.resumeUpload = function (fileId) {
        // unsupported
    };
    MultipartUploader.uploadStarted = function (fileId) {
        return (receivedFiles[fileId]
            ? receivedFiles[fileId].status !== UploadStatus.NotStarted
            : false);
    };
    MultipartUploader.uploadCompleted = function (fileId) {
        return (receivedFiles[fileId]
            ? receivedFiles[fileId].status === UploadStatus.Complete
            : false);
    };
    MultipartUploader.isInvalid = function (fileId) {
        return (receivedFiles[fileId]
            ? receivedFiles[fileId].status === UploadStatus.Invalid
            : true);
    };
    MultipartUploader.getSessionId = function (fileId) {
        return (receivedFiles[fileId] && receivedFiles[fileId].sessionId)
            ? receivedFiles[fileId].sessionId
            : Panopto.Core.Constants.EmptyGuid;
    };
    MultipartUploader.resetSessionId = function (fileId) {
        var multiFile = receivedFiles[fileId];
        if (multiFile) {
            multiFile.sessionId = null;
            // Update UI to indicate pre-upload state
            Panopto.BatchUpload.FileList.updateFile(new FileModel(fileId));
        }
    };
    MultipartUploader.setTargetText = function (text) {
        $dropTarget.text(text);
    };
    // this does more in the silverlight counterpart to this file
    MultipartUploader.setComponent = function (componentIn, simulate) {
        component = componentIn;
        component.Simulate = simulate;
    };
    return MultipartUploader;
})(Panopto.BatchUpload.MultipartUploader || {});

//# sourceMappingURL=MultipartUploader.js.map
