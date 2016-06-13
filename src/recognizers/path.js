/**
 * Path
 * Recognized when the pointer is down and moves following a path.
 * @constructor
 * @extends AttrRecognizer
 */
function PathRecognizer(inputOptions) {
    AttrRecognizer.apply(this, arguments);

    var defaultOptions = {
        resolution: 10, //path will be quantizied to this amount of segments
        maxDistanceFromSegment: 10
    };

    Object.assign(this.options, defaultOptions, inputOptions);

    this.pathTotalLength = this.options.pathElement.getTotalLength();
    this.segmentLength = (this.pathTotalLength / this.options.resolution);
    this.currentSegmentIndex = 0; //which segment should we match against next
    this.pX = null;
    this.pY = null;

}

inherit(PathRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof PathRecognizer
     */
    defaults: {
        event: 'path',
        threshold: 10,
        pointers: 1,
        direction: DIRECTION_ALL
    },

    // getTouchAction: function() {
    //     var direction = this.options.direction;
    //     var actions = [];
    //     if (direction & DIRECTION_HORIZONTAL) {
    //         actions.push(TOUCH_ACTION_PAN_Y);
    //     }
    //     if (direction & DIRECTION_VERTICAL) {
    //         actions.push(TOUCH_ACTION_PAN_X);
    //     }
    //     return actions;
    // },

    // attrTest: function(input) {
    //     return AttrRecognizer.prototype.attrTest.call(this, input) &&
    //         (this.state & STATE_BEGAN || (!(this.state & STATE_BEGAN) && this.directionTest(input)));
    // },

    /**
     * Process the input and return the state for the recognizer
     * @memberof AttrRecognizer
     * @param {Object} input
     * @returns {*} State
     */
    process: function(input) {
        var svgCoords = getSvgLocalPoint(this.options.svgElement, input.center.x, input.center.y);

        input.localX = svgCoords.x;
        input.localY = svgCoords.y;

        // var distToSegmentPoint = distance(svgCoords, this.segmentPoints[this.currentSegmentIndex]);
        var closestPoint = findClosestPoint(this.options.pathElement, svgCoords);
        this.pathPercent = input.pathPercent = closestPoint.pathPercent;
        this.pathLength = input.pathLength = closestPoint.pathLength;


         console.log(this.currentSegmentIndex, this.pathPercent);

        if (closestPoint.distance > this.options.maxDistanceFromSegment) {
            console.log("failed");
            return STATE_FAILED;

        } else if (this.currentSegmentIndex == this.options.resolution && (100 - this.pathPercent) < 0.5) {
            console.log("success");
            return STATE_RECOGNIZED;
        }
        else if (this.pathPercent/100 > (this.currentSegmentIndex) * this.segmentLength / this.pathTotalLength &&
            this.pathPercent/100 < (this.currentSegmentIndex + 1) * this.segmentLength / this.pathTotalLength) {
            this.currentSegmentIndex++;
        }

        // var state = this.state;
        // var eventType = input.eventType;
        //
        // var isRecognized = state & (STATE_BEGAN | STATE_CHANGED);
        // var isValid = this.attrTest(input);
        //
        // // on cancel input and we've recognized before, return STATE_CANCELLED
        // if (isRecognized && (eventType & INPUT_CANCEL || !isValid)) {
        //     return state | STATE_CANCELLED;
        // } else if (isRecognized || isValid) {
        //     if (eventType & INPUT_END) {
        //         return state | STATE_ENDED;
        //     } else if (!(state & STATE_BEGAN)) {
        //         return STATE_BEGAN;
        //     }
        //     return state | STATE_CHANGED;
        // }
        // return STATE_FAILED;

        return STATE_CHANGED;
    },

    emit: function(input) {

        this.pX = input.deltaX;
        this.pY = input.deltaY;

        this._super.emit.call(this, input);
    }
});

// var distance = function(p1, p2) {
//     return Math.sqrt((p2.x -= p1.x) * p2.x + (p2.y -= p1.y) * p2.y);
// };

//adapted from https://bl.ocks.org/mbostock/8027637
function findClosestPoint(pathNode, point) {
    var pathLength = pathNode.getTotalLength(),
        precision = 8,
        best,
        bestLength,
        bestDistance = Infinity;

    // linear scan for coarse approximation
    for (var scan, scanLength = 0, scanDistance; scanLength <= pathLength; scanLength += precision) {
        if ((scanDistance = distance2(scan = pathNode.getPointAtLength(scanLength))) < bestDistance) {
            best = scan, bestLength = scanLength, bestDistance = scanDistance;
        }
    }

    // binary search for precise estimate
    precision /= 2;
    while (precision > 0.5) {
        var before,
            after,
            beforeLength,
            afterLength,
            beforeDistance,
            afterDistance;
        if ((beforeLength = bestLength - precision) >= 0 &&
            (beforeDistance = distance2(before = pathNode.getPointAtLength(beforeLength))) < bestDistance) {
            best = before, bestLength = beforeLength, bestDistance = beforeDistance;
        } else if ((afterLength = bestLength + precision) <= pathLength &&
            (afterDistance = distance2(after = pathNode.getPointAtLength(afterLength))) < bestDistance) {
            best = after, bestLength = afterLength, bestDistance = afterDistance;
        } else {
            precision /= 2;
        }
    }

    best = {
        x: best.x,
        y: best.y,
        distance: Math.sqrt(bestDistance),
        pathLength: bestLength,
        pathPercent: (bestLength / pathLength * 100 * 100) / 100
    };

    return best;

    function distance2(p) {
        var dx = p.x - point.x,
            dy = p.y - point.y;
        return dx * dx + dy * dy;
    }
}

// Get point in global SVG space
var getSvgLocalPoint = (function() {
        var pt = null;

        return function(svg, x, y) {

            if (pt == null) {
                pt = svg.createSVGPoint();
            }

            pt.x = x;
            pt.y = y;
            return pt.matrixTransform(svg.getScreenCTM().inverse());

        };

    })();
