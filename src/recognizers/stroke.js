/*globals DollarRecognizer:false */


/**
 * Stroke
 * Recognized when the pointer recognizes a specific stroke
 * @constructor
 * @extends AttrRecognizer
 */
function StrokeRecognizer() {
    AttrRecognizer.apply(this, arguments);

    this.pX = null;
    this.pY = null;

    this.dollarRecognizer = new DollarRecognizer();
    this.points = [];

    this.state = STATE_BEGAN;

}

inherit(StrokeRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof StrokeRecognizer
     */
    defaults: {
        event: 'stroke',
        threshold: 5,
        pointers: 1,
        recognizeShapeName: 'z',
        recognizeThreshold: 0.8, //above this threshold a stroke is considered recognized
        recognizeInterval: 5 //the interval on samples to run recognition on
    },

    attrTest: function(input) {
        return AttrRecognizer.prototype.attrTest.call(this, input);
    },

    emit: function(input) {
        this.pX = input.deltaX;
        this.pY = input.deltaY;

        this._super.emit.call(this, input);
    },

    /**
     * Process the input and return the state for the recognizer
     * @memberof AttrRecognizer
     * @param {Object} input
     * @returns {*} State
     */
    process: function(input) {
        var that = this;
        var dollarResult;

        if (!this.attrTest(input)) {
            this.pointArray = [];
            return STATE_FAILED;
        }

        if (input.distance === 0) {
            this.points = []; // clear
            this.points.push({
                X: input.center.x,
                Y:input.center.y
            });


            return STATE_BEGAN;
        }
        else if (input.eventType == INPUT_END) {
            dollarResult = runDollar();
            input.result = dollarResult.result;
            input.isRecognized = dollarResult.isRecognized;
            return dollarResult.isRecognized ? STATE_RECOGNIZED : STATE_ENDED;
        }
        else{

            this.points.push({
                X: input.center.x,
                Y:input.center.y
            });

            //try to recognize in-flight
            if (this.options.recognizeInterval > 0 &&
                this.points.length % this.options.recognizeInterval === 0){

                dollarResult = runDollar();
                if (dollarResult.isRecognized) {
                    input.result = dollarResult.result;
                    input.isRecognized = true;
                    return STATE_RECOGNIZED;
                }
            }


        }


        function runDollar(){
            var result = that.dollarRecognizer.Recognize(that.points, false);
            var isRecognized = (result.Name == that.options.recognizeShapeName &&
                result.Score >= that.options.recognizeThreshold);

            return {
                result: result,
                isRecognized: isRecognized
            };

        }

        return STATE_CHANGED;

    }
});