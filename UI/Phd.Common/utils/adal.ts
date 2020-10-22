export function modifyAdal()
{
    //hack - definitely want to check this any time we update adal libs
    (<any>window).adalContext._loadFrame = function (urlNavigate, frameName) {
        // This trick overcomes iframe navigation in IE
        // IE does not load the page consistently in iframe
        var self = this;
        self.info('LoadFrame: ' + frameName);
        var frameCheck = frameName;
        setTimeout(function () {
            var frameHandle = self._addAdalFrame(frameCheck);

            if (frameHandle.src === '' || frameHandle.src === 'about:blank') {
                frameHandle.src = urlNavigate;

				//this causes a redirect loop if it can't retrieve src, possibly due to different security zones:
                //self._loadFrame(urlNavigate, frameCheck);
            }

        }, 500);
    };
}