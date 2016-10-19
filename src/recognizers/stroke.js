/*globals DollarRecognizer:false */


/**
 * Stroke
 * Recognized when the pointer recognizes a specific stroke
 * @constructor
 * @extends AttrRecognizer
 */
function StrokeRecognizer(options) {
    AttrRecognizer.apply(this, arguments);

    this.pX = null;
    this.pY = null;

    this.dollarRecognizer = new DollarRecognizer();
    this.points = [];

    this.state = STATE_BEGAN;

    if (options && options.customStrokes) {
        this.customStrokes = options.customStrokes;

        // add custom strokes to dollar recognizer
        for (var property in this.customStrokes) {
            if (this.customStrokes.hasOwnProperty(property)) {
                this.dollarRecognizer.AddGesture(property, this.customStrokes[property].points);
            }
        }
    }
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
        shapeName: null, // which shape(s) should the recognizer recognize
        recognizeThreshold: 0.8, //above this threshold a stroke is considered recognized
        inFlight: false, //should you try to recognize as the user draws
        minDrawnLength: 0, // the minimal drawn length for recognition
        recognizeInterval: 5 //the interval on samples to run recognition on
    },

    attrTest: function(input) {
        return this._super.attrTest.call(this, input);
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

        var drawnLength = 0;
        for (var x=0; x<this.points.length-1;x++){
            var p1 = this.points[x];
            var p2 = this.points[x+1];
            drawnLength += Math.sqrt( (p1.X-p2.X)*(p1.X-p2.X) + (p1.Y-p2.Y)*(p1.Y-p2.Y) );
        }


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

            this.firstStrokeDirectionOk = null;

            return STATE_BEGAN;
        }

        if (input.eventType == INPUT_END) {
            if (this.isFirstStrokeDirectionOk(input)){
                dollarResult = runDollar();
                input.result = dollarResult.result;
                input.isRecognized = dollarResult.isRecognized;
                return dollarResult.isRecognized ? STATE_RECOGNIZED : STATE_ENDED;
            }
            else{
                return STATE_ENDED;
            }
        }
        else{

            this.points.push({
                X: input.center.x,
                Y:input.center.y
            });

            //try to recognize in-flight
            if (this.options.inFlight &&
                this.options.recognizeInterval > 0 &&
                this.points.length % this.options.recognizeInterval === 0 &&
                drawnLength >= this.options.minDrawnLength
            ){

                dollarResult = runDollar();
                if (dollarResult.isRecognized) {
                    input.result = dollarResult.result;
                    input.isRecognized = true;
                    return STATE_RECOGNIZED;
                }
            }


        }


        function runDollar(){
            if (that.options.shapeName) {
                var result = that.dollarRecognizer.Recognize(that.points, false);
                var isRecognized = (result.Name == that.options.shapeName &&
                    result.Score >= that.options.recognizeThreshold);

                return {
                    result: result,
                    isRecognized: isRecognized
                };
            }
            else {
                console.error('Hammer Stroke Recognizer: no shape name specified');
                return {
                    result: null,
                    isRecognized: false
                };
            }

        }

        return STATE_CHANGED;

    },

    isFirstStrokeDirectionOk: function (input) {
        //failed in the past
        if (this.firstStrokeDirectionOk === false){
            return false;
        }
        else if (this.options.firstStrokeDirection &&
            this.firstStrokeDirectionOk == null &&
            input.direction != DIRECTION_NONE){

            this.firstStrokeDirectionOk = Array.isArray(this.options.firstStrokeDirection) && this.options.firstStrokeDirection.indexOf(input.direction) > -1;
            // console.log('2',this.options.firstStrokeDirection,input.direction,this.options.firstStrokeDirection.indexOf(input.direction) > -1);

            return this.firstStrokeDirectionOk;
        }
        else{
            //either no limit on firstStrokeDirection, or it was correct
            return true;
        }

    // console.log(this.options.direction, input.direction);
    }
});